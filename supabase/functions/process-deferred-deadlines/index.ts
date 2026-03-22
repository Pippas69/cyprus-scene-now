import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { sendPushIfEnabled, type PushPayload } from "../_shared/web-push-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const now = new Date().toISOString();

    // 1. Find expired deferred reservations
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

    if (fetchError) {
      console.error("Error fetching expired reservations:", fetchError);
      throw fetchError;
    }

    console.log(`[DEFERRED-CRON] Found ${expiredReservations?.length || 0} expired deferred reservations`);

    let processed = 0;
    let errors = 0;

    for (const reservation of (expiredReservations || [])) {
      try {
        const event = reservation.events;
        const business = event?.businesses;
        const cancellationFeePercent = event?.deferred_cancellation_fee_percent || 50;
        const cancellationFeeCents = Math.round(reservation.prepaid_min_charge_cents * (cancellationFeePercent / 100));

        console.log(`[DEFERRED-CRON] Processing reservation ${reservation.id}, mode=${reservation.deferred_payment_mode}, fee=${cancellationFeeCents}c`);

        if (reservation.deferred_payment_mode === "auth_hold") {
          // Capture partial amount (cancellation fee) from the held payment intent
          if (reservation.stripe_payment_intent_id) {
            try {
              await stripe.paymentIntents.capture(reservation.stripe_payment_intent_id, {
                amount_to_capture: cancellationFeeCents,
              });
              console.log(`[DEFERRED-CRON] Partial capture ${cancellationFeeCents}c from PI ${reservation.stripe_payment_intent_id}`);
            } catch (captureErr: any) {
              // If hold expired, log and mark
              console.error(`[DEFERRED-CRON] Failed to capture PI ${reservation.stripe_payment_intent_id}:`, captureErr.message);
            }
          }
        } else if (reservation.deferred_payment_mode === "setup_intent") {
          // Charge cancellation fee using saved payment method
          if (reservation.stripe_setup_intent_id) {
            try {
              const setupIntent = await stripe.setupIntents.retrieve(reservation.stripe_setup_intent_id);
              const paymentMethodId = setupIntent.payment_method as string;
              const customerId = setupIntent.customer as string;

              if (paymentMethodId && customerId) {
                const hasConnectSetup = !!(business?.stripe_account_id && business?.stripe_onboarding_completed);

                // Get commission for the fee
                const { data: sub } = await supabase
                  .from("business_subscriptions")
                  .select("*, subscription_plans(*)")
                  .eq("business_id", event.business_id)
                  .eq("status", "active")
                  .maybeSingle();

                let planSlug = "free";
                if (sub?.subscription_plans?.slug) planSlug = sub.subscription_plans.slug;

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
                  piParams.application_fee_amount = platformFeeCents;
                  piParams.transfer_data = { destination: business.stripe_account_id };
                }

                await stripe.paymentIntents.create(piParams);
                console.log(`[DEFERRED-CRON] Charged cancellation fee ${cancellationFeeCents}c for reservation ${reservation.id}`);
              }
            } catch (chargeErr: any) {
              console.error(`[DEFERRED-CRON] Failed to charge cancellation fee for ${reservation.id}:`, chargeErr.message);
            }
          }
        }

        // Update reservation status
        await supabase.from("reservations").update({
          deferred_status: "auto_charged",
          status: "cancelled",
          prepaid_charge_status: "partial",
        }).eq("id", reservation.id);

        // Release slot
        if (reservation.seating_type_id) {
          await supabase.rpc("release_reservation_slot", {
            p_seating_type_id: reservation.seating_type_id,
          }).catch(() => {
            // If RPC doesn't exist, manually decrement
            console.log("[DEFERRED-CRON] release_reservation_slot RPC not found, skipping slot release");
          });
        }

        // Notify user
        const feeFormatted = `€${(cancellationFeeCents / 100).toFixed(2)}`;
        await supabase.from("notifications").insert({
          user_id: reservation.user_id,
          title: `⚠️ Χρέωση Ακύρωσης`,
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
          title: "⚠️ Χρέωση Ακύρωσης",
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
            title: `❌ Μη Επιβεβαιωμένη Κράτηση`,
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

        processed++;
      } catch (innerErr) {
        console.error(`[DEFERRED-CRON] Error processing reservation ${reservation.id}:`, innerErr);
        errors++;
      }
    }

    // 2. Send reminders for upcoming deadlines (2h and 30min before)
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const thirtyMinFromNow = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: reminderReservations } = await supabase
      .from("reservations")
      .select("*, events (title)")
      .eq("deferred_status", "awaiting_confirmation")
      .gt("deferred_confirmation_deadline", now)
      .lt("deferred_confirmation_deadline", twoHoursFromNow);

    for (const res of (reminderReservations || [])) {
      const deadline = new Date(res.deferred_confirmation_deadline);
      const minutesLeft = Math.round((deadline.getTime() - Date.now()) / (1000 * 60));

      // Send reminder at ~2h or ~30min mark (avoid spamming by checking range)
      if ((minutesLeft > 100 && minutesLeft <= 125) || (minutesLeft > 20 && minutesLeft <= 35)) {
        const timeLabel = minutesLeft > 60 ? `${Math.round(minutesLeft / 60)} ώρες` : `${minutesLeft} λεπτά`;

        await sendPushIfEnabled(res.user_id, {
          title: "⏰ Υπενθύμιση Επιβεβαίωσης",
          body: `Απομένουν ${timeLabel} για να επιβεβαιώσετε την κράτησή σας για ${res.events?.title || "εκδήλωση"}.`,
          icon: "/fomo-logo-new.png",
          badge: "/fomo-logo-new.png",
          tag: `deferred-reminder:${res.id}:${minutesLeft}`,
          data: { url: "/dashboard-user?tab=reservations", type: "deferred_reminder" },
        }, supabase);
      }
    }

    return new Response(JSON.stringify({ processed, errors, reminders: reminderReservations?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error in process-deferred-deadlines:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
