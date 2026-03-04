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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-RESERVATION-EVENT-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    // IMPORTANT: In Deno, signature verification must be async (SubtleCrypto)
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

    // Only process reservation_event type payments
    if (metadata?.type !== "reservation_event") {
      logStep("Not a reservation event payment, skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reservationId = metadata.reservation_id;
    const seatingTypeId = metadata.seating_type_id;

    if (!reservationId) {
      logStep("ERROR: No reservation_id in metadata");
      return new Response("Missing reservation_id", { status: 400 });
    }

    logStep("Processing reservation payment", { reservationId, seatingTypeId });

    try {
      // Get the actual paid amount from Stripe session
      const paidAmountCents = session.amount_total || 0;
      logStep("Payment amount from Stripe", { paidAmountCents });

      // Update reservation to paid and accepted WITH the paid amount
      const { data: reservation, error: updateError } = await supabaseClient
        .from("reservations")
        .update({
          prepaid_charge_status: "paid",
          status: "accepted",
          prepaid_min_charge_cents: paidAmountCents,
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", reservationId)
        .select(`
          *,
          events (
            id,
            title,
            start_at,
            location,
            venue_name,
            business_id,
            businesses (
              id,
              name,
              phone,
              user_id
            )
          )
        `)
        .single();

      if (updateError) {
        logStep("ERROR: Updating reservation", { error: updateError });
        throw updateError;
      }

      logStep("Reservation updated to paid/accepted", { reservationId });

      // Record commission in commission_ledger
      if (paidAmountCents > 0 && reservation.events?.businesses?.id) {
        try {
          const resBusinessId = reservation.events.businesses.id;
          
          // Get commission rate from business subscription plan
          let commissionPercent = 12; // default Free plan rate
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
          } else {
            logStep("Commission recorded in ledger", { 
              amount: commissionAmountCents, 
              percent: commissionPercent, 
              businessId: resBusinessId 
            });
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

      // Get seating type info
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

      // Format date for notifications - ALWAYS use Cyprus timezone
      const formattedDate = new Date(reservation.events?.start_at).toLocaleDateString('el-GR', {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Nicosia'
      });
      const formattedTime = new Date(reservation.events?.start_at).toLocaleTimeString('el-GR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Nicosia'
      });

      // ========== USER NOTIFICATIONS (in-app + push + email) ==========
      logStep("Sending user notifications", { userId: reservation.user_id });

      // 1. User in-app notification
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
        logStep("User in-app notification created");
      } catch (inAppError) {
        logStep("ERROR: User in-app notification", { error: String(inAppError) });
      }

      // 2. User push notification
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

      // 3. User email - PREMIUM DESIGN
      // Use customer_email from checkout metadata first, then profile email
      const customerEmailFromMeta = metadata?.customer_email;
      const userEmail = customerEmailFromMeta || profile?.email;
      if (userEmail) {
        try {
          const qrCodeUrl = reservation.qr_code_token 
            ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=M&data=${encodeURIComponent(reservation.qr_code_token)}&bgcolor=ffffff&color=000000`
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

      // ========== BUSINESS NOTIFICATIONS (in-app + push + email) ==========
      if (businessId && businessUserId) {
        logStep("Sending business notifications", { businessUserId });

        // 1. Business in-app notification
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
          logStep("Business in-app notification created");
        } catch (bizInAppError) {
          logStep("ERROR: Business in-app notification", { error: String(bizInAppError) });
        }

        // 2. Business push notification
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

        // 3. Business email - PREMIUM DESIGN
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const metadata = paymentIntent.metadata;

    if (metadata?.type === "reservation_event" && metadata?.reservation_id) {
      // Update reservation status to indicate payment failed
      await supabaseClient
        .from("reservations")
        .update({
          prepaid_charge_status: "pending",
          status: "pending",
        })
        .eq("id", metadata.reservation_id);

      logStep("Reservation payment failed", { reservationId: metadata.reservation_id });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
