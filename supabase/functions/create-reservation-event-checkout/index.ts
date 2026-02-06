import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_PERCENT = 12;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client using the anon key AND forward the caller's JWT so
    // database Row Level Security (RLS) policies run in the user's context.
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Service client for privileged calls (notifications)
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("User not authenticated");
    }


    const {
      event_id,
      seating_type_id,
      party_size,
      reservation_name,
      phone_number,
      preferred_time,
      special_requests,
      success_url,
      cancel_url,
    } = await req.json();

    // Validate required fields
    if (!event_id || !seating_type_id || !party_size || !reservation_name) {
      throw new Error("Missing required fields: event_id, seating_type_id, party_size, reservation_name");
    }

    // Get event and validate it's a reservation event
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select(`
        *,
        businesses (
          id,
          name,
          stripe_account_id,
          stripe_onboarding_completed,
          stripe_payouts_enabled
        )
      `)
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    if (event.event_type !== "reservation") {
      throw new Error("This event does not accept prepaid reservations");
    }

    const business = event.businesses;

    // Allow destination charges if business has completed Stripe Connect onboarding.
    // In preview/dev environments, allow platform checkout for testing.
    const origin = req.headers.get("origin") ?? "";
    const referer = req.headers.get("referer") ?? "";
    
    // Check multiple headers for preview detection
    const isPreviewOrigin = 
      origin.includes("lovable.app") || 
      origin.includes("localhost") || 
      origin.includes("127.0.0.1") ||
      origin.includes("preview--") ||
      referer.includes("lovable.app") ||
      referer.includes("localhost") ||
      referer.includes("preview--");

    const hasConnectSetup = !!(business?.stripe_account_id && business?.stripe_onboarding_completed);

    console.log("[CHECKOUT] Environment check:", { 
      origin, 
      referer,
      isPreviewOrigin, 
      hasConnectSetup,
      businessId: business?.id,
      stripeAccountId: business?.stripe_account_id ? "present" : "missing"
    });

    // ALWAYS allow checkout in preview environments - business setup is optional for testing
    if (!hasConnectSetup && !isPreviewOrigin) {
      throw new Error("Business has not completed payment setup");
    }

    // Get seating type and validate availability
    const { data: seatingType, error: seatingError } = await supabaseClient
      .from("reservation_seating_types")
      .select("*")
      .eq("id", seating_type_id)
      .eq("event_id", event_id)
      .single();

    if (seatingError || !seatingType) {
      throw new Error("Seating type not found");
    }

    const remainingSlots = seatingType.available_slots - seatingType.slots_booked;
    if (remainingSlots <= 0) {
      throw new Error("No available slots for this seating type");
    }

    // Validate party size
    if (party_size < (event.min_party_size || 1) || party_size > (event.max_party_size || 10)) {
      throw new Error(`Party size must be between ${event.min_party_size || 1} and ${event.max_party_size || 10}`);
    }

    // Get price tier for party size
    const { data: priceTier, error: tierError } = await supabaseClient
      .from("seating_type_tiers")
      .select("*")
      .eq("seating_type_id", seating_type_id)
      .lte("min_people", party_size)
      .gte("max_people", party_size)
      .single();

    if (tierError || !priceTier) {
      throw new Error("No price tier found for this party size");
    }

    const prepaidAmountCents = priceTier.prepaid_min_charge_cents;
    const platformFeeCents = Math.round(prepaidAmountCents * (PLATFORM_FEE_PERCENT / 100));

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
        preferred_time: preferred_time || null,
        special_requests: special_requests || null,
        seating_type_id,
        prepaid_min_charge_cents: prepaidAmountCents,
        prepaid_charge_status: "pending",
        status: "pending",
        confirmation_code: confirmationCode,
        qr_code_token: qrCodeToken,
      })
      .select()
      .single();

    if (reservationError || !reservation) {
      console.error("Reservation creation error:", reservationError);
      throw new Error("Failed to create reservation");
    }

    // NOTE: Notifications are NOT sent here. They are sent by the
    // process-reservation-event-payment webhook AFTER the user completes payment.
    // This ensures users and businesses only receive "confirmed" notifications
    // once payment has actually succeeded.

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get or create customer
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email, name")
      .eq("id", user.id)
      .single();

    const customerEmail = profile?.email || user.email;
    const customerName = profile?.name || reservation_name;

    let customerId: string;
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
      });
      customerId = newCustomer.id;
    }

    // Get seating type name for display
    const seatingTypeLabels: Record<string, string> = {
      bar: "Bar",
      table: "Table",
      vip: "VIP",
      sofa: "Sofa",
    };
    const seatingTypeName = seatingTypeLabels[seatingType.seating_type] || seatingType.seating_type;

    // Create Stripe checkout session.
    // - If the business has Connect setup: destination charge + application fee.
    // - If not (preview/dev only): platform checkout (no transfer/application fee).
    const baseSessionParams = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: priceTier.currency || "eur",
            product_data: {
              name: `${event.title} - ${seatingTypeName} Reservation`,
              description: `Prepaid minimum charge for ${party_size} ${party_size === 1 ? "person" : "people"}. This amount counts as credit at the venue.`,
              metadata: {
                event_id,
                seating_type: seatingType.seating_type,
                party_size: party_size.toString(),
              },
            },
            unit_amount: prepaidAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        success_url ||
        `${req.headers.get("origin")}/dashboard-user?tab=reservations&success=true&reservation_id=${reservation.id}`,
      cancel_url:
        cancel_url || `${req.headers.get("origin")}/ekdiloseis/${event_id}?cancelled=true`,
      metadata: {
        type: "reservation_event",
        event_id,
        reservation_id: reservation.id,
        seating_type_id,
        party_size: party_size.toString(),
        prepaid_amount_cents: prepaidAmountCents.toString(),
        business_id: business?.id ?? "",
        used_platform_checkout: hasConnectSetup ? "false" : "true",
      },
    };

    const session = await stripe.checkout.sessions.create(
      hasConnectSetup
        ? {
            ...baseSessionParams,
            payment_intent_data: {
              application_fee_amount: platformFeeCents,
              transfer_data: {
                destination: business.stripe_account_id,
              },
              metadata: {
                type: "reservation_event",
                event_id,
                reservation_id: reservation.id,
                seating_type_id,
                party_size: party_size.toString(),
                prepaid_amount_cents: prepaidAmountCents.toString(),
                business_id: business.id,
              },
            },
          }
        : baseSessionParams
    );

    // Update reservation with payment intent ID
    if (session.payment_intent) {
      await supabaseClient
        .from("reservations")
        .update({ stripe_payment_intent_id: session.payment_intent as string })
        .eq("id", reservation.id);
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        reservation_id: reservation.id,
        confirmation_code: confirmationCode,
        prepaid_amount_cents: prepaidAmountCents,
        platform_fee_cents: platformFeeCents,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error creating reservation checkout:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});