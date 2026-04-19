import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";
import { securityHeaders, jsonHeaders, corsResponse, errorResponse } from "../_shared/security-headers.ts";
import { toStatementDescriptorSuffix } from "../_shared/transliterate.ts";
import { z, parseBody, flexId, safeString, optionalString, email, positiveInt, ValidationError, validationErrorResponse } from "../_shared/validation.ts";
import { fetchPricingProfile, calculatePricing, type EventType } from "../_shared/pricing-utils.ts";

const TicketItemSchema = z.object({
  tierId: flexId,
  quantity: positiveInt.max(50),
});

const CheckoutBodySchema = z.object({
  eventId: flexId,
  items: z.array(TicketItemSchema).min(1).max(20),
  customerName: safeString(200),
  customerEmail: email,
  customerPhone: optionalString(20),
  specialRequests: optionalString(1000),
  seatingTypeId: flexId.optional(),
  reservationName: safeString(200).optional(),
  guests: z.array(z.object({ name: safeString(200) }).passthrough()).optional(),
  seatIds: z.array(flexId).optional(),
  showInstanceId: flexId.optional(),
  promoterSessionId: optionalString(100),
  promoterTrackingCode: optionalString(100),
});

interface TicketItem {
  tierId: string;
  quantity: number;
}

interface GuestData {
  name: string;
  age: number;
}

interface CheckoutRequest {
  eventId: string;
  items: TicketItem[];
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  specialRequests?: string | null;
  seatingTypeId?: string | null;
  reservationName?: string | null;
  guests?: GuestData[];
  seatIds?: string[];
  showInstanceId?: string;
}

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-TICKET-CHECKOUT] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    logStep("Function started");

    // Rate limiting: max 15 checkout attempts per user per 5 minutes
    const clientIP = getClientIP(req);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("No authorization header", 401);

    const rateLimitId = authHeader.replace("Bearer ", "").substring(0, 20) + ":" + clientIP;
    const rateCheck = await checkRateLimit(rateLimitId, "ticket_checkout", 15, 5);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...jsonHeaders(), "Retry-After": String(rateCheck.retryAfterSeconds) },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { eventId, items, customerName, customerEmail, customerPhone, specialRequests, seatingTypeId, reservationName, guests, seatIds, showInstanceId, promoterSessionId, promoterTrackingCode } = await parseBody(req, CheckoutBodySchema);
    logStep("Request data", { eventId, items, customerName, reservationName, customerEmail, guestsCount: guests?.length, seatingTypeId, seatIds: seatIds?.length, showInstanceId });

    // Fetch event and business info (including Stripe Connect status)
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("*, businesses(*, stripe_account_id, stripe_onboarding_completed, stripe_payouts_enabled)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }
    
    const business = event.businesses;
    logStep("Event fetched", { 
      eventTitle: event.title, 
      businessId: event.business_id,
      hasStripeConnect: !!business?.stripe_account_id,
      payoutsEnabled: business?.stripe_payouts_enabled
    });

    // If seatIds provided, look up seat details for embedding in tickets later
    let seatDetailsMap: Map<string, { zone: string; row: string; number: number }> = new Map();
    if (seatIds && seatIds.length > 0) {
      const { data: seatRows } = await supabaseClient
        .from("venue_seats")
        .select("id, row_label, seat_number, venue_zones(name)")
        .in("id", seatIds);
      
      if (seatRows) {
        for (const s of seatRows) {
          seatDetailsMap.set(s.id, {
            zone: (s.venue_zones as any)?.name || '',
            row: s.row_label,
            number: s.seat_number,
          });
        }
      }
      logStep("Seat details loaded", { count: seatDetailsMap.size });
    }

    // Fetch per-business pricing profile
    const pricingProfile = await fetchPricingProfile(event.business_id);
    
    // Determine event type for pricing
    const eventType: EventType = event.event_type === 'ticket_and_reservation' ? 'hybrid' : 'ticket';
    logStep("Pricing profile loaded", { 
      stripeFeeBearer: pricingProfile.stripe_fee_bearer,
      revenueEnabled: pricingProfile.platform_revenue_enabled,
      revenueModel: pricingProfile.revenue_model,
      eventType,
    });

    // Fetch ticket tiers and validate availability
    const tierIds = items.map(item => item.tierId);
    const { data: tiers, error: tiersError } = await supabaseClient
      .from("ticket_tiers")
      .select("*")
      .in("id", tierIds)
      .eq("event_id", eventId)
      .eq("active", true);

    if (tiersError || !tiers || tiers.length === 0) {
      throw new Error("Ticket tiers not found");
    }
    logStep("Tiers fetched", { count: tiers.length });

    // Validate availability and build line items
    let subtotalCents = 0;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const ticketBreakdown: { tierId: string; tierName: string; quantity: number; priceEach: number }[] = [];
    let ticketCurrency = "eur";
    let totalTicketCount = 0;

    for (const item of items) {
      const tier = tiers.find(t => t.id === item.tierId);
      if (!tier) {
        throw new Error(`Tier ${item.tierId} not found`);
      }

      // Use atomic function to check AND reserve tickets in one step
      const { data: reserveResult, error: reserveError } = await supabaseClient
        .rpc("reserve_tickets_atomically", {
          p_tier_id: item.tierId,
          p_quantity: item.quantity,
        });

      if (reserveError) {
        throw new Error(`Failed to reserve tickets for ${tier.name}: ${reserveError.message}`);
      }

      if (!reserveResult?.success) {
        throw new Error(reserveResult?.message || `Not enough tickets available for ${tier.name}`);
      }

      if (item.quantity > tier.max_per_order) {
        throw new Error(`Maximum ${tier.max_per_order} tickets per order for ${tier.name}`);
      }

      // Check sale window
      const now = new Date();
      if (tier.sale_start_at && new Date(tier.sale_start_at) > now) {
        throw new Error(`Sales for ${tier.name} haven't started yet`);
      }
      if (tier.sale_end_at && new Date(tier.sale_end_at) < now) {
        throw new Error(`Sales for ${tier.name} have ended`);
      }

      subtotalCents += tier.price_cents * item.quantity;
      ticketCurrency = tier.currency || "eur";
      totalTicketCount += item.quantity;
      ticketBreakdown.push({
        tierId: tier.id,
        tierName: tier.name,
        quantity: item.quantity,
        priceEach: tier.price_cents,
      });

      // Add to Stripe line items
      if (tier.price_cents > 0) {
        lineItems.push({
          price_data: {
            currency: tier.currency || "eur",
            product_data: {
              name: `${event.title} - ${tier.name}`,
              description: tier.description || undefined,
            },
            unit_amount: tier.price_cents,
          },
          quantity: item.quantity,
        });
      }
    }

    // Calculate pricing using the business pricing profile
    const pricing = calculatePricing(
      subtotalCents, 
      pricingProfile, 
      eventType, 
      totalTicketCount, 
      eventType === 'hybrid' ? 1 : 0
    );
    
    const commissionPercent = pricingProfile.platform_revenue_enabled && pricingProfile.revenue_model === 'commission' 
      ? pricingProfile.commission_percent : 0;
    const commissionCents = pricing.fomoRevenueCents;
    const stripeFeesCents = pricing.stripeFeeCents;
    const totalCents = pricing.customerPaysCents;

    logStep("Price calculated", { 
      subtotalCents, 
      stripeFeesCents, 
      fomoRevenueCents: pricing.fomoRevenueCents,
      applicationFeeCents: pricing.applicationFeeCents,
      totalCents,
      stripeFeeBearer: pricingProfile.stripe_fee_bearer,
    });

    // Stripe minimum charge validation (EUR: €0.50)
    // Only applies to paid checkouts (free tickets / pay-at-door bypass Stripe entirely)
    const STRIPE_MIN_EUR_CENTS = 50;
    if (subtotalCents > 0 && totalCents < STRIPE_MIN_EUR_CENTS) {
      logStep("ERROR: Total below Stripe minimum", { totalCents, minimum: STRIPE_MIN_EUR_CENTS });
      return new Response(
        JSON.stringify({
          error: "MINIMUM_CHARGE_NOT_MET",
          message: "Το συνολικό ποσό πληρωμής πρέπει να είναι τουλάχιστον €0.50. Παρακαλώ αυξήστε την ποσότητα ή επιλέξτε ακριβότερο εισιτήριο.",
          message_en: "The total payment amount must be at least €0.50. Please increase quantity or select a higher-priced ticket.",
          minimum_cents: STRIPE_MIN_EUR_CENTS,
          current_cents: totalCents,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add processing fee as separate line item (when buyer pays)
    if (pricing.addProcessingFeeLineItem && pricing.processingFeeLineItemCents > 0) {
      lineItems.push({
        price_data: {
          currency: ticketCurrency,
          product_data: {
            name: "Processing Fee",
            description: "Payment processing fee",
          },
          unit_amount: pricing.processingFeeLineItemCents,
        },
        quantity: 1,
      });
    }

    // Add platform fee line item (when buyer pays fixed fee)
    if (pricing.addPlatformFeeLineItem && pricing.platformFeeLineItemCents > 0) {
      lineItems.push({
        price_data: {
          currency: ticketCurrency,
          product_data: {
            name: "Service Fee",
            description: "Platform service fee",
          },
          unit_amount: pricing.platformFeeLineItemCents,
        },
        quantity: 1,
      });
    }

    // Helper to mark seats as sold in show_instance_seats
    const markSeatsAsSold = async (orderId: string) => {
      if (!seatIds || seatIds.length === 0 || !showInstanceId) return;
      
      const seatInserts = seatIds.map(seatId => ({
        show_instance_id: showInstanceId,
        venue_seat_id: seatId,
        status: 'sold',
        held_until: null,
      }));

      const { error: seatError } = await supabaseClient
        .from('show_instance_seats')
        .upsert(seatInserts, { onConflict: 'show_instance_id,venue_seat_id' });

      if (seatError) {
        logStep("Error marking seats as sold", { error: seatError.message });
      } else {
        logStep("Seats marked as sold", { count: seatIds.length });
      }
    };

    // Helper to build ticket objects with seat info
    const buildTicketsToCreate = (orderId: string) => {
      const ticketsToCreate = [];
      let guestIdx = 0;
      
      if (seatIds && seatIds.length > 0) {
        // Seated event: one ticket per seat
        for (const seatId of seatIds) {
          const seatDetail = seatDetailsMap.get(seatId);
          const guestInfo = guests?.[guestIdx];
          // Find matching tier for this seat's zone
          const matchingItem = items[0]; // fallback
          ticketsToCreate.push({
            order_id: orderId,
            tier_id: matchingItem.tierId,
            event_id: eventId,
            user_id: user.id,
            status: "valid",
            guest_name: guestInfo?.name || null,
            guest_age: guestInfo?.age || null,
            seat_zone: seatDetail?.zone || null,
            seat_row: seatDetail?.row || null,
            seat_number: seatDetail?.number || null,
          });
          guestIdx++;
        }
      } else {
        // Non-seated event
        for (const item of items) {
          for (let i = 0; i < item.quantity; i++) {
            const guestInfo = guests?.[guestIdx];
            ticketsToCreate.push({
              order_id: orderId,
              tier_id: item.tierId,
              event_id: eventId,
              user_id: user.id,
              status: "valid",
              guest_name: guestInfo?.name || null,
              guest_age: guestInfo?.age || null,
            });
            guestIdx++;
          }
        }
      }
      return ticketsToCreate;
    };

    // For free tickets OR pay-at-door events, skip Stripe and create order directly
    const isPayAtDoor = event.pay_at_door === true;
    if (subtotalCents === 0 || isPayAtDoor) {
      logStep(isPayAtDoor ? "Pay-at-door event - creating order directly (skip Stripe)" : "Free tickets - creating order directly");
      
      // Create order
      const { data: order, error: orderError } = await supabaseClient
        .from("ticket_orders")
        .insert({
          user_id: user.id,
          event_id: eventId,
          business_id: event.business_id,
          subtotal_cents: 0,
          commission_cents: 0,
          commission_percent: commissionPercent,
          total_cents: 0,
          status: "completed",
          customer_email: customerEmail || user.email,
          customer_name: customerName,
          customer_phone: customerPhone || null,
        })
        .select()
        .single();

      if (orderError || !order) {
        throw new Error("Failed to create order: " + orderError?.message);
      }

      // Create individual tickets with guest & seat info
      const ticketsToCreate = buildTicketsToCreate(order.id);

      const { error: ticketsError } = await supabaseClient
        .from("tickets")
        .insert(ticketsToCreate);

      if (ticketsError) {
        throw new Error("Failed to create tickets: " + ticketsError.message);
      }

      // Mark seats as sold
      await markSeatsAsSold(order.id);

      logStep("Free order completed", { orderId: order.id });

      // Create in-app notification for user
      try {
        await supabaseClient.from('notifications').insert({
          user_id: user.id,
          title: 'Εισιτήρια ληφθήκαν',
          message: `${event.title} - ${ticketsToCreate.length} ${ticketsToCreate.length === 1 ? 'εισιτήριο' : 'εισιτήρια'}`,
          type: 'ticket',
          event_type: 'ticket_purchased',
          entity_type: 'ticket_order',
          entity_id: order.id,
          deep_link: `/dashboard-user/tickets`,
          delivered_at: new Date().toISOString(),
        });
        logStep("User in-app notification created");
      } catch (notifError) {
        logStep("User in-app notification error", String(notifError));
      }

      // Send push notification to user
      try {
        const pushResult = await sendPushIfEnabled(user.id, {
          title: 'Εισιτήρια ληφθήκαν',
          body: `${event.title} - ${ticketsToCreate.length} ${ticketsToCreate.length === 1 ? 'εισιτήριο' : 'εισιτήρια'}`,
          tag: `ticket-order-${order.id}`,
          data: {
            url: `/dashboard-user/tickets`,
            type: 'ticket_purchased',
            entityType: 'ticket_order',
            entityId: order.id,
          },
        }, supabaseClient);
        logStep("User push notification sent", pushResult);
      } catch (pushError) {
        logStep("User push notification error", String(pushError));
      }

      // Notify business about free ticket claim
      try {
        await supabaseClient.from('notifications').insert({
          user_id: business.user_id,
          title: 'Νέα λήψη εισιτηρίων',
          message: `${customerName || user.email} πήρε ${ticketsToCreate.length} ${ticketsToCreate.length === 1 ? 'εισιτήριο' : 'εισιτήρια'} για "${event.title}"`,
          type: 'business',
          event_type: 'ticket_purchased',
          entity_type: 'ticket_order',
          entity_id: order.id,
          deep_link: `/dashboard-business/ticket-sales`,
          delivered_at: new Date().toISOString(),
        });
        logStep("Business in-app notification created");
      } catch (notifError) {
        logStep("Business in-app notification error", String(notifError));
      }

      // Send ticket confirmation email
      try {
        const formattedTickets = ticketsToCreate.map((t, idx) => {
          const tier = tiers.find(tr => tr.id === t.tier_id);
          const priceCents = tier?.price_cents || 0;
          return {
            id: `ticket-${idx}`,
            qrToken: '',
            tierName: tier?.name || 'Εισιτήριο',
            pricePaid: priceCents > 0 ? `€${(priceCents / 100).toFixed(2)}` : 'Δωρεάν',
          };
        });

        // Fetch created tickets to get qr_code_tokens
        const { data: createdTickets } = await supabaseClient
          .from('tickets')
          .select('id, qr_code_token, tier_id')
          .eq('order_id', order.id);

        if (createdTickets) {
          createdTickets.forEach((ct, idx) => {
            if (formattedTickets[idx]) {
              formattedTickets[idx].id = ct.id;
              formattedTickets[idx].qrToken = ct.qr_code_token || '';
            }
          });
        }

        const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-ticket-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": `${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            orderId: order.id,
            userId: user.id,
            userEmail: (customerEmail || user.email || '').trim(),
            customerName,
            eventTitle: event.title,
            eventDate: event.start_at,
            eventLocation: event.venue_name || event.location,
            businessName: business.name,
            eventCoverImage: event.cover_image_url,
            tickets: formattedTickets,
            isHybrid: !!seatingTypeId,
          }),
        });

        if (!emailResponse.ok) {
          throw new Error(await emailResponse.text());
        }

        logStep("Ticket email sent");
      } catch (emailError) {
        logStep("Ticket email error", String(emailError));
      }

      return new Response(JSON.stringify({ 
        success: true, 
        orderId: order.id,
        isFree: true 
      }), {
        headers: jsonHeaders(),
        status: 200,
      });
    }

    // For paid tickets, create Stripe checkout session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Validate the destination account exists in current Stripe mode (test vs live) if business has Stripe Connect
    if (business?.stripe_account_id && business?.stripe_payouts_enabled) {
      try {
        await stripe.accounts.retrieve(business.stripe_account_id);
        logStep("Destination account validated");
      } catch (stripeError: unknown) {
        const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
        logStep("Destination account invalid", { error: errorMessage, accountId: business.stripe_account_id });
        
        // Clear the stale account ID
        await supabaseClient
          .from("businesses")
          .update({ 
            stripe_account_id: null,
            stripe_onboarding_completed: false,
            stripe_payouts_enabled: false
          })
          .eq("id", business.id);
          
        throw new Error("This business needs to re-complete payment setup. Please contact the business owner.");
      }
    }

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create pending order first
    const { data: order, error: orderError } = await supabaseClient
      .from("ticket_orders")
      .insert({
        user_id: user.id,
        event_id: eventId,
        business_id: event.business_id,
        subtotal_cents: subtotalCents,
        commission_cents: commissionCents,
        commission_percent: commissionPercent,
        total_cents: totalCents,
        status: "pending",
        customer_email: customerEmail || user.email,
        customer_name: customerName,
        customer_phone: customerPhone || null,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error("Failed to create order: " + orderError?.message);
    }
    logStep("Pending order created", { orderId: order.id });

    // Hold seats immediately (will be confirmed on payment, released on expiry)
    if (seatIds && seatIds.length > 0 && showInstanceId) {
      const holdInserts = seatIds.map(seatId => ({
        show_instance_id: showInstanceId,
        venue_seat_id: seatId,
        status: 'held',
        held_by: user.id,
        held_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min hold
      }));

      const { error: holdError } = await supabaseClient
        .from('show_instance_seats')
        .upsert(holdInserts, { onConflict: 'show_instance_id,venue_seat_id' });

      if (holdError) {
        logStep("Error holding seats", { error: holdError.message });
      } else {
        logStep("Seats held for checkout", { count: seatIds.length });
      }
    }

    const origin = req.headers.get("origin") || "https://lovable.dev";
    
    // Check if business has Stripe Connect set up for payment splitting
    const hasStripeConnect = business?.stripe_account_id && business?.stripe_payouts_enabled;
    
    // Serialize seat details for metadata (Stripe metadata values max 500 chars)
    const seatDetailsForMeta = seatIds ? JSON.stringify(
      seatIds.map(id => {
        const d = seatDetailsMap.get(id);
        return d ? { id, z: d.zone, r: d.row, n: d.number } : { id };
      })
    ) : undefined;

    // Build session config
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/ticket-success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${origin}/ekdiloseis/${eventId}?cancelled=true`,
      metadata: {
        order_id: order.id,
        event_id: eventId,
        user_id: user.id,
        ticket_breakdown: JSON.stringify(ticketBreakdown),
        guests: guests ? JSON.stringify(guests) : undefined,
        seating_type_id: seatingTypeId || undefined,
        reservation_name: reservationName?.trim() || undefined,
        special_requests: specialRequests || undefined,
        seat_ids: seatIds ? JSON.stringify(seatIds) : undefined,
        seat_details: seatDetailsForMeta,
        show_instance_id: showInstanceId || undefined,
        promoter_session_id: promoterSessionId || undefined,
        promoter_tracking_code: promoterTrackingCode || undefined,
      },
    };
    
    // If business has Stripe Connect, use payment splitting with pricing profile
    if (hasStripeConnect) {
      logStep("Using Stripe Connect payment splitting", { 
        connectedAccountId: business.stripe_account_id,
        applicationFee: pricing.applicationFeeCents,
        fomoRevenue: pricing.fomoRevenueCents,
        stripeFees: pricing.stripeFeeCents,
      });
      
      sessionConfig.payment_intent_data = {
        application_fee_amount: pricing.applicationFeeCents,
        transfer_data: {
          destination: business.stripe_account_id!,
        },
        statement_descriptor_suffix: toStatementDescriptorSuffix(business.name || ''),
      };
    } else {
      logStep("Business not connected to Stripe - using standard checkout (manual payout required)");
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Update order with session ID
    await supabaseClient
      .from("ticket_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id);

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      url: session.url, 
      orderId: order.id,
      isFree: false 
    }), {
      headers: jsonHeaders(),
      status: 200,
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: jsonHeaders(),
      status: 500,
    });
  }
});
