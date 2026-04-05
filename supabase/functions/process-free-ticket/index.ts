import { createClient } from "npm:@supabase/supabase-js@2";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-FREE-TICKET] ${step}`, details ? JSON.stringify(details) : '');
};

const BodySchema = z.object({
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
    const rateCheck = await checkRateLimit(rateLimitId, "process_free_ticket", 10, 5);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { orderId } = await parseBody(req, BodySchema);
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
          userId: order.user_id,
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