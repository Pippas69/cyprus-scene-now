import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEncryptedPush, PushPayload } from "../_shared/web-push-crypto.ts";
import { buildNotificationKey, markAsSent, wasAlreadySent } from "../_shared/notification-idempotency.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-TICKET-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
};

const BodySchema = z.object({
  sessionId: safeString(500),
  orderId: flexId,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitId = (req.headers.get("Authorization") || clientIP).substring(0, 40) + ":" + clientIP;
    const rateCheck = await checkRateLimit(rateLimitId, "process_ticket_payment", 10, 5);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId, orderId } = await parseBody(req, BodySchema);
    logStep("Request data", { sessionId, orderId });

    if (!sessionId || !orderId) {
      throw new Error("Missing sessionId or orderId");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { status: session.payment_status, paymentIntent: session.payment_intent });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Check if order exists and is pending
    const { data: order, error: orderError } = await supabaseClient
      .from("ticket_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    if (order.status === "completed") {
      logStep("Order already completed");
      return new Response(JSON.stringify({ success: true, message: "Order already processed" }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Parse ticket breakdown, guests, and seat info from metadata
    const ticketBreakdown = JSON.parse(session.metadata?.ticket_breakdown || "[]");
    const guestsData = JSON.parse(session.metadata?.guests || "[]");
    const seatIds: string[] = session.metadata?.seat_ids ? JSON.parse(session.metadata.seat_ids) : [];
    const seatDetails: { id: string; z: string; r: string; n: number }[] = session.metadata?.seat_details ? JSON.parse(session.metadata.seat_details) : [];
    const showInstanceId = session.metadata?.show_instance_id || null;
    
    logStep("Ticket breakdown", ticketBreakdown);
    logStep("Guests data", { count: guestsData.length });
    logStep("Seat data", { seatCount: seatIds.length, showInstanceId });

    // Build seat details map
    const seatDetailsMap = new Map<string, { zone: string; row: string; number: number }>();
    for (const sd of seatDetails) {
      seatDetailsMap.set(sd.id, { zone: sd.z, row: sd.r, number: sd.n });
    }

    // Create individual tickets with guest info AND seat info
    const ticketsToCreate = [];
    let guestIdx = 0;

    if (seatIds.length > 0) {
      // Seated event: one ticket per seat — match tier to seat's zone
      const tiersByZone = new Map<string, string>();
      for (const item of ticketBreakdown) {
        if (item.zoneName) {
          tiersByZone.set(item.zoneName, item.tierId);
        }
      }
      // Fetch all tiers for this event to match by name if zoneName not in breakdown
      const { data: allTiers } = await supabaseClient
        .from("ticket_tiers")
        .select("id, name")
        .eq("event_id", order.event_id);
      const tiersByName = new Map<string, string>();
      if (allTiers) {
        for (const tier of allTiers) {
          tiersByName.set(tier.name, tier.id);
        }
      }
      const fallbackTierId = ticketBreakdown[0]?.tierId;

      for (const seatId of seatIds) {
        const seatDetail = seatDetailsMap.get(seatId);
        const guestInfo = guestsData[guestIdx];
        const zoneName = seatDetail?.zone || "";
        const matchedTierId = tiersByZone.get(zoneName) || tiersByName.get(zoneName) || fallbackTierId;
        ticketsToCreate.push({
          order_id: orderId,
          tier_id: matchedTierId,
          event_id: order.event_id,
          user_id: order.user_id,
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
      for (const item of ticketBreakdown) {
        for (let i = 0; i < item.quantity; i++) {
          const guestInfo = guestsData[guestIdx];
          ticketsToCreate.push({
            order_id: orderId,
            tier_id: item.tierId,
            event_id: order.event_id,
            user_id: order.user_id,
            status: "valid",
            guest_name: guestInfo?.name || null,
            guest_age: guestInfo?.age || null,
          });
          guestIdx++;
        }
      }
    }

    const { error: ticketsError } = await supabaseClient
      .from("tickets")
      .insert(ticketsToCreate);

    if (ticketsError) {
      throw new Error("Failed to create tickets: " + ticketsError.message);
    }
    logStep("Tickets created", { count: ticketsToCreate.length });

    // Mark seats as sold (upgrade from 'held' to 'sold')
    if (seatIds.length > 0 && showInstanceId) {
      const seatUpdates = seatIds.map(seatId => ({
        show_instance_id: showInstanceId,
        venue_seat_id: seatId,
        status: 'sold',
        held_until: null,
      }));

      const { error: seatError } = await supabaseClient
        .from('show_instance_seats')
        .upsert(seatUpdates, { onConflict: 'show_instance_id,venue_seat_id' });

      if (seatError) {
        logStep("Error marking seats as sold", { error: seatError.message });
      } else {
        logStep("Seats marked as sold", { count: seatIds.length });
      }
    }

    // quantity_sold already reserved atomically at checkout creation time
    logStep("Tier quantities already reserved at checkout");
    logStep("Tier quantities updated");

    // Update order status
    await supabaseClient
      .from("ticket_orders")
      .update({
        status: "completed",
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq("id", orderId);
    logStep("Order completed");

    // ==================== AUTO-CREATE RESERVATION FOR ticket_and_reservation EVENTS ====================
    let usesLinkedReservations = false;
    let seatingTypeId: string | null = (session.metadata?.seating_type_id || "").trim() || null;

    try {
      const { data: eventInfo } = await supabaseClient
        .from("events")
        .select("event_type, business_id")
        .eq("id", order.event_id)
        .single();

      if (eventInfo?.event_type === "ticket_and_reservation") {
        const { data: businessInfo } = await supabaseClient
          .from("businesses")
          .select("ticket_reservation_linked, category")
          .eq("id", eventInfo.business_id)
          .single();

        const linkedCategories = new Set(["clubs", "events", "theatre", "music", "dance", "kids"]);
        const businessCategories = Array.isArray(businessInfo?.category)
          ? (businessInfo?.category || []).map((c: string) => c.toLowerCase())
          : [];

        usesLinkedReservations =
          !!businessInfo?.ticket_reservation_linked ||
          businessCategories.some((category: string) => linkedCategories.has(category));

        // Validate/resolve seating type id
        const { data: eventSeatingTypes } = await supabaseClient
          .from("reservation_seating_types")
          .select("id, seating_type")
          .eq("event_id", order.event_id);

        const seatingTypeIdSet = new Set((eventSeatingTypes || []).map((st) => st.id));
        if (seatingTypeId && !seatingTypeIdSet.has(seatingTypeId)) {
          logStep("Provided seating_type_id is invalid for event", { seatingTypeId });
          seatingTypeId = null;
        }

        // Fallback: infer seating type from purchased ticket tier name
        if (!seatingTypeId) {
          const { data: orderTickets } = await supabaseClient
            .from("tickets")
            .select("tier_id, ticket_tiers(name)")
            .eq("order_id", orderId);

          const tierNames = Array.from(
            new Set(
              (orderTickets || [])
                .map((ticket) => (ticket.ticket_tiers as { name?: string } | null)?.name?.trim().toLowerCase())
                .filter((name): name is string => !!name)
            )
          );

          if (tierNames.length === 1) {
            const seatingByName = new Map(
              (eventSeatingTypes || []).map((st) => [String(st.seating_type || "").trim().toLowerCase(), st.id])
            );
            seatingTypeId = seatingByName.get(tierNames[0]) || null;
            if (seatingTypeId) {
              logStep("Resolved seating_type_id from tier name", { tierName: tierNames[0], seatingTypeId });
            }
          }
        }

        if (usesLinkedReservations && seatingTypeId) {
          logStep("Creating linked reservation for ticket+reservation purchase", { seatingTypeId });

          const totalTicketCreditCents = order.subtotal_cents || 0;
          const partySize = ticketsToCreate.length;
          const reservationNameFromMeta = session.metadata?.reservation_name?.trim() || null;
          const specialRequestsFromMeta = session.metadata?.special_requests || null;

          const confirmationCode = `TR-${orderId.substring(0, 8).toUpperCase()}`;
          const reservationQrToken = crypto.randomUUID();

          const reservationInsert: Record<string, unknown> = {
            event_id: order.event_id,
            business_id: eventInfo.business_id,
            user_id: order.user_id,
            reservation_name: reservationNameFromMeta || order.customer_name || "Guest",
            phone_number: order.customer_phone || null,
            party_size: partySize,
            status: "accepted",
            auto_created_from_tickets: false,
            ticket_credit_cents: totalTicketCreditCents,
            confirmation_code: confirmationCode,
            qr_code_token: reservationQrToken,
            special_requests:
              specialRequestsFromMeta ||
              `Created from ticket+reservation purchase (${partySize} tickets, €${(totalTicketCreditCents / 100).toFixed(2)} credit)`,
            seating_type_id: seatingTypeId,
            source: "ticket_auto",
          };

          const { data: newReservation, error: reservationError } = await supabaseClient
            .from("reservations")
            .insert(reservationInsert)
            .select("id")
            .single();

          if (reservationError) {
            logStep("Failed to create linked reservation", { error: reservationError.message });
          } else if (newReservation) {
            await supabaseClient
              .from("ticket_orders")
              .update({ linked_reservation_id: newReservation.id })
              .eq("id", orderId);
            logStep("Linked reservation created", {
              reservationId: newReservation.id,
              partySize,
              creditCents: totalTicketCreditCents,
              seatingTypeId,
            });
          }
        } else if (usesLinkedReservations) {
          logStep("Walk-in ticket purchase detected, skipping linked reservation auto-create");
        } else {
          logStep("Business/event does not use linked reservations, skipping auto-reservation");
        }
      }
    } catch (autoResError) {
      logStep("Auto-reservation creation error (non-fatal)", {
        error: autoResError instanceof Error ? autoResError.message : String(autoResError),
      });
    }

    // Fetch tickets with their QR tokens for email
    const { data: createdTickets } = await supabaseClient
      .from("tickets")
      .select("id, qr_code_token, ticket_tiers(name, price_cents, currency)")
      .eq("order_id", orderId);

    // Fetch user email, event details, business name, and cover image for email notification
    const { data: orderDetails } = await supabaseClient
      .from("ticket_orders")
      .select("customer_email, customer_name, events(title, start_at, location, cover_image_url, business_id, businesses(user_id, name, logo_url))")
      .eq("id", orderId)
      .single();

    const event = orderDetails?.events as any;
    const eventTitle = event?.title || "Event";
    const eventDate = event?.start_at || "";
    const eventLocation = event?.location || "";
    const eventCoverImage = event?.cover_image_url || "";
    const businessName = event?.businesses?.name || "";
    const businessUserId = event?.businesses?.user_id;
    const customerName = orderDetails?.customer_name || "";
    const ticketCount = ticketsToCreate.length;

    // ==================== USER NOTIFICATIONS ====================
    
    // 1. User In-App Notification
    try {
      await supabaseClient.from('notifications').insert({
        user_id: order.user_id,
        title: 'Εισιτήρια επιβεβαιώθηκαν',
        message: `${eventTitle} - ${ticketCount} ${ticketCount === 1 ? 'εισιτήριο' : 'εισιτήρια'}`,
        type: 'ticket',
        event_type: 'ticket_purchased',
        entity_type: 'ticket_order',
        entity_id: orderId,
        deep_link: '/dashboard-user/tickets',
        delivered_at: new Date().toISOString(),
      });
      logStep("User in-app notification created");
    } catch (err) {
      logStep("User in-app notification error", { error: err instanceof Error ? err.message : String(err) });
    }

    // 2. User Push Notification (idempotent)
    try {
      const userPushKey = buildNotificationKey({
        channel: "push",
        eventType: "ticket_purchased",
        recipientUserId: order.user_id,
        entityType: "ticket_order",
        entityId: orderId,
      });

      if (!(await wasAlreadySent(supabaseClient, order.user_id, userPushKey))) {
        const isHybridPurchase = !!(usesLinkedReservations && seatingTypeId);
        const userPushPayload: PushPayload = {
          title: isHybridPurchase ? 'Κράτηση επιβεβαιώθηκε' : 'Εισιτήρια επιβεβαιώθηκαν',
          body: isHybridPurchase
            ? `${eventTitle} - ${ticketCount} ${ticketCount === 1 ? 'άτομο' : 'άτομα'}`
            : `${eventTitle} - ${ticketCount} ${ticketCount === 1 ? 'εισιτήριο' : 'εισιτήρια'}`,
          icon: '/fomo-logo-new.png',
          badge: '/fomo-logo-new.png',
          tag: `n:ticket_purchased:${orderId}`,
          data: {
            url: isHybridPurchase ? '/dashboard-user?tab=reservations&subtab=event' : '/dashboard-user/tickets',
            type: 'ticket_purchased',
            entityType: 'ticket_order',
            entityId: orderId,
          },
        };

        const pushResult = await sendEncryptedPush(order.user_id, userPushPayload, supabaseClient);
        logStep("User push notification sent", pushResult);
        await markAsSent(supabaseClient, order.user_id, userPushKey, "ticket_order", orderId);
      } else {
        logStep("Skipping duplicate user push", { userId: order.user_id, orderId });
      }
    } catch (err) {
      logStep("User push notification error", { error: err instanceof Error ? err.message : String(err) });
    }

    // 3. User Email
    if (orderDetails?.customer_email && createdTickets && createdTickets.length > 0) {
      const tickets = createdTickets.map((t: any) => {
        const priceCents = (t.ticket_tiers as any)?.price_cents || 0;
        const pricePaid = priceCents === 0 ? 'Δωρεάν' : `€${(priceCents / 100).toFixed(2)}`;
        
        return {
          id: t.id,
          qrToken: t.qr_code_token,
          tierName: (t.ticket_tiers as any)?.name || "General",
          pricePaid,
        };
      });

      try {
        const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-ticket-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": `${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            orderId,
            userId: order.user_id,
            eventId: order.event_id,
            userEmail: orderDetails.customer_email,
            eventTitle,
            eventDate,
            eventLocation,
            eventCoverImage,
            businessName,
            customerName,
            tickets,
            isHybrid: !!(usesLinkedReservations && seatingTypeId),
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.text();
          logStep("User email send failed", { status: emailResponse.status, error: errorData });
        } else {
          logStep("User email notification sent successfully");
        }
      } catch (emailError) {
        logStep("User email send error", { error: emailError instanceof Error ? emailError.message : String(emailError) });
      }
    }

    // ==================== BUSINESS NOTIFICATIONS ====================
    
    if (businessUserId) {
      const totalAmountFormatted = order.total_cents > 0 
        ? `€${(order.total_cents / 100).toFixed(2)}` 
        : 'Δωρεάν';
      
      // Get primary tier name
      const primaryTier = ticketBreakdown[0];
      let tierName = "General";
      if (primaryTier?.tierId) {
        const { data: tierData } = await supabaseClient
          .from("ticket_tiers")
          .select("name")
          .eq("id", primaryTier.tierId)
          .single();
        tierName = tierData?.name || "General";
      }

      // 1. Business In-App Notification
      try {
        await supabaseClient.from('notifications').insert({
          user_id: businessUserId,
          title: 'Νέα Πώληση Εισιτηρίων',
          message: `${customerName || 'Πελάτης'} αγόρασε ${ticketCount} εισιτήρια για "${eventTitle}" (${totalAmountFormatted})`,
          type: 'business',
          event_type: 'ticket_sale',
          entity_type: 'ticket_order',
          entity_id: orderId,
          deep_link: '/dashboard-business/ticket-sales',
          delivered_at: new Date().toISOString(),
        });
        logStep("Business in-app notification created");
      } catch (err) {
        logStep("Business in-app notification error", { error: err instanceof Error ? err.message : String(err) });
      }

      // 2. Business Push Notification (idempotent)
      try {
        const bizPushKey = buildNotificationKey({
          channel: "push",
          eventType: "ticket_sale",
          recipientUserId: businessUserId,
          entityType: "ticket_order",
          entityId: orderId,
        });

        if (!(await wasAlreadySent(supabaseClient, businessUserId, bizPushKey))) {
          const businessPushPayload: PushPayload = {
            title: '🎟️ Νέα Πώληση Εισιτηρίων!',
            body: `${customerName || 'Πελάτης'} αγόρασε ${ticketCount} εισιτήρια για "${eventTitle}" (${totalAmountFormatted})`,
            icon: '/fomo-logo-new.png',
            badge: '/fomo-logo-new.png',
            tag: `n:ticket_sale:${orderId}`,
            data: {
              url: '/dashboard-business/ticket-sales',
              type: 'ticket_sale',
              entityType: 'ticket_order',
              entityId: orderId,
            },
          };
          const pushResult = await sendEncryptedPush(businessUserId, businessPushPayload, supabaseClient);
          logStep("Business push notification sent", pushResult);
          await markAsSent(supabaseClient, businessUserId, bizPushKey, "ticket_order", orderId);
        } else {
          logStep("Skipping duplicate business push", { businessUserId, orderId });
        }
      } catch (err) {
        logStep("Business push notification error", { error: err instanceof Error ? err.message : String(err) });
      }

      // 3. Business Email
      try {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email")
          .eq("id", businessUserId)
          .single();

        if (profile?.email) {
          const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-ticket-sale-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": `${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              orderId,
              eventId: order.event_id,
              eventTitle,
              customerName: customerName || "",
              ticketCount,
              totalAmount: order.total_cents || 0,
              tierName,
              businessEmail: profile.email,
              businessName,
              businessUserId,
            }),
          });

          if (!emailResponse.ok) {
            const errorData = await emailResponse.text();
            logStep("Business email send failed", { status: emailResponse.status, error: errorData });
          } else {
            logStep("Business email notification sent successfully");
          }
        }
      } catch (err) {
        logStep("Business email error", { error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Record commission in commission_ledger if applicable
    if (order.commission_cents > 0) {
      try {
        const { data: eventData } = await supabaseClient
          .from("events")
          .select("business_id")
          .eq("id", order.event_id)
          .single();

        if (eventData?.business_id) {
          const { error: ledgerError } = await supabaseClient
            .from("commission_ledger")
            .insert({
              source_type: 'ticket',
              business_id: eventData.business_id,
              ticket_order_id: orderId,
              original_price_cents: order.subtotal_cents,
              commission_percent: order.commission_percent || 0,
              commission_amount_cents: order.commission_cents,
              status: 'pending',
              redeemed_at: new Date().toISOString(),
            });

          if (ledgerError) {
            logStep("Commission ledger insert error", { error: ledgerError.message });
          } else {
            logStep("Commission recorded in ledger", { amount: order.commission_cents, businessId: eventData.business_id });
          }
        }
      } catch (err) {
        logStep("Commission ledger error", { error: err instanceof Error ? err.message : String(err) });
      }
    }

    // PR Attribution: link this purchase to a promoter (if applicable)
    try {
      const promoterSessionId = session.metadata?.promoter_session_id;
      if (promoterSessionId) {
        const { data: eventData } = await supabaseClient
          .from("events")
          .select("business_id")
          .eq("id", order.event_id)
          .single();

        if (eventData?.business_id) {
          const { data: attrResult, error: attrError } = await supabaseClient.rpc(
            "attribute_promoter_purchase",
            {
              _business_id: eventData.business_id,
              _event_id: order.event_id,
              _session_id: promoterSessionId,
              _customer_user_id: order.user_id || null,
              _ticket_order_id: orderId,
              _reservation_id: null,
              _order_amount_cents: order.subtotal_cents || session.amount_total || 0,
              _customer_name: order.customer_name || null,
              _customer_email: order.customer_email || null,
            },
          );
          if (attrError) {
            logStep("PR attribution error", { error: attrError.message });
          } else {
            logStep("PR attribution result", attrResult);
          }
        }
      }
    } catch (err) {
      logStep("PR attribution exception", { error: err instanceof Error ? err.message : String(err) });
    }

    return new Response(JSON.stringify({ success: true, orderId }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
