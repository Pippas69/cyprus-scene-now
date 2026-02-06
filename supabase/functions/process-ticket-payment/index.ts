import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEncryptedPush, PushPayload } from "../_shared/web-push-crypto.ts";
import { buildNotificationKey, markAsSent, wasAlreadySent } from "../_shared/notification-idempotency.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-TICKET-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId, orderId } = await req.json();
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Parse ticket breakdown from metadata
    const ticketBreakdown = JSON.parse(session.metadata?.ticket_breakdown || "[]");
    logStep("Ticket breakdown", ticketBreakdown);

    // Create individual tickets
    const ticketsToCreate = [];
    for (const item of ticketBreakdown) {
      for (let i = 0; i < item.quantity; i++) {
        ticketsToCreate.push({
          order_id: orderId,
          tier_id: item.tierId,
          event_id: order.event_id,
          user_id: order.user_id,
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
    logStep("Tickets created", { count: ticketsToCreate.length });

    // Update quantity_sold for each tier
    for (const item of ticketBreakdown) {
      const { data: tier } = await supabaseClient
        .from("ticket_tiers")
        .select("quantity_sold")
        .eq("id", item.tierId)
        .single();

      if (tier) {
        await supabaseClient
          .from("ticket_tiers")
          .update({ quantity_sold: tier.quantity_sold + item.quantity })
          .eq("id", item.tierId);
      }
    }
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
        title: '🎟️ Εισιτήρια επιβεβαιώθηκαν!',
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
        const userPushPayload: PushPayload = {
          title: '🎟️ Εισιτήρια επιβεβαιώθηκαν!',
          body: `${eventTitle} - ${ticketCount} ${ticketCount === 1 ? 'εισιτήριο' : 'εισιτήρια'}`,
          icon: '/fomo-logo-new.png',
          badge: '/fomo-logo-new.png',
          tag: `ticket-order-${orderId}`,
          data: {
            url: '/dashboard-user/tickets',
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
          title: '🎟️ Νέα Πώληση Εισιτηρίων!',
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
            tag: `ticket-sale-${orderId}`,
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
      logStep("Commission recorded", { amount: order.commission_cents });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      ticketCount: ticketsToCreate.length 
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
