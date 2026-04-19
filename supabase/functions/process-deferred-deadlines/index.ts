import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { sendPushIfEnabled, type PushPayload } from "../_shared/web-push-crypto.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {

    // Auth guard: only service_role or internal calls allowed
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader || !serviceKey || authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const now = new Date().toISOString();
    let processed = 0;
    let errors = 0;
    let retried = 0;

    // Helper: attempt to charge cancellation fee
    async function chargeCancellationFee(reservation: any, event: any, business: any): Promise<boolean> {
      const cancellationFeePercent = event?.deferred_cancellation_fee_percent || 50;
      const cancellationFeeCents = Math.round(reservation.prepaid_min_charge_cents * (cancellationFeePercent / 100));

      if (reservation.deferred_payment_mode === "auth_hold") {
        if (!reservation.stripe_payment_intent_id) return false;
        await stripe.paymentIntents.capture(reservation.stripe_payment_intent_id, {
          amount_to_capture: cancellationFeeCents,
        });
        console.log(`[DEFERRED-CRON] Partial capture ${cancellationFeeCents}c from PI ${reservation.stripe_payment_intent_id}`);
        return true;
      }

      if (reservation.deferred_payment_mode === "setup_intent") {
        if (!reservation.stripe_setup_intent_id) return false;
        const setupIntent = await stripe.setupIntents.retrieve(reservation.stripe_setup_intent_id);
        const paymentMethodId = setupIntent.payment_method as string;
        const customerId = setupIntent.customer as string;
        if (!paymentMethodId || !customerId) return false;

        const hasConnectSetup = !!(business?.stripe_account_id && business?.stripe_onboarding_completed);

        const { data: sub } = await supabase
          .from("business_subscriptions")
          .select("*, subscription_plans(*)")
          .eq("business_id", event.business_id)
          .eq("status", "active")
          .maybeSingle();

        const planSlug = sub?.subscription_plans?.slug || "free";
        const { data: commissionRate } = await supabase
          .from("ticket_commission_rates")
          .select("commission_percent")
          .eq("plan_slug", planSlug)
          .single();

        const commissionPercent = commissionRate?.commission_percent ?? 12;
        const platformFeeCents = Math.round(cancellationFeeCents * (commissionPercent / 100));

        const piParams: any = {
          amount: cancellationFeeCents,
          currency: "eur",
          customer: customerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          description: `Cancellation fee for ${event.title} - ${reservation.reservation_name}`,
          metadata: {
            type: "deferred_cancellation_fee",
            reservation_id: reservation.id,
            event_id: event.id,
            business_id: business?.id ?? "",
          },
        };

        if (hasConnectSetup) {
          // Stripe processing fees: 2.9% + €0.25 — charged to connected account
          const stripeFeesCents = Math.ceil(cancellationFeeCents * 0.029 + 25);
          piParams.application_fee_amount = platformFeeCents + stripeFeesCents;
          piParams.transfer_data = { destination: business.stripe_account_id };
        }

        await stripe.paymentIntents.create(piParams);
        console.log(`[DEFERRED-CRON] Charged cancellation fee ${cancellationFeeCents}c for reservation ${reservation.id}`);
        return true;
      }

      return false;
    }

    // ─── 1. Process newly expired deferred reservations ───
    const { data: expiredReservations, error: fetchError } = await supabase
      .from("reservations")
      .select(`
        *, events (
          id, title, start_at, business_id, deferred_cancellation_fee_percent,
          businesses (id, name, stripe_account_id, stripe_onboarding_completed, user_id)
        )
      `)
      .eq("deferred_status", "awaiting_confirmation")
      .lt("deferred_confirmation_deadline", now);

    if (fetchError) throw fetchError;
    console.log(`[DEFERRED-CRON] Found ${expiredReservations?.length || 0} expired deferred reservations`);

    for (const reservation of (expiredReservations || [])) {
      try {
        const event = reservation.events;
        const business = event?.businesses;
        const cancellationFeePercent = event?.deferred_cancellation_fee_percent || 50;
        const cancellationFeeCents = Math.round(reservation.prepaid_min_charge_cents * (cancellationFeePercent / 100));
        const feeFormatted = `€${(cancellationFeeCents / 100).toFixed(2)}`;

        let chargeSuccess = false;
        try {
          chargeSuccess = await chargeCancellationFee(reservation, event, business);
        } catch (chargeErr: any) {
          console.error(`[DEFERRED-CRON] Charge failed for ${reservation.id}:`, chargeErr.message);
        }

        if (chargeSuccess) {
          // Charge succeeded → mark auto_charged
          await supabase.from("reservations").update({
            deferred_status: "auto_charged",
            status: "cancelled",
            prepaid_charge_status: "partial",
          }).eq("id", reservation.id);

          // Notify user
          await supabase.from("notifications").insert({
            user_id: reservation.user_id,
 title: `️ Χρέωση Ακύρωσης`,
            message: `Η κράτησή σας για ${event.title} δεν επιβεβαιώθηκε εγκαίρως. Χρεώθηκε τέλος ακύρωσης ${feeFormatted}.`,
            type: "personal",
            event_type: "reservation_auto_charged",
            entity_type: "reservation",
            entity_id: reservation.id,
            deep_link: "/dashboard-user?tab=reservations",
            read: false,
            delivered_at: new Date().toISOString(),
          });

          await sendPushIfEnabled(reservation.user_id, {
 title: "️ Χρέωση Ακύρωσης",
            body: `Η κράτησή σας για ${event.title} δεν επιβεβαιώθηκε. Χρεώθηκε ${feeFormatted}.`,
            icon: "/fomo-logo-new.png",
            badge: "/fomo-logo-new.png",
            tag: `deferred-auto-charged:${reservation.id}`,
            data: { url: "/dashboard-user?tab=reservations", type: "reservation_auto_charged" },
          }, supabase);

          // Notify business
          if (business?.user_id) {
            await supabase.from("notifications").insert({
              user_id: business.user_id,
 title: `Μη Επιβεβαιωμένη Κράτηση`,
              message: `Ο/Η ${reservation.reservation_name} δεν επιβεβαίωσε για ${event.title}. Χρεώθηκε τέλος ακύρωσης ${feeFormatted}.`,
              type: "personal",
              event_type: "reservation_auto_charged",
              entity_type: "reservation",
              entity_id: reservation.id,
              deep_link: "/dashboard-business/reservations",
              read: false,
              delivered_at: new Date().toISOString(),
            });
          }
        } else {
          // Charge failed → mark payment_failed, retry later
          await supabase.from("reservations").update({
            deferred_status: "payment_failed",
            deferred_retry_count: 1,
          }).eq("id", reservation.id);

          // Notify user their card was declined
          await sendPushIfEnabled(reservation.user_id, {
 title: "Αποτυχία Χρέωσης",
            body: `Η κάρτα σας απορρίφθηκε για το τέλος ακύρωσης (${feeFormatted}). Θα γίνει νέα προσπάθεια.`,
            icon: "/fomo-logo-new.png",
            badge: "/fomo-logo-new.png",
            tag: `deferred-payment-failed:${reservation.id}`,
            data: { url: "/dashboard-user?tab=reservations", type: "payment_failed" },
          }, supabase);
        }

        // Release slot
        if (reservation.seating_type_id) {
          await supabase.rpc("release_reservation_slot", {
            p_seating_type_id: reservation.seating_type_id,
          }).catch(() => {
            console.log("[DEFERRED-CRON] release_reservation_slot RPC not found, skipping");
          });
        }

        processed++;
      } catch (innerErr) {
        console.error(`[DEFERRED-CRON] Error processing reservation ${reservation.id}:`, innerErr);
        errors++;
      }
    }

    // ─── 2. Retry payment_failed reservations (up to 3 attempts) ───
    const { data: failedReservations } = await supabase
      .from("reservations")
      .select(`
        *, events (
          id, title, start_at, business_id, deferred_cancellation_fee_percent,
          businesses (id, name, stripe_account_id, stripe_onboarding_completed, user_id)
        )
      `)
      .eq("deferred_status", "payment_failed")
      .lt("deferred_retry_count", 3);

    console.log(`[DEFERRED-CRON] Found ${failedReservations?.length || 0} payment_failed reservations to retry`);

    for (const reservation of (failedReservations || [])) {
      try {
        const event = reservation.events;
        const business = event?.businesses;
        const retryCount = (reservation.deferred_retry_count || 0) + 1;

        let chargeSuccess = false;
        try {
          chargeSuccess = await chargeCancellationFee(reservation, event, business);
        } catch (chargeErr: any) {
          console.error(`[DEFERRED-CRON] Retry ${retryCount} failed for ${reservation.id}:`, chargeErr.message);
        }

        if (chargeSuccess) {
          const cancellationFeePercent = event?.deferred_cancellation_fee_percent || 50;
          const cancellationFeeCents = Math.round(reservation.prepaid_min_charge_cents * (cancellationFeePercent / 100));
          const feeFormatted = `€${(cancellationFeeCents / 100).toFixed(2)}`;

          await supabase.from("reservations").update({
            deferred_status: "auto_charged",
            status: "cancelled",
            prepaid_charge_status: "partial",
            deferred_retry_count: retryCount,
          }).eq("id", reservation.id);

          await supabase.from("notifications").insert({
            user_id: reservation.user_id,
 title: `️ Χρέωση Ακύρωσης`,
            message: `Χρεώθηκε τέλος ακύρωσης ${feeFormatted} για ${event.title}.`,
            type: "personal",
            event_type: "reservation_auto_charged",
            entity_type: "reservation",
            entity_id: reservation.id,
            deep_link: "/dashboard-user?tab=reservations",
            read: false,
            delivered_at: new Date().toISOString(),
          });

          retried++;
        } else {
          // Increment retry count
          await supabase.from("reservations").update({
            deferred_retry_count: retryCount,
          }).eq("id", reservation.id);

          // If this was the 3rd attempt, give up
          if (retryCount >= 3) {
            await supabase.from("reservations").update({
              deferred_status: "cancelled",
              status: "cancelled",
            }).eq("id", reservation.id);

            // Notify business that payment couldn't be collected
            if (business?.user_id) {
              await supabase.from("notifications").insert({
                user_id: business.user_id,
 title: `️ Αποτυχία Είσπραξης`,
                message: `Δεν ήταν δυνατή η είσπραξη τέλους ακύρωσης από ${reservation.reservation_name} για ${event.title}. Επικοινωνήστε απευθείας.`,
                type: "personal",
                event_type: "payment_collection_failed",
                entity_type: "reservation",
                entity_id: reservation.id,
                deep_link: "/dashboard-business/reservations",
                read: false,
                delivered_at: new Date().toISOString(),
              });
            }

            console.log(`[DEFERRED-CRON] Gave up on reservation ${reservation.id} after 3 retries`);
          }
        }
      } catch (retryErr) {
        console.error(`[DEFERRED-CRON] Retry error for ${reservation.id}:`, retryErr);
      }
    }

    // ─── 3. Send reminders for upcoming deadlines ───
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const { data: reminderReservations } = await supabase
      .from("reservations")
      .select("*, events (title)")
      .eq("deferred_status", "awaiting_confirmation")
      .gt("deferred_confirmation_deadline", now)
      .lt("deferred_confirmation_deadline", twoHoursFromNow);

    for (const res of (reminderReservations || [])) {
      const deadline = new Date(res.deferred_confirmation_deadline);
      const minutesLeft = Math.round((deadline.getTime() - Date.now()) / (1000 * 60));

      if ((minutesLeft > 100 && minutesLeft <= 125) || (minutesLeft > 20 && minutesLeft <= 35)) {
        const timeLabel = minutesLeft > 60 ? `${Math.round(minutesLeft / 60)} ώρες` : `${minutesLeft} λεπτά`;

        await sendPushIfEnabled(res.user_id, {
 title: "Υπενθύμιση Επιβεβαίωσης",
          body: `Απομένουν ${timeLabel} για να επιβεβαιώσετε την κράτησή σας για ${res.events?.title || "εκδήλωση"}.`,
          icon: "/fomo-logo-new.png",
          badge: "/fomo-logo-new.png",
          tag: `deferred-reminder:${res.id}:${minutesLeft}`,
          data: { url: "/dashboard-user?tab=reservations", type: "deferred_reminder" },
        }, supabase);
      }
    }

    return new Response(JSON.stringify({ processed, errors, retried, reminders: reminderReservations?.length || 0 }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error in process-deferred-deadlines:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
