import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendEncryptedPush, PushPayload } from "../_shared/web-push-crypto.ts";
import {
  wrapPremiumEmail,
  wrapBusinessEmail,
  emailGreeting,
  infoCard,
  detailRow,
  qrCodeSection,
  successBadge,
  ctaButton,
  eventHeader,
  noteBox,
} from "../_shared/email-templates.ts";
import {
  ensureReservationEventGuestTickets,
  buildReservationGuestsFromMetadata,
} from "../_shared/reservation-event-tickets.ts";
import { securityHeaders } from "../_shared/security-headers.ts";

const log = (s: string, d?: unknown) =>
  console.log(`[PROCESS-ADD-GUESTS] ${s}`, d ? JSON.stringify(d) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: securityHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.json();
    let reservationId: string | null = null;
    let extraGuests = 0;
    let extraChargeCents = 0;
    let ticketsExtraCreditCents = 0;
    let newPartySize: number | null = null;
    let newCharge: number | null = null;
    let session: Stripe.Checkout.Session | null = null;

    if (body.session_id) {
      session = await stripe.checkout.sessions.retrieve(body.session_id);
      const md = session.metadata || {};
      if (md.type !== "add_guests") {
        return new Response(JSON.stringify({ skipped: true }), {
          headers: { ...securityHeaders, "Content-Type": "application/json" },
        });
      }
      reservationId = md.reservation_id || null;
      extraGuests = parseInt(md.extra_guests || "0", 10);
      extraChargeCents = parseInt(md.extra_charge_cents || "0", 10);
      ticketsExtraCreditCents = parseInt(md.tickets_extra_credit_cents || "0", 10);
      newPartySize = parseInt(md.new_party_size || "0", 10) || null;
      newCharge = parseInt(md.new_prepaid_charge_cents || "0", 10) || null;
    } else {
      // Free path direct invoke
      reservationId = body.reservation_id;
      extraGuests = body.extra_guests || 0;
      extraChargeCents = body.extra_charge_cents || 0;
      ticketsExtraCreditCents = body.tickets_extra_credit_cents || 0;
    }

    if (!reservationId) throw new Error("Missing reservation_id");
    log("Processing", { reservationId, extraGuests, extraChargeCents });

    // Idempotency: if paid, check if we already updated
    const paymentIntentId =
      session && typeof session.payment_intent === "string" ? session.payment_intent : null;

    // Load reservation with event/business
    const { data: reservation, error: resErr } = await supabase
      .from("reservations")
      .select(`
        id, user_id, event_id, business_id, party_size, seating_type_id,
        prepaid_min_charge_cents, ticket_credit_cents, reservation_name, phone_number, special_requests,
        confirmation_code, email,
        events ( id, title, start_at, location, venue_name, businesses ( id, name, user_id ) )
      `)
      .eq("id", reservationId)
      .single();
    if (resErr || !reservation) throw new Error("Reservation not found");

    // PAID PATH — apply update + tickets
    if (session) {
      // Idempotency: have we already added this batch's tickets?
      // Look for an existing add-guests order with this exact session_id.
      const { data: dupOrder } = await supabase
        .from("ticket_orders")
        .select("id")
        .eq("linked_reservation_id", reservationId)
        .eq("stripe_checkout_session_id", session.id)
        .maybeSingle();

      if (dupOrder?.id) {
        log("Already processed (order exists for this session)", { sessionId: session.id });
        return new Response(JSON.stringify({ already_processed: true }), {
          headers: { ...securityHeaders, "Content-Type": "application/json" },
        });
      }

      const targetCount = (newPartySize || (reservation.party_size + extraGuests));

      // Compute new ticket_credit_cents (only the prepaid portion of new tickets adds to credit).
      // Backward-compat: if metadata didn't carry it, fall back to extraChargeCents (legacy behavior).
      const creditDelta = ticketsExtraCreditCents > 0
        ? ticketsExtraCreditCents
        : (extraChargeCents > 0 ? extraChargeCents : 0);
      const newTicketCreditCents = (reservation.ticket_credit_cents || 0) + creditDelta;

      // Update reservation party_size + min charge + ticket_credit_cents
      const { error: updErr } = await supabase
        .from("reservations")
        .update({
          party_size: targetCount,
          prepaid_min_charge_cents: newCharge ?? reservation.prepaid_min_charge_cents,
          ticket_credit_cents: newTicketCreditCents,
        })
        .eq("id", reservationId);
      if (updErr) throw updErr;

      log("Updated reservation totals", {
        targetCount, newCharge, creditDelta, newTicketCreditCents,
        prevCredit: reservation.ticket_credit_cents,
      });

      // Add new guest tickets from session metadata in a NEW dedicated order,
      // so totals sum properly across all add-guests batches.
      const newGuests = buildReservationGuestsFromMetadata(
        session.metadata as any,
        reservation.reservation_name || "Guest",
        extraGuests,
      ).slice(0, extraGuests);

      // Resolve the tier_id of the existing reservation tickets so the
      // new add-guests tickets inherit the SAME ticket_tier (name + price).
      // Without this, the helper picks the first active tier of the event,
      // which causes the check-in success dialog to show e.g. "Bar" instead
      // of "Τραπέζι" for the newly added guests.
      let inheritedTierId: string | null = null;
      const { data: existingOrder } = await supabase
        .from("ticket_orders")
        .select("id")
        .eq("linked_reservation_id", reservationId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (existingOrder?.id) {
        const { data: existingTicket } = await supabase
          .from("tickets")
          .select("tier_id")
          .eq("order_id", existingOrder.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        inheritedTierId = existingTicket?.tier_id ?? null;
      }

      await ensureReservationEventGuestTickets({
        supabaseClient: supabase,
        reservationId,
        paymentIntentId,
        session: { id: session.id, metadata: session.metadata as any },
        guests: newGuests,
        customerEmail: reservation.email || (session.metadata as any)?.customer_email || null,
        forceNewOrder: true,
        orderSubtotalCents: extraChargeCents,
        orderTotalCents: extraChargeCents,
        tierIdOverride: inheritedTierId,
      });
    }

    // Reload reservation after update
    const { data: full } = await supabase
      .from("reservations")
      .select(`
        id, user_id, event_id, business_id, party_size, prepaid_min_charge_cents,
        reservation_name, confirmation_code, email,
        events ( id, title, start_at, location, venue_name, businesses ( id, name, user_id ) )
      `)
      .eq("id", reservationId)
      .single();
    if (!full) throw new Error("Reload reservation failed");

    const event = (full as any).events;
    const business = event?.businesses;
    const businessUserId = business?.user_id;
    const eventTitle = event?.title || "Εκδήλωση";
    const formattedDate = event?.start_at
      ? new Date(event.start_at).toLocaleDateString("el-GR", {
          weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Nicosia",
        })
      : "";
    const formattedTime = event?.start_at
      ? new Date(event.start_at).toLocaleTimeString("el-GR", {
          hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Nicosia",
        })
      : "";

    // Fetch ALL guest QR codes — event tickets first, fallback to reservation_guests (direct)
    const { data: allOrders } = await supabase
      .from("ticket_orders")
      .select("id")
      .eq("linked_reservation_id", reservationId);
    const allOrderIds = (allOrders || []).map((o: any) => o.id);
    let allTickets: { guest_name: string; qr_code_token: string }[] = [];
    if (allOrderIds.length > 0) {
      const { data: tks } = await supabase
        .from("tickets")
        .select("guest_name, qr_code_token, created_at")
        .in("order_id", allOrderIds)
        .order("created_at", { ascending: true });
      allTickets = (tks || []).filter((t: any) => !!t.qr_code_token);
    }
    if (allTickets.length === 0) {
      // Direct reservation fallback
      const { data: dg } = await supabase
        .from("reservation_guests")
        .select("guest_name, qr_code_token, created_at")
        .eq("reservation_id", reservationId)
        .order("created_at", { ascending: true });
      allTickets = (dg || []).filter((g: any) => !!g.qr_code_token);
    }

    // ===== USER EMAIL (with all QR codes) =====
    const userEmail = full.email || (session?.metadata as any)?.customer_email;
    if (userEmail && allTickets && allTickets.length > 0) {
      try {
        const allGuestQrSections = allTickets
          .filter((t: any) => !!t.qr_code_token)
          .map((t: any, idx: number) => {
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=M&data=${encodeURIComponent(t.qr_code_token)}&bgcolor=ffffff&color=000000`;
            return `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 8px 0;">
                <tr><td align="center" style="padding-bottom:4px;">
                  <span style="color:#334155;font-size:13px;">${t.guest_name || `Καλεσμένος ${idx + 1}`}</span>
                </td></tr>
              </table>
              ${qrCodeSection(url, full.confirmation_code, "Δείξε στην είσοδο")}
            `;
          })
          .join("");

        const paidLabel = extraChargeCents > 0 ? `€${(extraChargeCents / 100).toFixed(2)}` : "Χωρίς επιπλέον online χρέωση";
        // Optional split: only show when meaningful (paid online + has table credit portion)
        const creditLabel = (extraChargeCents > 0 && ticketsExtraCreditCents > 0 && ticketsExtraCreditCents < extraChargeCents)
          ? `€${(ticketsExtraCreditCents / 100).toFixed(2)} (από τα €${(extraChargeCents / 100).toFixed(2)})`
          : null;

        const userContent = `
          ${successBadge("Άτομα Προστέθηκαν")}
          ${emailGreeting(full.reservation_name || "")}

          <p style="color:#334155;font-size:14px;margin:0 0 16px 0;line-height:1.6;">
            Προστέθηκαν <strong>${extraGuests}</strong> ${extraGuests === 1 ? "άτομο" : "άτομα"} στην κράτησή σου. Όλα τα QR codes παρακάτω.
          </p>

          ${eventHeader(eventTitle, business?.name || "")}

          ${infoCard("Ενημερωμένη Κράτηση",
            detailRow("Ημερομηνία", formattedDate) +
            detailRow("Ώρα", formattedTime) +
            detailRow("Όνομα", full.reservation_name) +
            detailRow("Σύνολο ατόμων", `${full.party_size}`) +
            detailRow("Επιπλέον χρέωση", paidLabel, true) +
            (creditLabel ? detailRow("Πίστωση τραπεζιού", creditLabel) : "")
          )}

          ${allGuestQrSections}

          ${ctaButton("Οι κρατήσεις μου", "https://fomo.com.cy/dashboard-user?tab=reservations&subtab=event")}
        `;
        const html = wrapPremiumEmail(userContent, "Ενημέρωση Κράτησης");

        await resend.emails.send({
          from: "ΦΟΜΟ <support@fomo.com.cy>",
          to: [userEmail],
          subject: `Ενημέρωση κράτησης - ${eventTitle}`,
          html,
        });
        log("User email sent", { to: userEmail });
      } catch (e) {
        log("ERROR user email", { e: String(e) });
      }
    }

    // ===== USER PUSH + IN-APP =====
    try {
      await supabase.from("notifications").insert({
        user_id: full.user_id,
        title: "Άτομα προστέθηκαν",
        message: `+${extraGuests} ${extraGuests === 1 ? "άτομο" : "άτομα"} στο ${eventTitle}`,
        type: "reservation",
        event_type: "reservation_guests_added",
        entity_type: "reservation",
        entity_id: reservationId,
        deep_link: "/dashboard-user?tab=reservations&subtab=event",
        delivered_at: new Date().toISOString(),
      });
    } catch {}
    try {
      const push: PushPayload = {
        title: "Η κράτησή σου ενημερώθηκε",
        body: `+${extraGuests} ${extraGuests === 1 ? "άτομο" : "άτομα"} • ${eventTitle}`,
        icon: "/fomo-logo-new.png",
        badge: "/fomo-logo-new.png",
        tag: `reservation-add-${reservationId}`,
        data: { url: "/dashboard-user?tab=reservations&subtab=event", type: "reservation_guests_added" },
      };
      await sendEncryptedPush(full.user_id, push, supabase);
    } catch {}

    // ===== BUSINESS NOTIFICATIONS =====
    if (businessUserId) {
      try {
        await supabase.from("notifications").insert({
          user_id: businessUserId,
          title: "Ενημέρωση κράτησης",
          message: `${full.reservation_name}: +${extraGuests} ${extraGuests === 1 ? "άτομο" : "άτομα"} (σύνολο ${full.party_size})`,
          type: "business",
          event_type: "reservation_guests_added",
          entity_type: "reservation",
          entity_id: reservationId,
          deep_link: "/dashboard-business/reservations",
          delivered_at: new Date().toISOString(),
        });
      } catch {}
      try {
        const bizPush: PushPayload = {
          title: `Προστέθηκαν +${extraGuests} άτομα`,
          body: `${full.reservation_name} • ${eventTitle} (σύνολο ${full.party_size})`,
          icon: "/fomo-logo-new.png",
          badge: "/fomo-logo-new.png",
          tag: `biz-reservation-add-${reservationId}`,
          data: { url: "/dashboard-business/reservations", type: "reservation_guests_added" },
        };
        await sendEncryptedPush(businessUserId, bizPush, supabase);
      } catch {}

      try {
        const { data: bizProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", businessUserId)
          .single();
        if (bizProfile?.email) {
          const paidLabel = extraChargeCents > 0 ? `€${(extraChargeCents / 100).toFixed(2)}` : "—";
          const bizContent = `
            ${successBadge("Ενημέρωση Κράτησης")}
            <p style="color:#334155;font-size:14px;margin:0 0 16px 0;line-height:1.6;">
              Ο πελάτης πρόσθεσε επιπλέον άτομα στην κράτησή του.
            </p>
            ${infoCard("Ενημερωμένη Κράτηση",
              detailRow("Πελάτης", full.reservation_name) +
              detailRow("Εκδήλωση", eventTitle) +
              detailRow("Ημερομηνία", formattedDate) +
              detailRow("Ώρα", formattedTime) +
              detailRow("Επιπλέον άτομα", `+${extraGuests}`) +
              detailRow("Σύνολο ατόμων", `${full.party_size}`, true) +
              detailRow("Επιπλέον προπληρωμή", paidLabel)
            )}
            ${noteBox("Τα νέα QR codes έχουν αποσταλεί στον πελάτη.", "info")}
            ${ctaButton("Διαχείριση Κρατήσεων", "https://fomo.com.cy/dashboard-business/reservations")}
          `;
          const html = wrapBusinessEmail(bizContent, "Ενημέρωση Κράτησης");
          await resend.emails.send({
            from: "ΦΟΜΟ <support@fomo.com.cy>",
            to: [bizProfile.email],
            subject: `Ενημέρωση κράτησης - ${eventTitle}`,
            html,
          });
          log("Business email sent");
        }
      } catch (e) {
        log("ERROR biz email", { e: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
