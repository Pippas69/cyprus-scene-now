import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { toStatementDescriptorSuffix } from "../_shared/transliterate.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";
import { z, parseBody, flexId, reservationName, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";
import { fetchPricingProfile, calculatePricing, type EventType } from "../_shared/pricing-utils.ts";
import { loadSmsLockedCustomer } from "../_shared/sms-locked-customer.ts";

const GuestSchema = z.object({ name: safeString(200) }).passthrough();
const BodySchema = z.object({
  event_id: flexId,
  seating_type_id: flexId,
  party_size: positiveInt,
  reservation_name: reservationName(200),
  phone_number: optionalString(25),
  preferred_time: safeString(20).optional(),
  special_requests: optionalString(1000),
  success_url: optionalUrl,
  cancel_url: optionalUrl,
  customer_email: email.optional(),
  guests: z.array(GuestSchema).optional(),
  promoter_session_id: optionalString(120),
  promoter_tracking_code: optionalString(60),
  pending_booking_id: flexId.optional(),
  pending_booking_token: optionalString(64),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
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
      customer_email,
      guests,
      promoter_session_id,
      promoter_tracking_code,
      pending_booking_id,
      pending_booking_token,
    } = await parseBody(req, BodySchema);

    if (!event_id || !seating_type_id || !party_size || !reservation_name) {
      throw new Error("Missing required fields: event_id, seating_type_id, party_size, reservation_name");
    }

    // === SMS link enforcement ===
    // If a pending_booking_token is supplied, the customer arrived via the SMS link
    // (/r/{token}). The browser's name & phone MUST be ignored — we always use the
    // values the business owner originally entered. This prevents a tampered client
    // from submitting different identifying data than what was sent in the SMS.
    let lockedReservationName = reservation_name as string;
    let lockedPhoneNumber = (phone_number as string | undefined) ?? "";
    let smsLockedBookingId: string | null = null;
    if (pending_booking_token) {
      const supabaseSvc = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const locked = await loadSmsLockedCustomer(supabaseSvc, pending_booking_token as string);
      if (!locked) {
        throw new Error("This SMS booking link has expired or is no longer valid.");
      }
      smsLockedBookingId = locked.pendingBookingId;
      if (locked.customerName) lockedReservationName = locked.customerName;
      lockedPhoneNumber = locked.customerPhone;
      console.log("[CHECKOUT] Server-side override applied for SMS booking", {
        pending_booking_id: smsLockedBookingId,
      });
    }

    // Get event and validate
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

    if (event.event_type !== "reservation" && event.event_type !== "ticket_and_reservation") {
      throw new Error("This event does not accept prepaid reservations");
    }

    // Security: reject Stripe checkout for pay-at-door events
    if (event.pay_at_door === true) {
      throw new Error("This event uses pay-at-door. No online payment required.");
    }

    const business = event.businesses;

    // Fetch per-business pricing profile
    const pricingProfile = await fetchPricingProfile(business?.id ?? "");
    
    // Determine event type for pricing
    const eventType: EventType = event.event_type === 'ticket_and_reservation' ? 'hybrid' : 'reservation';

    // Environment detection for Stripe Connect
    const origin = req.headers.get("origin") ?? "";
    const referer = req.headers.get("referer") ?? "";
    const isPreviewOrigin =
      origin.includes("lovable.app") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("preview--") ||
      referer.includes("lovable.app") ||
      referer.includes("localhost") ||
      referer.includes("preview--");

    const hasConnectSetup = !!(business?.stripe_account_id && business?.stripe_onboarding_completed);

    // Get seating type and validate availability using the RPC that only counts accepted reservations
    const { data: seatingType, error: seatingError } = await supabaseClient
      .from("reservation_seating_types")
      .select("*")
      .eq("id", seating_type_id)
      .eq("event_id", event_id)
      .single();

    if (seatingError || !seatingType) {
      throw new Error("Seating type not found");
    }

    // Use the RPC to get actual booked count (only accepted reservations)
    const { data: bookedCounts } = await supabaseClient.rpc(
      'get_event_seating_booked_counts',
      { p_event_id: event_id }
    );
    const bookedForType = (bookedCounts || []).find(
      (r: { seating_type_id: string; slots_booked: number }) => r.seating_type_id === seating_type_id
    );
    const slotsBooked = Number(bookedForType?.slots_booked || 0);
    const remainingSlots = seatingType.available_slots - slotsBooked;

    if (remainingSlots <= 0) {
      throw new Error("No available slots for this seating type");
    }

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

    if (tierError || !priceTier) {
      throw new Error("No price tier found for this party size");
    }

    const prepaidAmountCents = priceTier.prepaid_min_charge_cents;
    
    // Calculate pricing using the business pricing profile
    const pricing = calculatePricing(
      prepaidAmountCents,
      pricingProfile,
      eventType,
      0, // no tickets for reservation-only
      1, // 1 reservation
    );
    
    const stripeFeesCents = pricing.stripeFeeCents;
    const platformFeeCents = pricing.fomoRevenueCents;

    // DO NOT create a reservation here. It will be created by the webhook
    // after successful payment. This prevents ghost reservations when users
    // abandon checkout.

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get or create Stripe customer
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

    const seatingTypeLabels: Record<string, string> = {
      bar: "Bar",
      table: "Table",
      vip: "VIP",
      sofa: "Sofa",
    };
    const seatingTypeName = seatingTypeLabels[seatingType.seating_type] || seatingType.seating_type;

    // Store ALL reservation data in Stripe session metadata so the webhook
    // can create the reservation after successful payment.
    const sessionMetadata: Record<string, string> = {
      type: "reservation_event",
      event_id,
      seating_type_id,
      party_size: party_size.toString(),
      prepaid_amount_cents: prepaidAmountCents.toString(),
      business_id: business?.id ?? "",
      used_platform_checkout: hasConnectSetup ? "false" : "true",
      customer_email: customer_email || customerEmail || "",
      user_id: user.id,
      reservation_name,
      phone_number: phone_number || "",
      preferred_time: preferred_time || "",
      special_requests: special_requests || "",
      // Pricing profile data for commission ledger
      fomo_revenue_cents: pricing.fomoRevenueCents.toString(),
      stripe_fee_cents: pricing.stripeFeeCents.toString(),
      application_fee_cents: pricing.applicationFeeCents.toString(),
      revenue_model: pricingProfile.revenue_model,
      commission_percent: pricingProfile.commission_percent.toString(),
    };

    // Φάση 4: link to pending_booking so webhook can convert it
    if (pending_booking_id) sessionMetadata.pending_booking_id = String(pending_booking_id);
    if (pending_booking_token) sessionMetadata.pending_booking_token = String(pending_booking_token);

    // PR Attribution: forward promoter tracking via Stripe metadata so the webhook can attribute the sale
    if (promoter_session_id) {
      sessionMetadata.promoter_session_id = String(promoter_session_id);
    }
    if (promoter_tracking_code) {
      sessionMetadata.promoter_tracking_code = String(promoter_tracking_code);
    }

    // Serialize guests into metadata (chunked if needed)
    if (guests && Array.isArray(guests)) {
      const guestsJson = JSON.stringify(guests);
      if (guestsJson.length <= 500) {
        sessionMetadata.guests = guestsJson;
      } else {
        const chunkSize = 490;
        for (let i = 0; i * chunkSize < guestsJson.length; i++) {
          sessionMetadata[`guests_${i}`] = guestsJson.slice(i * chunkSize, (i + 1) * chunkSize);
        }
      }
    }

    const reservationLineItems: any[] = [
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
    ];

    // Add processing fee line item (when buyer pays Stripe fees)
    if (pricing.addProcessingFeeLineItem && pricing.processingFeeLineItemCents > 0) {
      reservationLineItems.push({
        price_data: {
          currency: priceTier.currency || "eur",
          product_data: {
            name: "Processing Fee",
            description: "Payment processing fee",
          },
          unit_amount: pricing.processingFeeLineItemCents,
        },
        quantity: 1,
      });
    }

    // Add platform service fee line item (when buyer pays fixed fee)
    if (pricing.addPlatformFeeLineItem && pricing.platformFeeLineItemCents > 0) {
      reservationLineItems.push({
        price_data: {
          currency: priceTier.currency || "eur",
          product_data: {
            name: "Service Fee",
            description: "Platform service fee",
          },
          unit_amount: pricing.platformFeeLineItemCents,
        },
        quantity: 1,
      });
    }

    const baseSessionParams = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: reservationLineItems,
      mode: "payment",
      success_url:
        success_url ||
        `${req.headers.get("origin")}/reservation-success?session_id={CHECKOUT_SESSION_ID}&event_id=${event_id}`,
      cancel_url:
        cancel_url || `${req.headers.get("origin")}/ekdiloseis/${event_id}?cancelled=true`,
      metadata: sessionMetadata,
    };

    let session;
    if (hasConnectSetup) {
      try {
        await stripe.accounts.retrieve(business.stripe_account_id);
        session = await stripe.checkout.sessions.create({
          ...baseSessionParams,
          payment_intent_data: {
            application_fee_amount: pricing.applicationFeeCents,
            transfer_data: {
              destination: business.stripe_account_id,
            },
            metadata: sessionMetadata,
            statement_descriptor_suffix: toStatementDescriptorSuffix(business.name || ''),
          },
        });
      } catch (connectError) {
        console.warn("[CHECKOUT] Connect account invalid, falling back to platform checkout:", connectError);
        session = await stripe.checkout.sessions.create(baseSessionParams);
      }
    } else {
      session = await stripe.checkout.sessions.create(baseSessionParams);
    }

    // Φάση 4 — Layer 1 idempotency: persist Stripe session id on the pending_booking
    // so the customer-facing page can later verify payment if the webhook is delayed.
    if (pending_booking_id || pending_booking_token) {
      try {
        const supabaseService = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        let q = supabaseService
          .from("pending_bookings")
          .update({ stripe_checkout_session_id: session.id });
        if (pending_booking_id) {
          q = q.eq("id", pending_booking_id);
        } else if (pending_booking_token) {
          q = q.eq("token", pending_booking_token);
        }
        await q;
      } catch (e) {
        console.warn("[CHECKOUT] Failed to persist stripe_checkout_session_id on pending_booking", e);
      }
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        prepaid_amount_cents: prepaidAmountCents,
        platform_fee_cents: platformFeeCents,
      }),
      {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    console.error("Error creating reservation checkout:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
