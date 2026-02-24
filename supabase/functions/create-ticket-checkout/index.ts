import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TicketItem {
  tierId: string;
  quantity: number;
}

interface CheckoutRequest {
  eventId: string;
  items: TicketItem[];
  customerName: string;
  customerEmail: string;
}

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-TICKET-CHECKOUT] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { eventId, items, customerName, customerEmail }: CheckoutRequest = await req.json();
    logStep("Request data", { eventId, items, customerName, customerEmail });

    if (!eventId || !items || items.length === 0) {
      throw new Error("Missing required fields");
    }

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

    // Get business subscription to determine commission rate
    const { data: subscription } = await supabaseClient
      .from("business_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("business_id", event.business_id)
      .eq("status", "active")
      .maybeSingle();

    let planSlug = "free";
    if (subscription?.subscription_plans?.slug) {
      planSlug = subscription.subscription_plans.slug;
    }
    logStep("Subscription plan", { planSlug });

    // Get commission rate for this plan
    const { data: commissionRate } = await supabaseClient
      .from("ticket_commission_rates")
      .select("commission_percent")
      .eq("plan_slug", planSlug)
      .single();

    const commissionPercent = commissionRate?.commission_percent ?? 12;
    logStep("Commission rate", { commissionPercent });

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

    const commissionCents = Math.round(subtotalCents * commissionPercent / 100);
    const totalCents = subtotalCents; // User pays subtotal, commission is taken from business
    logStep("Price calculated", { subtotalCents, commissionCents, totalCents });

    // For free tickets, skip Stripe and create order directly
    if (subtotalCents === 0) {
      logStep("Free tickets - creating order directly");
      
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
        })
        .select()
        .single();

      if (orderError || !order) {
        throw new Error("Failed to create order: " + orderError?.message);
      }

      // Create individual tickets
      const ticketsToCreate = [];
      for (const item of items) {
        for (let i = 0; i < item.quantity; i++) {
          ticketsToCreate.push({
            order_id: order.id,
            tier_id: item.tierId,
            event_id: eventId,
            user_id: user.id,
            status: "valid",
          });
        }
      }

      const { error: ticketsError } = await supabaseClient
        .from("tickets")
        .insert(ticketsToCreate);

      if (ticketsError) {
        throw new Error("Failed to create tickets: " + ticketsError.message);
      }

      // quantity_sold already updated atomically by reserve_tickets_atomically()

      logStep("Free order completed", { orderId: order.id });

      // Create in-app notification for user
      try {
        await supabaseClient.from('notifications').insert({
          user_id: user.id,
          title: '🎟️ Εισιτήρια ληφθήκαν!',
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
          title: '🎟️ Εισιτήρια ληφθήκαν!',
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
          title: '🎟️ Νέα λήψη εισιτηρίων!',
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

        await supabaseClient.functions.invoke('send-ticket-email', {
          body: {
            orderId: order.id,
            userId: user.id,
            userEmail: customerEmail || user.email,
            customerName: customerName,
            eventTitle: event.title,
            eventDate: event.start_at,
            eventLocation: event.venue_name || event.location,
            businessName: business.name,
            eventCoverImage: event.cover_image_url,
            tickets: formattedTickets,
          },
        });
        logStep("Ticket email sent");
      } catch (emailError) {
        logStep("Ticket email error", String(emailError));
      }

      return new Response(JSON.stringify({ 
        success: true, 
        orderId: order.id,
        isFree: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error("Failed to create order: " + orderError?.message);
    }
    logStep("Pending order created", { orderId: order.id });

    const origin = req.headers.get("origin") || "https://lovable.dev";
    
    // Check if business has Stripe Connect set up for payment splitting
    const hasStripeConnect = business?.stripe_account_id && business?.stripe_payouts_enabled;
    
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
      },
    };
    
    // If business has Stripe Connect, use payment splitting
    if (hasStripeConnect) {
      logStep("Using Stripe Connect payment splitting", { 
        connectedAccountId: business.stripe_account_id,
        applicationFee: commissionCents 
      });
      
      sessionConfig.payment_intent_data = {
        application_fee_amount: commissionCents, // Platform takes commission
        transfer_data: {
          destination: business.stripe_account_id!, // Business receives the rest
        },
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
