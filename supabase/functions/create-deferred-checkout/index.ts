import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    const {
      event_id, seating_type_id, party_size, reservation_name,
      phone_number, special_requests, success_url, cancel_url,
      customer_email, guests,
    } = await req.json();

    if (!event_id || !seating_type_id || !party_size || !reservation_name) {
      throw new Error("Missing required fields");
    }

    // Get event with business info
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select(`
        *, businesses (id, name, stripe_account_id, stripe_onboarding_completed, stripe_payouts_enabled)
      `)
      .eq("id", event_id)
      .single();

    if (eventError || !event) throw new Error("Event not found");
    if (!event.deferred_payment_enabled) throw new Error("Deferred payment not enabled for this event");

    const business = event.businesses;

    // Get commission rate
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

    // Get seating type
    const { data: seatingType, error: seatingError } = await supabaseClient
      .from("reservation_seating_types")
      .select("*")
      .eq("id", seating_type_id)
      .eq("event_id", event_id)
      .single();

    if (seatingError || !seatingType) throw new Error("Seating type not found");

    const remainingSlots = seatingType.available_slots - seatingType.slots_booked;
    if (remainingSlots <= 0) throw new Error("No available slots");

    // Validate party size
    if (party_size < (event.min_party_size || 1) || party_size > (event.max_party_size || 10)) {
      throw new Error(`Party size must be between ${event.min_party_size || 1} and ${event.max_party_size || 10}`);
    }

    // Get price tier
    const { data: priceTier, error: tierError } = await supabaseClient
      .from("seating_type_tiers")
      .select("*")
      .eq("seating_type_id", seating_type_id)
      .lte("min_people", party_size)
      .gte("max_people", party_size)
      .single();

    if (tierError || !priceTier) throw new Error("No price tier found");

    const prepaidAmountCents = priceTier.prepaid_min_charge_cents;
    const cancellationFeePercent = event.deferred_cancellation_fee_percent || 50;
    const confirmationHours = event.deferred_confirmation_hours || 4;

    // Calculate confirmation deadline
    const eventStartDate = new Date(event.start_at);
    const confirmationDeadline = new Date(eventStartDate.getTime() - confirmationHours * 60 * 60 * 1000);

    // Determine mode: auth_hold if event within 7 days, setup_intent otherwise
    const now = new Date();
    const daysUntilEvent = (eventStartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const deferredMode = daysUntilEvent <= 7 ? "auth_hold" : "setup_intent";

    console.log("[DEFERRED-CHECKOUT]", { deferredMode, daysUntilEvent, confirmationDeadline: confirmationDeadline.toISOString() });

    // Create pending reservation
    const confirmationCode = `RES-${Date.now().toString(36).toUpperCase()}`;
    const qrCodeToken = crypto.randomUUID();

    const { data: reservation, error: reservationError } = await supabaseClient
      .from("reservations")
      .insert({
        event_id,
        user_id: user.id,
        reservation_name,
        party_size,
        phone_number: phone_number || null,
        special_requests: special_requests || null,
        seating_type_id,
        prepaid_min_charge_cents: prepaidAmountCents,
        prepaid_charge_status: "pending",
        status: "pending",
        confirmation_code: confirmationCode,
        qr_code_token: qrCodeToken,
        deferred_payment_mode: deferredMode,
        deferred_confirmation_deadline: confirmationDeadline.toISOString(),
        deferred_status: "awaiting_confirmation",
      })
      .select()
      .single();

    if (reservationError || !reservation) {
      console.error("Reservation creation error:", reservationError);
      throw new Error("Failed to create reservation");
    }

    // Init Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get or create customer
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email, name")
      .eq("id", user.id)
      .single();

    const emailForStripe = profile?.email || user.email;
    const nameForStripe = profile?.name || reservation_name;

    let customerId: string;
    const existingCustomers = await stripe.customers.list({ email: emailForStripe, limit: 1 });
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({ email: emailForStripe, name: nameForStripe });
      customerId = newCustomer.id;
    }

    let hasConnectSetup = !!(business?.stripe_account_id && business?.stripe_onboarding_completed);
    // Verify the connected account actually exists in Stripe
    if (hasConnectSetup) {
      try {
        await stripe.accounts.retrieve(business.stripe_account_id);
      } catch {
        console.warn("[DEFERRED-CHECKOUT] Connect account invalid, falling back to platform checkout");
        hasConnectSetup = false;
      }
    }
    const platformFeeCents = Math.round(prepaidAmountCents * (commissionPercent / 100));

    const seatingTypeLabels: Record<string, string> = { bar: "Bar", table: "Table", vip: "VIP", sofa: "Sofa" };
    const seatingTypeName = seatingTypeLabels[seatingType.seating_type] || seatingType.seating_type;

    const guestsMeta: Record<string, string> = {};
    if (guests && Array.isArray(guests)) {
      const guestsJson = JSON.stringify(guests);
      if (guestsJson.length <= 500) {
        guestsMeta.guests = guestsJson;
      } else {
        const chunkSize = 490;
        for (let i = 0; i * chunkSize < guestsJson.length; i++) {
          guestsMeta[`guests_${i}`] = guestsJson.slice(i * chunkSize, (i + 1) * chunkSize);
        }
      }
    }

    const origin = req.headers.get("origin") ?? "";

    if (deferredMode === "auth_hold") {
      // Create Checkout Session with capture_method: "manual" for auth hold
      const baseSessionParams: any = {
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: priceTier.currency || "eur",
            product_data: {
              name: `${event.title} - ${seatingTypeName} (Hold)`,
              description: `Δέσμευση ποσού για ${party_size} ${party_size === 1 ? "άτομο" : "άτομα"}. Θα χρεωθείτε μόνο αφού επιβεβαιώσετε την παρουσία σας.`,
            },
            unit_amount: prepaidAmountCents,
          },
          quantity: 1,
        }],
        mode: "payment",
        payment_intent_data: {
          capture_method: "manual",
          metadata: {
            type: "deferred_reservation",
            event_id,
            reservation_id: reservation.id,
            seating_type_id,
            party_size: party_size.toString(),
            prepaid_amount_cents: prepaidAmountCents.toString(),
            business_id: business?.id ?? "",
            deferred_mode: "auth_hold",
            cancellation_fee_percent: cancellationFeePercent.toString(),
            customer_email: customer_email || emailForStripe || "",
            ...guestsMeta,
          },
          ...(hasConnectSetup ? {
            // Stripe processing fees: 2.9% + €0.25 — charged to connected account
            application_fee_amount: platformFeeCents + Math.ceil(prepaidAmountCents * 0.029 + 25),
            transfer_data: { destination: business.stripe_account_id },
          } : {}),
        },
        success_url: success_url || `${origin}/reservation-success?session_id={CHECKOUT_SESSION_ID}&reservation_id=${reservation.id}&deferred=true`,
        cancel_url: cancel_url || `${origin}/ekdiloseis/${event_id}?cancelled=true`,
        metadata: {
          type: "deferred_reservation",
          event_id,
          reservation_id: reservation.id,
          deferred_mode: "auth_hold",
        },
      };

      const session = await stripe.checkout.sessions.create(baseSessionParams);

      if (session.payment_intent) {
        await supabaseClient.from("reservations").update({
          stripe_payment_intent_id: session.payment_intent as string,
        }).eq("id", reservation.id);
      }

      return new Response(JSON.stringify({
        url: session.url,
        reservation_id: reservation.id,
        confirmation_code: confirmationCode,
        deferred_mode: deferredMode,
        confirmation_deadline: confirmationDeadline.toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else {
      // SetupIntent mode: save card for later charging
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        mode: "setup",
        success_url: success_url || `${origin}/reservation-success?session_id={CHECKOUT_SESSION_ID}&reservation_id=${reservation.id}&deferred=true`,
        cancel_url: cancel_url || `${origin}/ekdiloseis/${event_id}?cancelled=true`,
        metadata: {
          type: "deferred_reservation",
          event_id,
          reservation_id: reservation.id,
          deferred_mode: "setup_intent",
          prepaid_amount_cents: prepaidAmountCents.toString(),
          business_id: business?.id ?? "",
          cancellation_fee_percent: cancellationFeePercent.toString(),
          customer_email: customer_email || emailForStripe || "",
          ...guestsMeta,
        },
      });

      // Update reservation with setup intent info
      if (session.setup_intent) {
        await supabaseClient.from("reservations").update({
          stripe_setup_intent_id: session.setup_intent as string,
        }).eq("id", reservation.id);
      }

      return new Response(JSON.stringify({
        url: session.url,
        reservation_id: reservation.id,
        confirmation_code: confirmationCode,
        deferred_mode: deferredMode,
        confirmation_deadline: confirmationDeadline.toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error: unknown) {
    console.error("Error creating deferred checkout:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
