import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-FREE-TICKET] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { orderId } = await req.json();
    logStep("Request data", { orderId });

    if (!orderId) {
      throw new Error("Missing orderId");
    }

    // Fetch order with event and business details
    const { data: order, error: orderError } = await supabase
      .from("ticket_orders")
      .select(`
        *,
        events(
          title,
          start_at,
          end_at,
          location,
          venue_name,
          cover_image_url,
          businesses(name, logo_url)
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }
    logStep("Order fetched", { status: order.status, eventTitle: order.events?.title });

    // Fetch tickets for this order with tier info
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select(`
        id,
        qr_code_token,
        tier_id
      `)
      .eq("order_id", orderId);

    if (ticketsError) {
      logStep("Failed to fetch tickets", { error: ticketsError.message });
    }

    const ticketCount = tickets?.length || 0;
    logStep("Tickets fetched", { count: ticketCount, tickets: tickets?.map(t => ({ id: t.id, tier_id: t.tier_id })) });

    // Fetch tier info separately
    const tierIds = [...new Set(tickets?.map(t => t.tier_id) || [])];
    const { data: tiers } = await supabase
      .from("ticket_tiers")
      .select("id, name, price_cents")
      .in("id", tierIds);

    const tierMap = new Map(tiers?.map(t => [t.id, t]) || []);

    // Try to send email
    try {
      const event = order.events;
      const business = event?.businesses;

      // Format tickets with correct field names for send-ticket-email
      const formattedTickets = tickets?.map(t => {
        const tier = tierMap.get(t.tier_id);
        const priceCents = tier?.price_cents || 0;
        return {
          id: t.id,
          qrToken: t.qr_code_token,
          tierName: tier?.name || "Ticket",
          pricePaid: priceCents > 0 ? `€${(priceCents / 100).toFixed(2)}` : "Δωρεάν",
        };
      }) || [];

      logStep("Sending email", { 
        to: order.customer_email, 
        ticketCount: formattedTickets.length,
        eventTitle: event?.title 
      });

      const emailResponse = await supabase.functions.invoke("send-ticket-email", {
        body: {
          orderId: order.id,
          userEmail: order.customer_email,
          customerName: order.customer_name,
          eventTitle: event?.title || "Event",
          eventDate: event?.start_at,
          eventLocation: event?.venue_name || event?.location,
          businessName: business?.name,
          eventCoverImage: event?.cover_image_url,
          tickets: formattedTickets,
        },
      });

      logStep("Email sent", { response: emailResponse.data, error: emailResponse.error });
    } catch (emailError) {
      logStep("Email sending failed (non-fatal)", { 
        error: emailError instanceof Error ? emailError.message : String(emailError) 
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      ticketCount,
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