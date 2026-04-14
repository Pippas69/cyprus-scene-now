import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { ensureReservationEventGuestTickets } from "../_shared/reservation-event-tickets.ts";
import {
  wrapPremiumEmail,
  qrCodeSection,
  infoCard,
  detailRow,
  ctaButton,
  successBadge,
  noteBox,
} from "../_shared/email-templates.ts";
import { securityHeaders } from "../_shared/security-headers.ts";
import { z, parseBody, flexId, safeString, optionalString, optionalEmail, positiveInt, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...securityHeaders, "Content-Type": "application/json" },
  });

const makeQrUrl = (token: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=M&data=${encodeURIComponent(token)}&bgcolor=ffffff&color=000000`;

const BodySchema = z.object({
  event_id: flexId,
  guest_name: safeString(200),
  guest_email: z.string().email(),
  guest_phone: optionalString(25),
  guest_city: optionalString(100),
  guest_age: z.number().int().min(0).max(120).optional(),
  min_age: z.number().int().min(0).max(120).optional(),
  party_size: positiveInt.optional(),
  seating_type_id: flexId.optional(),
  invitation_type: z.enum(['ticket', 'reservation', 'walk_in', 'hybrid']),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: securityHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) return json({ error: "User not authenticated" }, 401);

    const body = await parseBody(req, BodySchema);
    const {
      event_id, guest_name, guest_email, guest_phone, guest_city,
      guest_age, min_age, party_size: rawPartySize, seating_type_id, invitation_type,
    } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, start_at, end_at, event_type, business_id, location, venue_name, pay_at_door")
      .eq("id", event_id)
      .single();

    if (eventError || !event) return json({ error: "Event not found" }, 404);

    // Verify business ownership
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, user_id, name")
      .eq("id", event.business_id)
      .single();

    if (bizError || !business) return json({ error: "Business not found" }, 404);
    if (business.user_id !== user.id) return json({ error: "Not authorized" }, 403);

    const partySize = rawPartySize || 1;
    const isReservationType = invitation_type === 'reservation' || invitation_type === 'hybrid';

    // Create invitation record
    const invitationId = crypto.randomUUID();
    const qrCodeToken = crypto.randomUUID();

    let reservationId: string | null = null;
    let ticketOrderId: string | null = null;

    if (isReservationType) {
      // Create a reservation for invitation
      let seatingTypeId = seating_type_id || null;
      if (!seatingTypeId) {
        const { data: st } = await supabase
          .from("reservation_seating_types")
          .select("id")
          .eq("event_id", event_id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        seatingTypeId = st?.id || null;
      }

      const confirmationCode = `INV-${Date.now().toString(36).toUpperCase()}`;

      const { data: reservation, error: resError } = await supabase
        .from("reservations")
        .insert({
          event_id: event.id,
          user_id: user.id,
          reservation_name: guest_name,
          email: guest_email,
          party_size: partySize,
          phone_number: guest_phone || null,
          preferred_time: event.start_at,
          seating_type_id: seatingTypeId,
          prepaid_min_charge_cents: 0,
          prepaid_charge_status: "paid",
          status: "accepted",
          confirmation_code: confirmationCode,
          qr_code_token: qrCodeToken,
          guest_city: guest_city || null,
          guest_ages: min_age ? [min_age] : null,
        })
        .select("id")
        .single();

      if (resError || !reservation) {
        console.error("[send-invitation] reservation insert error", resError);
        return json({ error: "Failed to create reservation" }, 400);
      }

      reservationId = reservation.id;

      // Create guest tickets for QR check-in
      const guests = Array.from({ length: partySize }, (_, i) => ({
        name: i === 0 ? guest_name : `${guest_name} ${i + 1}`,
        age: min_age || null,
      }));

      try {
        await ensureReservationEventGuestTickets({
          supabaseClient: supabase,
          reservationId: reservation.id,
          guests,
          customerEmail: guest_email,
        });
      } catch (e) {
        console.error("[send-invitation] guest tickets failed", e);
      }

      // Decrement seating slots
      if (seatingTypeId) {
        try {
          await supabase.rpc("decrement_seating_slots", { p_seating_type_id: seatingTypeId });
        } catch (e) {
          console.error("[send-invitation] decrement_seating_slots failed", e);
        }
      }
    } else {
      // Ticket-only or Walk-in: create a ticket order + ticket
      const { data: tiers } = await supabase
        .from("ticket_tiers")
        .select("id, price_cents")
        .eq("event_id", event.id)
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .limit(1);

      const tier = tiers?.[0];
      let tierId: string;
      if (!tier) {
        const { data: createdTier, error: tierError } = await supabase
          .from("ticket_tiers")
          .insert({
            event_id: event.id,
            name: "Invitation Entry",
            description: "Auto-created tier for invitation tickets",
            quantity_total: 999999,
            price_cents: 0,
            active: true,
            currency: "eur",
            max_per_order: 50,
            sort_order: 0,
          })
          .select("id, price_cents")
          .single();

        if (tierError) {
          console.error("[send-invitation] tier creation failed", tierError);
          return json({ error: "Failed to setup ticket tier" }, 400);
        }
        tierId = createdTier!.id;
      } else {
        tierId = tier.id;
      }

      // Create ticket order
      const { data: order, error: orderError } = await supabase
        .from("ticket_orders")
        .insert({
          event_id: event.id,
          business_id: event.business_id,
          user_id: user.id,
          customer_name: guest_name,
          customer_email: guest_email,
          status: "completed",
          subtotal_cents: 0,
          commission_cents: 0,
          commission_percent: 0,
          total_cents: 0,
        })
        .select("id")
        .single();

      if (orderError || !order) {
        console.error("[send-invitation] order insert error", orderError);
        return json({ error: "Failed to create ticket order" }, 400);
      }

      ticketOrderId = order.id;

      // Create single ticket
      const { error: ticketError } = await supabase
        .from("tickets")
        .insert({
          order_id: order.id,
          tier_id: tierId,
          event_id: event.id,
          user_id: user.id,
          guest_name: guest_name,
          guest_age: guest_age || null,
          guest_city: guest_city || null,
          status: "valid",
          qr_code_token: qrCodeToken,
        });

      if (ticketError) {
        console.error("[send-invitation] ticket insert error", ticketError);
        return json({ error: "Failed to create ticket" }, 400);
      }
    }

    // Save invitation record
    const { error: invError } = await supabase
      .from("event_invitations")
      .insert({
        id: invitationId,
        event_id: event.id,
        business_id: event.business_id,
        invited_by: user.id,
        guest_name,
        guest_email,
        guest_phone: guest_phone || null,
        guest_city: guest_city || null,
        guest_age: guest_age || null,
        min_age: min_age || null,
        party_size: partySize,
        seating_type_id: seating_type_id || null,
        invitation_type,
        status: "sent",
        reservation_id: reservationId,
        ticket_order_id: ticketOrderId,
        qr_code_token: qrCodeToken,
      });

    if (invError) {
      console.error("[send-invitation] invitation record error", invError);
    }

    // Send email with QR code
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      const eventDate = new Date(event.start_at).toLocaleDateString("el-GR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const venueName = event.venue_name || event.location || "—";

      // Build QR sections based on type
      let qrContent = "";
      
      if (isReservationType && partySize > 1 && reservationId) {
        // Fetch individual ticket QR tokens for multi-person reservations
        const { data: linkedOrder } = await supabase
          .from("ticket_orders")
          .select("id")
          .eq("linked_reservation_id", reservationId)
          .maybeSingle();

        const orderId = linkedOrder?.id;
        let tickets: { qr_code_token: string; guest_name: string }[] = [];

        if (orderId) {
          const { data: tix } = await supabase
            .from("tickets")
            .select("qr_code_token, guest_name")
            .eq("order_id", orderId)
            .order("created_at", { ascending: true });
          tickets = tix || [];
        }

        if (tickets.length > 0) {
          qrContent = tickets.map((t) => {
            const qrUrl = makeQrUrl(t.qr_code_token);
            return `
              <div style="text-align: center; margin-bottom: 24px;">
                <p style="font-size: 13px; color: #64748b; margin: 0 0 8px 0; text-transform: lowercase; font-weight: 500;">${t.guest_name}</p>
                ${qrCodeSection(qrUrl, undefined, 'Δείξε στην είσοδο')}
              </div>
            `;
          }).join("");
        } else {
          // Fallback: single QR
          qrContent = qrCodeSection(makeQrUrl(qrCodeToken), undefined, 'Δείξε στην είσοδο');
        }
      } else {
        qrContent = qrCodeSection(makeQrUrl(qrCodeToken), undefined, 'Δείξε στην είσοδο');
      }

      const detailRows = [
        detailRow("📅 Ημερομηνία", eventDate),
        detailRow("📍 Τοποθεσία", venueName),
        partySize > 1 ? detailRow("👥 Άτομα", `${partySize}`) : "",
      ].filter(Boolean).join("");

      const emailHtml = wrapPremiumEmail(`
        ${successBadge("🎉 Είστε Καλεσμένος!")}
        
        <p style="font-size: 15px; color: #334155; margin: 0 0 4px 0; text-align: center;">
          Το <strong>${business.name}</strong> σας προσκαλεί στην εκδήλωση:
        </p>
        <h2 style="font-size: 22px; color: #0D3B66; margin: 8px 0 20px 0; text-align: center; font-weight: 700;">${event.title}</h2>

        ${infoCard('Λεπτομέρειες', detailRows)}

        <div style="padding: 16px 0; text-align: center;">
          <p style="font-size: 14px; color: #64748b; margin: 0 0 16px 0;">
            ${partySize > 1 && isReservationType
              ? "Δείξτε τα παρακάτω QR codes στην είσοδο — ένα για κάθε άτομο:"
              : "Δείξτε αυτό το QR code στην είσοδο:"}
          </p>
          ${qrContent}
        </div>

        ${noteBox("Κάθε QR code μπορεί να χρησιμοποιηθεί μόνο μία φορά.", "warning")}
      `);

      try {
        await resend.emails.send({
          from: "ΦΟΜΟ <support@fomo.com.cy>",
          to: [guest_email],
          subject: `🎉 Πρόσκληση: ${event.title} — ${business.name}`,
          html: emailHtml,
        });
        console.log("[send-invitation] Email sent to", guest_email);
      } catch (e) {
        console.error("[send-invitation] Email send failed", e);
      }
    }

    return json({
      success: true,
      invitation_id: invitationId,
      reservation_id: reservationId,
      ticket_order_id: ticketOrderId,
      qr_code_token: qrCodeToken,
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    console.error("[send-invitation] ERROR", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
