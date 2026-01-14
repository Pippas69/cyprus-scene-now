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
        qr_token,
        tier_id
      `)
      .eq("order_id", orderId);

    if (ticketsError) {
      logStep("Failed to fetch tickets", { error: ticketsError.message });
    }

    const ticketCount = tickets?.length || 1;
    logStep("Tickets fetched", { count: ticketCount });

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

      const emailResponse = await supabase.functions.invoke("send-ticket-email", {
        body: {
          orderDetails: {
            id: order.id,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            totalCents: order.total_cents,
          },
          eventDetails: {
            title: event?.title || "Event",
            startAt: event?.start_at,
            endAt: event?.end_at,
            location: event?.location,
            venueName: event?.venue_name,
            coverImageUrl: event?.cover_image_url,
            businessName: business?.name,
            businessLogo: business?.logo_url,
          },
          tickets: tickets?.map(t => {
            const tier = tierMap.get(t.tier_id);
            return {
              id: t.id,
              qrToken: t.qr_token,
              tierName: tier?.name || "Ticket",
              priceCents: tier?.price_cents || 0,
            };
          }) || [],
        },
      });

      logStep("Email sent", { response: emailResponse.data });
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