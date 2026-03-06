import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get authenticated user (business owner)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    
    const staffUserId = userData.user.id;
    logStep("Staff authenticated", { userId: staffUserId });

    const { qrToken, action = "check" } = await req.json();
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check ticket status
    if (ticket.status === "used") {
      return new Response(JSON.stringify({
        valid: false,
        error: "Ticket already used",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (ticket.status === "cancelled" || ticket.status === "refunded") {
      return new Response(JSON.stringify({
        valid: false,
        error: `Ticket has been ${ticket.status}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Ticket checked in", { ticketId: ticket.id });

      // Check for linked reservation (hybrid ticket+reservation flow)
      let linkedReservation = null;
      const linkedReservationId = ticket.ticket_orders?.linked_reservation_id;

      if (linkedReservationId) {
        const { data: resData, error: resError } = await supabaseClient
          .from("reservations")
          .select("party_size, prepaid_min_charge_cents, ticket_credit_cents, seating_type_id")
          .eq("id", linkedReservationId)
          .maybeSingle();

        if (resError) {
          logStep("Linked reservation lookup error", { linkedReservationId, error: resError.message });
        }

        // Only show reservation info for real table reservations (with seating_type_id)
        if (resData && resData.seating_type_id) {
          // Look up correct min charge from seating tiers based on party size
          let tierMinChargeCents: number | null = null;
          const { data: tiers } = await supabaseClient
            .from("seating_type_tiers")
            .select("min_people, max_people, prepaid_min_charge_cents")
            .eq("seating_type_id", resData.seating_type_id)
            .order("min_people", { ascending: true });
          if (tiers) {
            const matchedTier = tiers.find((t: any) => resData.party_size >= t.min_people && resData.party_size <= t.max_people);
            if (matchedTier) tierMinChargeCents = matchedTier.prepaid_min_charge_cents;
          }

          linkedReservation = {
            partySize: resData.party_size,
            minimumChargeCents: resData.prepaid_min_charge_cents ?? tierMinChargeCents ?? 0,
            ticketCreditCents: resData.ticket_credit_cents,
          };
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

          // Only show reservation info for real table reservations (with seating_type_id)
          if (fallbackResData && fallbackResData.seating_type_id) {
            linkedReservation = {
              partySize: fallbackResData.party_size,
              minimumChargeCents: fallbackResData.prepaid_min_charge_cents ?? fallbackResData.ticket_credit_cents,
              ticketCreditCents: fallbackResData.ticket_credit_cents,
            };
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, valid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
