import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
        ticket_orders(customer_name, customer_email),
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
        ticket: {
          id: ticket.id,
          tierName: ticket.ticket_tiers?.name,
          customerName: ticket.ticket_orders?.customer_name,
          eventTitle: ticket.events?.title,
          checkedInAt: ticket.checked_in_at,
          status: ticket.status,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (ticket.status === "cancelled" || ticket.status === "refunded") {
      return new Response(JSON.stringify({
        valid: false,
        error: `Ticket has been ${ticket.status}`,
        ticket: {
          id: ticket.id,
          tierName: ticket.ticket_tiers?.name,
          customerName: ticket.ticket_orders?.customer_name,
          eventTitle: ticket.events?.title,
          status: ticket.status,
        }
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
          customerName: ticket.ticket_orders?.customer_name,
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

    // If action is "checkin", mark ticket as used
    if (action === "checkin") {
      const { error: updateError } = await supabaseClient
        .from("tickets")
        .update({
          status: "used",
          checked_in_at: new Date().toISOString(),
          checked_in_by: staffUserId,
        })
        .eq("id", ticket.id);

      if (updateError) {
        throw new Error("Failed to check in ticket: " + updateError.message);
      }

      logStep("Ticket checked in", { ticketId: ticket.id });

      return new Response(JSON.stringify({
        valid: true,
        checkedIn: true,
        ticket: {
          id: ticket.id,
          tierName: ticket.ticket_tiers?.name,
          tierPrice: ticket.ticket_tiers?.price_cents,
          customerName: ticket.ticket_orders?.customer_name,
          customerEmail: maskEmail(ticket.ticket_orders?.customer_email),
          eventTitle: ticket.events?.title,
          eventStartAt: ticket.events?.start_at,
          status: "used",
          checkedInAt: new Date().toISOString(),
        }
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
