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
import { ensureReservationEventGuestTickets } from "../_shared/reservation-event-tickets.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-RESERVATION-EVENT-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_RESERVATION_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    logStep("ERROR: Missing signature or webhook secret");
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  const body = await req.text();

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Webhook event verified", { type: event.type });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logStep("ERROR: Webhook signature verification failed", { error: message });
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata?.type !== "reservation_event") {
      logStep("Not a reservation event payment, skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const seatingTypeId = metadata.seating_type_id;
    const eventId = metadata.event_id;
    const userId = metadata.user_id;
    const reservationName = metadata.reservation_name || "Guest";
    const partySize = parseInt(metadata.party_size || "1", 10);
    const phoneNumber = metadata.phone_number || null;
    const preferredTime = metadata.preferred_time || null;
    const specialRequests = metadata.special_requests || null;
    const paidAmountCents = session.amount_total || 0;

    // Check if this session was already processed (idempotency via reservation_id in old flow
    // or via stripe_payment_intent_id in new flow)
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

    if (paymentIntentId) {
      const { data: existingRes } = await supabaseClient
        .from("reservations")
        .select("id")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();

      if (existingRes) {
        logStep("Already processed this payment intent, skipping", { paymentIntentId });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // BACKWARD COMPAT: If reservation_id exists in metadata, this was created by the OLD flow
    // that pre-created the reservation. Update it instead of creating a new one.
    const legacyReservationId = metadata.reservation_id;

    logStep("Processing reservation payment", { eventId, seatingTypeId, legacyReservationId: legacyReservationId || "none" });

    try {
      let reservationId: string;
      let reservation: any;

      if (legacyReservationId) {
        // OLD FLOW: reservation was pre-created, just update it
        const { data: updatedRes, error: updateError } = await supabaseClient
          .from("reservations")
          .update({
            prepaid_charge_status: "paid",
            status: "accepted",
            prepaid_min_charge_cents: paidAmountCents,
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq("id", legacyReservationId)
          .select(`
            *,
            events (
              id, title, start_at, location, venue_name, business_id,
              businesses ( id, name, phone, user_id )
            )
          `)
          .single();

        if (updateError) {
          logStep("ERROR: Updating legacy reservation", { error: updateError });
          throw updateError;
        }

        reservationId = legacyReservationId;
        reservation = updatedRes;
      } else {
        // NEW FLOW: Create the reservation now that payment succeeded
        const confirmationCode = `RES-${Date.now().toString(36).toUpperCase()}`;
        const qrCodeToken = crypto.randomUUID();

        const { data: newRes, error: insertError } = await supabaseClient
          .from("reservations")
          .insert({
            event_id: eventId,
            user_id: userId,
            reservation_name: reservationName,
            party_size: partySize,
            phone_number: phoneNumber,
            preferred_time: preferredTime,
            special_requests: specialRequests,
            seating_type_id: seatingTypeId,
            prepaid_min_charge_cents: paidAmountCents,
            prepaid_charge_status: "paid",
            status: "accepted",
            confirmation_code: confirmationCode,
            qr_code_token: qrCodeToken,
            stripe_payment_intent_id: paymentIntentId,
          })
          .select(`
            *,
            events (
              id, title, start_at, location, venue_name, business_id,
              businesses ( id, name, phone, user_id )
            )
          `)
          .single();

        if (insertError || !newRes) {
          logStep("ERROR: Creating reservation after payment", { error: insertError });
          throw insertError || new Error("Failed to create reservation");
        }

        reservationId = newRes.id;
        reservation = newRes;
      }

      logStep("Reservation confirmed", { reservationId });

      // Record commission
      if (paidAmountCents > 0 && reservation.events?.businesses?.id) {
        try {
          const resBusinessId = reservation.events.businesses.id;
          let commissionPercent = 12;
          const { data: subscription } = await supabaseClient
            .from("business_subscriptions")
            .select("plan_id, subscription_plans(slug)")
            .eq("business_id", resBusinessId)
            .eq("status", "active")
            .single();

          if (subscription?.subscription_plans) {
            const planSlug = (subscription.subscription_plans as any).slug;
            const rateMap: Record<string, number> = { free: 12, basic: 10, pro: 8, elite: 6 };
            commissionPercent = rateMap[planSlug] ?? 12;
          }

          const commissionAmountCents = Math.round(paidAmountCents * commissionPercent / 100);
          const { error: ledgerError } = await supabaseClient
            .from("commission_ledger")
            .insert({
              source_type: 'reservation',
              business_id: resBusinessId,
              reservation_id: reservationId,
              original_price_cents: paidAmountCents,
              commission_percent: commissionPercent,
              commission_amount_cents: commissionAmountCents,
              status: 'pending',
              redeemed_at: new Date().toISOString(),
            });

          if (ledgerError) {
            logStep("Commission ledger insert error", { error: ledgerError.message });
          }
        } catch (commErr) {
          logStep("Commission ledger error", { error: commErr instanceof Error ? commErr.message : String(commErr) });
        }
      }

      // Decrement seating slots
      if (seatingTypeId) {
        const { error: decrementError } = await supabaseClient
          .rpc("decrement_seating_slots", { p_seating_type_id: seatingTypeId });

        if (decrementError) {
          logStep("ERROR: Decrementing seating slots", { error: decrementError });
        } else {
          logStep("Seating slots decremented", { seatingTypeId });
        }
      }

      // Create guest tickets for QR check-in
      try {
        const createdTickets = await ensureReservationEventGuestTickets({
          supabaseClient,
          reservationId,
          paymentIntentId,
          session: {
            id: session.id,
            metadata: metadata as Record<string, string | undefined> | null | undefined,
            customer_details: { email: session.customer_details?.email ?? null },
          },
        });
        logStep("Reservation guest tickets ensured", { reservationId, createdTickets });
      } catch (guestErr) {
        logStep("ERROR: Guest tickets creation", { error: guestErr instanceof Error ? guestErr.message : String(guestErr) });
      }

      // Get seating type info for notifications
      let seatingTypeName = "";
      let dressCode = "";
      if (seatingTypeId) {
        const { data: seatingType } = await supabaseClient
          .from("reservation_seating_types")
          .select("seating_type, dress_code, no_show_policy")
          .eq("id", seatingTypeId)
          .single();

        if (seatingType) {
          const seatingTypeLabels: Record<string, string> = {
            bar: "Bar",
            table: "Table",
            vip: "VIP",
            sofa: "Sofa",
          };
          seatingTypeName = seatingTypeLabels[seatingType.seating_type] || seatingType.seating_type;
          dressCode = seatingType.dress_code || "";
        }
      }

      // Get user profile
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email, name")
        .eq("id", reservation.user_id)
        .single();

      const businessId = reservation.events?.businesses?.id;
      const businessUserId = reservation.events?.businesses?.user_id;
      const businessName = reservation.events?.businesses?.name || '';

      const formattedDate = new Date(reservation.events?.start_at).toLocaleDateString('el-GR', {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Nicosia'
      });
      const formattedTime = new Date(reservation.events?.start_at).toLocaleTimeString('el-GR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Nicosia'
      });

      // ========== USER NOTIFICATIONS ==========
      logStep("Sending user notifications", { userId: reservation.user_id });

      try {
        await supabaseClient.from('notifications').insert({
          user_id: reservation.user_id,
          title: '✅ Κράτηση επιβεβαιώθηκε!',
          message: `${reservation.events?.title || 'Εκδήλωση'} • ${formattedDate} ${formattedTime}`,
          type: 'reservation',
          event_type: 'reservation_confirmed',
          entity_type: 'reservation',
          entity_id: reservationId,
          deep_link: '/dashboard-user/reservations',
          delivered_at: new Date().toISOString(),
        });
      } catch (inAppError) {
        logStep("ERROR: User in-app notification", { error: String(inAppError) });
      }

      try {
        const userPushPayload: PushPayload = {
          title: '✅ Κράτηση επιβεβαιώθηκε!',
          body: `${reservation.events?.title || 'Εκδήλωση'} • ${formattedDate} ${formattedTime}`,
          icon: '/fomo-logo-new.png',
          badge: '/fomo-logo-new.png',
          tag: `reservation-confirmed-${reservationId}`,
          data: {
            url: '/dashboard-user/reservations',
            type: 'reservation_confirmed',
            entityType: 'reservation',
            entityId: reservationId,
          },
        };
        const userPushResult = await sendEncryptedPush(reservation.user_id, userPushPayload, supabaseClient);
        logStep("User push notification sent", userPushResult);
      } catch (pushError) {
        logStep("ERROR: User push notification", { error: String(pushError) });
      }

      // User email
      const customerEmailFromMeta = metadata?.customer_email;
      const userEmail = customerEmailFromMeta || profile?.email;
      if (userEmail) {
        try {
          const qrCodeUrl = reservation.qr_code_token
            ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=M&data=${encodeURIComponent(reservation.qr_code_token)}&bgcolor=ffffff&color=000000`
            : null;

          const userName = profile?.name || reservation.reservation_name || 'φίλε';
          const eventTitle = reservation.events?.title || 'Εκδήλωση';
          const eventLocation = reservation.events?.location || reservation.events?.venue_name || '';
          const paidAmount = ((reservation.prepaid_min_charge_cents || 0) / 100).toFixed(2);

          const userContent = `
            ${successBadge('Κράτηση Επιβεβαιώθηκε')}
            ${emailGreeting(userName)}
            
            <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
              Η πληρωμή ολοκληρώθηκε και η κράτησή σου επιβεβαιώθηκε!
            </p>

            ${eventHeader(eventTitle, businessName)}

            ${infoCard('Κράτηση Εκδήλωσης',
              detailRow('Ημερομηνία', formattedDate) +
              detailRow('Ώρα', formattedTime) +
              (eventLocation ? detailRow('Τοποθεσία', eventLocation) : '') +
              detailRow('Όνομα', reservation.reservation_name) +
              detailRow('Άτομα', `${reservation.party_size}`) +
              (seatingTypeName ? detailRow('Θέση', seatingTypeName) : '') +
              (dressCode ? detailRow('Dress Code', dressCode) : '') +
              detailRow('Πληρωμένο', `€${paidAmount}`, true)
            )}

            ${qrCodeUrl ? qrCodeSection(qrCodeUrl, reservation.confirmation_code, 'Δείξε στην είσοδο') : ''}

            ${ctaButton('Οι κρατήσεις μου', 'https://fomo.com.cy/dashboard-user?tab=reservations')}
          `;

          const userEmailHtml = wrapPremiumEmail(userContent, '✓ Κράτηση Εκδήλωσης');

          await resend.emails.send({
            from: "ΦΟΜΟ <support@fomo.com.cy>",
            to: [userEmail],
            subject: `✓ Κράτηση επιβεβαιώθηκε - ${eventTitle}`,
            html: userEmailHtml,
          });
          logStep("User email sent", { email: userEmail });
        } catch (emailError) {
          logStep("ERROR: User email", { error: String(emailError) });
        }
      }

      // ========== BUSINESS NOTIFICATIONS ==========
      if (businessId && businessUserId) {
        logStep("Sending business notifications", { businessUserId });

        try {
          await supabaseClient.from('notifications').insert({
            user_id: businessUserId,
            title: '🎉 Νέα πληρωμένη κράτηση!',
            message: `${reservation.reservation_name} - ${reservation.party_size} άτομα • ${reservation.events?.title}`,
            type: 'business',
            event_type: 'new_reservation_event',
            entity_type: 'reservation',
            entity_id: reservationId,
            deep_link: '/dashboard-business/reservations',
            delivered_at: new Date().toISOString(),
          });
        } catch (bizInAppError) {
          logStep("ERROR: Business in-app notification", { error: String(bizInAppError) });
        }

        try {
          const bizPushPayload: PushPayload = {
            title: '🎉 Νέα πληρωμένη κράτηση!',
            body: `${reservation.reservation_name} - ${reservation.party_size} άτομα • ${reservation.events?.title}`,
            icon: '/fomo-logo-new.png',
            badge: '/fomo-logo-new.png',
            tag: `biz-reservation-${reservationId}`,
            data: {
              url: '/dashboard-business/reservations',
              type: 'new_reservation_event',
              entityType: 'reservation',
              entityId: reservationId,
            },
          };
          const bizPushResult = await sendEncryptedPush(businessUserId, bizPushPayload, supabaseClient);
          logStep("Business push notification sent", bizPushResult);
        } catch (bizPushError) {
          logStep("ERROR: Business push notification", { error: String(bizPushError) });
        }

        try {
          const { data: bizProfile } = await supabaseClient
            .from("profiles")
            .select("email")
            .eq("id", businessUserId)
            .single();

          if (bizProfile?.email) {
            const eventTitle = reservation.events?.title || 'Εκδήλωση';
            const paidAmount = ((reservation.prepaid_min_charge_cents || 0) / 100).toFixed(2);

            const bizContent = `
              ${successBadge('Νέα Κράτηση Εκδήλωσης')}
              
              <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
                Νέα πληρωμένη κράτηση για την εκδήλωση <strong>${eventTitle}</strong>.
              </p>

              ${infoCard('Λεπτομέρειες Κράτησης',
                detailRow('Πελάτης', reservation.reservation_name) +
                detailRow('Ημερομηνία', formattedDate) +
                detailRow('Ώρα', formattedTime) +
                detailRow('Άτομα', `${reservation.party_size}`) +
                (seatingTypeName ? detailRow('Θέση', seatingTypeName) : '') +
                (reservation.phone_number ? detailRow('Τηλέφωνο', reservation.phone_number) : '') +
                (reservation.special_requests ? detailRow('Σημειώσεις', reservation.special_requests) : '') +
                detailRow('Πληρωμένο', `€${paidAmount}`, true) +
                detailRow('Κωδικός', reservation.confirmation_code, true)
              )}

              ${noteBox(`Κράτηση από εκδήλωση: ${eventTitle}`, 'info')}

              ${ctaButton('Διαχείριση Κρατήσεων', 'https://fomo.com.cy/dashboard-business/reservations')}
            `;

            const bizEmailHtml = wrapBusinessEmail(bizContent, '🎟️ Κράτηση Εκδήλωσης');

            await resend.emails.send({
              from: "ΦΟΜΟ <support@fomo.com.cy>",
              to: [bizProfile.email],
              subject: `🎟️ Νέα Κράτηση Εκδήλωσης: ${reservation.reservation_name}`,
              html: bizEmailHtml,
            });
            logStep("Business email sent", { email: bizProfile.email });
          }
        } catch (bizEmailError) {
          logStep("ERROR: Business email", { error: String(bizEmailError) });
        }
      }

      logStep("Reservation processing complete", { reservationId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logStep("ERROR: Processing reservation payment", { error: message });
      return new Response(JSON.stringify({ error: message }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
  }

  // payment_intent.payment_failed — nothing to clean up in new flow since no reservation exists yet
  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const metadata = paymentIntent.metadata;

    if (metadata?.type === "reservation_event" && metadata?.reservation_id) {
      // Legacy: old flow had a pre-created reservation
      await supabaseClient
        .from("reservations")
        .update({ status: "cancelled", prepaid_charge_status: "failed" })
        .eq("id", metadata.reservation_id);

      logStep("Legacy reservation cancelled on payment failure", { reservationId: metadata.reservation_id });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...securityHeaders, "Content-Type": "application/json" },
  });
});
