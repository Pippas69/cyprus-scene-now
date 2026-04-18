import { createClient } from "npm:@supabase/supabase-js@2";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[VALIDATE-TICKET] ${step}`, details ? JSON.stringify(details) : '');
};

// Mask email for privacy - show first 3 chars + *** + @domain
const maskEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  const visibleChars = Math.min(3, localPart.length);
  const masked = localPart.substring(0, visibleChars) + '***';
  return `${masked}@${domain}`;
};

const BodySchema = z.object({
  qrToken: safeString(500),
  action: z.enum(["check", "checkin"]).default("check"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitId = (req.headers.get("Authorization") || clientIP).substring(0, 40) + ":" + clientIP;
    const rateCheck = await checkRateLimit(rateLimitId, "validate_ticket", 60, 5);
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

    // Get authenticated user (business owner)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    
    const staffUserId = userData.user.id;
    logStep("Staff authenticated", { userId: staffUserId });

    const { qrToken, action } = await parseBody(req, BodySchema);
    logStep("Request", { qrToken, action });

    if (!qrToken) {
      throw new Error("Missing QR token");
    }

    // Find ticket by QR token
    const { data: ticket, error: ticketError } = await supabaseClient
      .from("tickets")
      .select(`
        *,
        ticket_tiers(name, price_cents),
        ticket_orders(customer_name, customer_email, user_id, linked_reservation_id),
        events(id, title, start_at, business_id, businesses(id, user_id, name))
      `)
      .eq("qr_code_token", qrToken)
      .single();

    if (ticketError || !ticket) {
      logStep("Ticket not found", { qrToken });
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Ticket not found" 
      }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify the staff member owns this event's business
    const business = ticket.events?.businesses;
    if (!business || business.user_id !== staffUserId) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "You don't have permission to validate tickets for this event" 
      }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check ticket status
    if (ticket.status === "used") {
      return new Response(JSON.stringify({
        valid: false,
        error: "Ticket already used",
      }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (ticket.status === "cancelled" || ticket.status === "refunded") {
      return new Response(JSON.stringify({
        valid: false,
        error: `Ticket has been ${ticket.status}`,
      }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If action is "check", just return validity without marking used
    if (action === "check") {
      return new Response(JSON.stringify({
        valid: true,
        ticket: {
          id: ticket.id,
          tierName: ticket.ticket_tiers?.name,
          tierPrice: ticket.ticket_tiers?.price_cents,
          customerName: ticket.guest_name || ticket.ticket_orders?.customer_name,
          customerEmail: maskEmail(ticket.ticket_orders?.customer_email),
          eventTitle: ticket.events?.title,
          eventStartAt: ticket.events?.start_at,
          status: ticket.status,
        }
      }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If action is "checkin", mark ticket as used atomically
    if (action === "checkin") {
      const { data: checkinResult, error: checkinError } = await supabaseClient
        .rpc("atomic_ticket_checkin", {
          p_ticket_id: ticket.id,
          p_staff_user_id: staffUserId,
        });

      if (checkinError) {
        throw new Error("Failed to check in ticket: " + checkinError.message);
      }

      if (!checkinResult?.success) {
        return new Response(JSON.stringify({
          valid: false,
          error: checkinResult?.error === 'ALREADY_USED' ? "Ticket already used" : "Ticket cannot be checked in",
        }), {
          headers: { ...securityHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Ticket checked in", { ticketId: ticket.id });

      // Check for linked reservation (hybrid ticket+reservation flow)
      let linkedReservation = null;
      const linkedReservationId = ticket.ticket_orders?.linked_reservation_id;

      // Helper: lookup matched tier (with bottle fields) for a reservation
      const lookupTier = async (seatingTypeId: string, partySize: number) => {
        const { data: tiers } = await supabaseClient
          .from("seating_type_tiers")
          .select("min_people, max_people, prepaid_min_charge_cents, pricing_mode, bottle_type, bottle_count")
          .eq("seating_type_id", seatingTypeId)
          .order("min_people", { ascending: true });
        if (!tiers || tiers.length === 0) return null;
        const matched = tiers.find((t: any) => partySize >= t.min_people && partySize <= t.max_people);
        return matched ?? [...tiers].reverse().find((t: any) => partySize >= t.min_people) ?? tiers[0];
      };

      const buildLinkedReservation = (resData: any, tier: any | null) => ({
        partySize: resData.party_size,
        minimumChargeCents: (tier?.prepaid_min_charge_cents ?? resData.prepaid_min_charge_cents ?? resData.ticket_credit_cents ?? 0),
        ticketCreditCents: resData.ticket_credit_cents,
        pricingMode: tier?.pricing_mode ?? 'amount',
        bottleType: tier?.bottle_type ?? null,
        bottleCount: tier?.bottle_count ?? null,
      });

      if (linkedReservationId) {
        const { data: resData, error: resError } = await supabaseClient
          .from("reservations")
          .select("party_size, prepaid_min_charge_cents, ticket_credit_cents, seating_type_id")
          .eq("id", linkedReservationId)
          .maybeSingle();

        if (resError) {
          logStep("Linked reservation lookup error", { linkedReservationId, error: resError.message });
        }

        if (resData && resData.seating_type_id) {
          const tier = await lookupTier(resData.seating_type_id, resData.party_size);
          linkedReservation = buildLinkedReservation(resData, tier);
        }
      } else {
        // Fallback for older orders without linked_reservation_id
        const orderUserId = ticket.ticket_orders?.user_id || ticket.user_id;
        if (orderUserId && ticket.events?.id) {
          const { data: fallbackResData, error: fallbackResError } = await supabaseClient
            .from("reservations")
            .select("party_size, prepaid_min_charge_cents, ticket_credit_cents, seating_type_id")
            .eq("event_id", ticket.events.id)
            .eq("user_id", orderUserId)
            .eq("auto_created_from_tickets", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fallbackResError) {
            logStep("Fallback linked reservation lookup error", { orderUserId, error: fallbackResError.message });
          }

          if (fallbackResData && fallbackResData.seating_type_id) {
            const tier = await lookupTier(fallbackResData.seating_type_id, fallbackResData.party_size);
            linkedReservation = buildLinkedReservation(fallbackResData, tier);
          }
        }
      }

      return new Response(JSON.stringify({
        valid: true,
        checkedIn: true,
        ticket: {
          id: ticket.id,
          tierName: ticket.ticket_tiers?.name,
          tierPrice: ticket.ticket_tiers?.price_cents,
          customerName: ticket.guest_name || ticket.ticket_orders?.customer_name,
          customerEmail: maskEmail(ticket.ticket_orders?.customer_email),
          eventTitle: ticket.events?.title,
          eventStartAt: ticket.events?.start_at,
          status: "used",
          checkedInAt: new Date().toISOString(),
        },
        linkedReservation,
      }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action");

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, valid: false }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
