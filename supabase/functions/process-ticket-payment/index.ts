import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-TICKET-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
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
      .select("customer_email, customer_name, events(title, start_at, location, cover_image_url, businesses(name))")
      .eq("id", orderId)
      .single();

    // Send email with tickets - now with proper await and error handling
    if (orderDetails?.customer_email && createdTickets && createdTickets.length > 0) {
      const tickets = createdTickets.map((t: any) => {
        const priceCents = (t.ticket_tiers as any)?.price_cents || 0;
        const currency = (t.ticket_tiers as any)?.currency || 'eur';
        const pricePaid = priceCents === 0 ? 'Free' : `€${(priceCents / 100).toFixed(2)}`;
        
        return {
          id: t.id,
          qrToken: t.qr_code_token,
          tierName: (t.ticket_tiers as any)?.name || "General",
          pricePaid,
        };
      });

      const event = orderDetails.events as any;
      const eventTitle = event?.title || "Event";
      const eventDate = event?.start_at || "";
      const eventLocation = event?.location || "";
      const eventCoverImage = event?.cover_image_url || "";
      const businessName = event?.businesses?.name || "";
      const customerName = orderDetails.customer_name || "";

      // Call send-ticket-email function with proper error handling
      try {
        const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-ticket-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            orderId,
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
          logStep("Email send failed", { status: emailResponse.status, error: errorData });
        } else {
          logStep("Email notification sent successfully");
        }
      } catch (emailError) {
        logStep("Email send error", { error: emailError instanceof Error ? emailError.message : String(emailError) });
      }
    }

    // Record commission in commission_ledger if applicable
    if (order.commission_cents > 0) {
      // We would insert into commission_ledger here
      // But we need a discount_id which isn't applicable for tickets
      // For now, the commission is tracked in the order itself
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
