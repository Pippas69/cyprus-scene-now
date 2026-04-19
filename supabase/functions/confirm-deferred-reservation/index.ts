import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendPushIfEnabled, type PushPayload } from "../_shared/web-push-crypto.ts";
import { ensureReservationEventGuestTickets } from "../_shared/reservation-event-tickets.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const BodySchema = z.object({
  reservation_id: flexId,
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    const { reservation_id } = await parseBody(req, BodySchema);
    if (!reservation_id) throw new Error("Missing reservation_id");

    // Get reservation
    const { data: reservation, error: resError } = await supabaseClient
      .from("reservations")
      .select(`
        *, events (
          id, title, start_at, business_id,
          businesses (id, name, stripe_account_id, stripe_onboarding_completed)
        )
      `)
      .eq("id", reservation_id)
      .eq("user_id", user.id)
      .single();

    if (resError || !reservation) throw new Error("Reservation not found");
    if (reservation.deferred_status !== "awaiting_confirmation" && reservation.deferred_status !== "payment_failed") {
      throw new Error("Reservation is not awaiting confirmation");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const event = reservation.events;
    const business = event?.businesses;

    let guestMetadata: Record<string, string | undefined> | null = null;
    let guestSessionId: string | null = null;
    let guestCustomerEmail: string | null = null;
    let finalPaymentIntentId: string | null = reservation.stripe_payment_intent_id || null;

    if (reservation.deferred_payment_mode === "auth_hold") {
      // Capture the held payment intent
      if (!reservation.stripe_payment_intent_id) {
        throw new Error("No payment intent found for auth hold reservation");
      }

      try {
        const heldPaymentIntent = await stripe.paymentIntents.retrieve(reservation.stripe_payment_intent_id);
        guestMetadata = (heldPaymentIntent.metadata as Record<string, string>) || null;
        guestCustomerEmail = heldPaymentIntent.metadata?.customer_email || null;
        finalPaymentIntentId = heldPaymentIntent.id;

        try {
          const sessionList = await stripe.checkout.sessions.list({
            payment_intent: reservation.stripe_payment_intent_id,
            limit: 1,
          } as any);
          const matchedSession = sessionList.data?.[0] ?? null;
          if (matchedSession) {
            guestSessionId = matchedSession.id;
            if (!guestMetadata && matchedSession.metadata) {
              guestMetadata = matchedSession.metadata as Record<string, string>;
            }
            if (!guestCustomerEmail) {
              guestCustomerEmail = matchedSession.metadata?.customer_email || null;
            }
          }
        } catch (sessionLookupErr) {
          console.warn("[CONFIRM-DEFERRED] Failed to fetch auth_hold checkout session metadata", sessionLookupErr);
        }

        await stripe.paymentIntents.capture(reservation.stripe_payment_intent_id);
        console.log("[CONFIRM-DEFERRED] Captured auth hold:", reservation.stripe_payment_intent_id);
      } catch (captureErr: any) {
        console.error("[CONFIRM-DEFERRED] Auth hold capture failed:", captureErr.message);
        await supabaseClient.from("reservations").update({
          deferred_status: "payment_failed",
          deferred_retry_count: (reservation.deferred_retry_count || 0) + 1,
        }).eq("id", reservation.id);
        
        return new Response(JSON.stringify({ 
          error: "card_declined", 
          message: captureErr.message || "Payment capture failed. Please try again."
        }), {
          headers: { ...securityHeaders, "Content-Type": "application/json" },
          status: 402,
        });
      }

    } else if (reservation.deferred_payment_mode === "setup_intent") {
      // Charge the saved card
      if (!reservation.stripe_setup_intent_id) {
        throw new Error("No setup intent found");
      }

      const setupIntent = await stripe.setupIntents.retrieve(reservation.stripe_setup_intent_id);
      const paymentMethodId = setupIntent.payment_method as string;
      const customerId = setupIntent.customer as string | null;

      if (!paymentMethodId) throw new Error("No payment method on setup intent");

      if (customerId) {
        try {
          const sessionList = await stripe.checkout.sessions.list({ customer: customerId, limit: 20 });
          const matchedSession = sessionList.data.find(
            (session) =>
              session.metadata?.type === "deferred_reservation" &&
              session.metadata?.reservation_id === reservation.id
          );

          if (matchedSession) {
            guestSessionId = matchedSession.id;
            guestMetadata = (matchedSession.metadata as Record<string, string>) || null;
            guestCustomerEmail = matchedSession.metadata?.customer_email || null;
          }
        } catch (sessionLookupErr) {
          console.warn("[CONFIRM-DEFERRED] Failed to fetch setup_intent checkout session metadata", sessionLookupErr);
        }
      }

      // Get commission
      const { data: subscription } = await supabaseClient
        .from("business_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("business_id", event.business_id)
        .eq("status", "active")
        .maybeSingle();

      let planSlug = "free";
      if (subscription?.subscription_plans?.slug) planSlug = subscription.subscription_plans.slug;

      const { data: commissionRate } = await supabaseClient
        .from("ticket_commission_rates")
        .select("commission_percent")
        .eq("plan_slug", planSlug)
        .single();

      const commissionPercent = commissionRate?.commission_percent ?? 12;
      const platformFeeCents = Math.round(reservation.prepaid_min_charge_cents * (commissionPercent / 100));
      const hasConnectSetup = !!(business?.stripe_account_id && business?.stripe_onboarding_completed);

      const guestsMetaForPaymentIntent = Object.entries(guestMetadata || {}).reduce<Record<string, string>>((acc, [key, value]) => {
        if ((key === "guests" || key.startsWith("guests_")) && typeof value === "string" && value.length > 0) {
          acc[key] = value;
        }
        return acc;
      }, {});

      const piParams: any = {
        amount: reservation.prepaid_min_charge_cents,
        currency: "eur",
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          type: "deferred_reservation_confirmed",
          reservation_id: reservation.id,
          event_id: event.id,
          business_id: business?.id ?? "",
          customer_email: guestCustomerEmail || "",
          ...guestsMetaForPaymentIntent,
        },
      };

      if (hasConnectSetup) {
        // Stripe processing fees: 2.9% + €0.25 — charged to connected account
        const stripeFeesCents = Math.ceil(reservation.prepaid_min_charge_cents * 0.029 + 25);
        piParams.application_fee_amount = platformFeeCents + stripeFeesCents;
        piParams.transfer_data = { destination: business.stripe_account_id };
      }

      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.create(piParams);
        console.log("[CONFIRM-DEFERRED] Created and confirmed PI:", paymentIntent.id);
      } catch (chargeErr: any) {
        console.error("[CONFIRM-DEFERRED] Card declined:", chargeErr.message);
        // Mark as payment_failed so user can retry
        await supabaseClient.from("reservations").update({
          deferred_status: "payment_failed",
          deferred_retry_count: (reservation.deferred_retry_count || 0) + 1,
        }).eq("id", reservation.id);
        
        return new Response(JSON.stringify({ 
          error: "card_declined", 
          message: chargeErr.message || "Your card was declined. Please try again or use a different card."
        }), {
          headers: { ...securityHeaders, "Content-Type": "application/json" },
          status: 402,
        });
      }

      finalPaymentIntentId = paymentIntent.id;

      // Store the new payment intent ID
      await supabaseClient.from("reservations").update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_payment_method_id: paymentMethodId,
      }).eq("id", reservation.id);
    }

    // Update reservation status
    await supabaseClient.from("reservations").update({
      deferred_status: "confirmed",
      status: "accepted",
      prepaid_charge_status: "paid",
    }).eq("id", reservation.id);

    // Ensure per-person QR tickets are generated for reservation-only flows
    try {
      const createdTickets = await ensureReservationEventGuestTickets({
        supabaseClient: supabaseService,
        reservationId: reservation.id,
        paymentIntentId: finalPaymentIntentId,
        session: {
          id: guestSessionId,
          metadata: guestMetadata,
          customer_details: { email: guestCustomerEmail },
        },
        customerEmail: guestCustomerEmail,
      });

      console.log("[CONFIRM-DEFERRED] Ensured reservation guest tickets", {
        reservationId: reservation.id,
        createdTickets,
      });
    } catch (ticketErr) {
      console.error("[CONFIRM-DEFERRED] Failed to ensure reservation guest tickets", ticketErr);
    }

    // Send notification to user
    await supabaseService.from("notifications").insert({
      user_id: user.id,
      title: `Κράτηση Επιβεβαιώθηκε`,
      message: `Η κράτησή σας για ${event.title} επιβεβαιώθηκε και χρεώθηκε επιτυχώς.`,
      type: "personal",
      event_type: "reservation_confirmed",
      entity_type: "reservation",
      entity_id: reservation.id,
      deep_link: "/dashboard-user?tab=reservations",
      read: false,
      delivered_at: new Date().toISOString(),
    });

    // Push notification
    const pushPayload: PushPayload = {
      title: "Κράτηση Επιβεβαιώθηκε",
      body: `Η κράτησή σας για ${event.title} επιβεβαιώθηκε.`,
      icon: "/fomo-logo-new.png",
      badge: "/fomo-logo-new.png",
      tag: `deferred-confirmed:${reservation.id}`,
      data: { url: "/dashboard-user?tab=reservations", type: "reservation_confirmed" },
    };
    await sendPushIfEnabled(user.id, pushPayload, supabaseService);

    // Notify business owner
    if (business) {
      const { data: bizOwner } = await supabaseService.from("businesses").select("user_id").eq("id", business.id).single();
      if (bizOwner) {
        await supabaseService.from("notifications").insert({
          user_id: bizOwner.user_id,
 title: `Επιβεβαίωση Κράτησης`,
          message: `Ο/Η ${reservation.reservation_name} επιβεβαίωσε την παρουσία για ${event.title}.`,
          type: "personal",
          event_type: "reservation_confirmed",
          entity_type: "reservation",
          entity_id: reservation.id,
          deep_link: "/dashboard-business/reservations",
          read: false,
          delivered_at: new Date().toISOString(),
        });
        await sendPushIfEnabled(bizOwner.user_id, {
 title: "Επιβεβαίωση Κράτησης",
          body: `Ο/Η ${reservation.reservation_name} επιβεβαίωσε για ${event.title}.`,
          icon: "/fomo-logo-new.png",
          badge: "/fomo-logo-new.png",
          tag: `deferred-biz-confirmed:${reservation.id}`,
          data: { url: "/dashboard-business/reservations", type: "reservation_confirmed" },
        }, supabaseService);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    console.error("Error confirming deferred reservation:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});