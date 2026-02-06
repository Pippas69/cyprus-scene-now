import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { localToUtcISOString } from "../_shared/timezone.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CREATE-OFFER-CHECKOUT-WITH-RESERVATION] ${step}`, details ? JSON.stringify(details) : "");
};

interface ReservationData {
  reservation_name: string;
  party_size: number;
  preferred_date: string;
  preferred_time: string;
  phone_number: string;
  seating_preference?: string;
  special_requests?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { discountId, reservationData } = await req.json() as { 
      discountId: string; 
      reservationData: ReservationData;
    };
    
    if (!discountId) throw new Error("Discount ID is required");
    if (!reservationData) throw new Error("Reservation data is required");
    
    // Validate reservation data
    if (!reservationData.reservation_name?.trim()) throw new Error("Reservation name is required");
    if (!reservationData.party_size || reservationData.party_size < 1) throw new Error("Valid party size is required");
    if (!reservationData.preferred_date) throw new Error("Preferred date is required");
    if (!reservationData.preferred_time) throw new Error("Preferred time is required");
    if (!reservationData.phone_number?.trim()) throw new Error("Phone number is required");

    // Fetch the discount/offer details WITH business Stripe account info
    const { data: discount, error: discountError } = await supabaseAdmin
      .from("discounts")
      .select(`
        *,
        businesses!inner(id, name, user_id, stripe_account_id, stripe_payouts_enabled, 
                         accepts_direct_reservations, reservation_requires_approval,
                         daily_reservation_limit, reservation_capacity_type)
      `)
      .eq("id", discountId)
      .single();

    if (discountError || !discount) {
      throw new Error("Offer not found");
    }
    
    // Verify this offer requires reservation
    if (!discount.requires_reservation) {
      throw new Error("This offer does not require a reservation. Use the regular checkout flow.");
    }
    
    // Verify business accepts reservations
    if (!discount.businesses.accepts_direct_reservations) {
      throw new Error("This business does not accept reservations");
    }
    
    logStep("Discount fetched", { 
      discountId, 
      title: discount.title, 
      requiresReservation: discount.requires_reservation,
      businessAcceptsReservations: discount.businesses.accepts_direct_reservations
    });

    // Validate business Stripe setup
    if (!discount.businesses.stripe_account_id) {
      throw new Error("This business has not completed payment setup. Please try again later.");
    }
    if (!discount.businesses.stripe_payouts_enabled) {
      throw new Error("This business's payment account is not yet verified. Please try again later.");
    }

    // Validate offer is active and within date range
    if (!discount.active) {
      throw new Error("This offer is not currently active");
    }

    const now = new Date();
    const startDate = new Date(discount.start_at);
    const endDate = new Date(discount.end_at);

    if (now < startDate) throw new Error("This offer has not started yet");
    if (now > endDate) throw new Error("This offer has expired");

    // Check if max_purchases limit reached
    if (discount.max_purchases && discount.total_purchased >= discount.max_purchases) {
      throw new Error("This offer has sold out");
    }

    // Check user's purchase count for this offer
    const { count: userPurchaseCount } = await supabaseAdmin
      .from("offer_purchases")
      .select("*", { count: "exact", head: true })
      .eq("discount_id", discountId)
      .eq("user_id", user.id)
      .in("status", ["paid", "redeemed"]);

    const maxPerUser = discount.max_per_user || 1;
    if (userPurchaseCount && userPurchaseCount >= maxPerUser) {
      throw new Error(`You can only purchase this offer ${maxPerUser} time(s)`);
    }

    // Check reservation capacity for the selected date
    const reservationDate = reservationData.preferred_date;
    const { data: capacityData, error: capacityError } = await supabaseAdmin.rpc(
      'get_business_available_capacity',
      {
        p_business_id: discount.business_id,
        p_date: reservationDate,
      }
    );

    if (capacityError) {
      logStep("Capacity check error", { error: capacityError.message });
    } else {
      const capacity = capacityData as { available?: boolean; remaining_capacity?: number } | null;
      if (capacity && !capacity.available) {
        throw new Error("No availability for the selected date. Please choose another date.");
      }
      if (capacity?.remaining_capacity !== undefined && capacity.remaining_capacity < 1) {
        throw new Error("Fully booked for this date. Please choose another date.");
      }
      logStep("Capacity available", { remainingCapacity: capacity?.remaining_capacity });
    }

    // Calculate pricing
    const isCredit = discount.offer_type === 'credit';
    let originalPriceCents: number;
    let discountPercent: number;
    let finalPriceCents: number;
    let initialBalanceCents = 0;

    if (isCredit) {
      originalPriceCents = discount.credit_amount_cents || discount.original_price_cents || 0;
      discountPercent = 0;
      finalPriceCents = originalPriceCents;
      initialBalanceCents = Math.round(originalPriceCents * (1 + (discount.bonus_percent || 0) / 100));
    } else {
      originalPriceCents = discount.original_price_cents || 0;
      discountPercent = discount.percent_off || 0;
      finalPriceCents = Math.round(originalPriceCents * (100 - discountPercent) / 100);
    }

    // COMMISSION DISABLED
    const commissionPercent = 0;
    const commissionAmountCents = 0;
    const businessPayoutCents = finalPriceCents;

    logStep("Pricing calculated", { originalPriceCents, discountPercent, finalPriceCents });

    // Create pending reservation first
    // IMPORTANT: Treat incoming date+time as Cyprus local time and persist as UTC instant.
    const preferredTimeUtcIso = localToUtcISOString(
      reservationData.preferred_date,
      reservationData.preferred_time,
      'Europe/Nicosia'
    );
    const reservationStatus = discount.businesses.reservation_requires_approval ? 'pending' : 'accepted';

    const { data: reservation, error: reservationError } = await supabaseAdmin
      .from("reservations")
      .insert({
        business_id: discount.business_id,
        user_id: user.id,
        reservation_name: reservationData.reservation_name,
        party_size: reservationData.party_size,
        preferred_time: preferredTimeUtcIso,
        phone_number: reservationData.phone_number,
        seating_preference: reservationData.seating_preference && reservationData.seating_preference !== 'none' 
          ? reservationData.seating_preference : null,
        special_requests: reservationData.special_requests || null,
        status: 'pending', // Always pending until payment is confirmed
      })
      .select()
      .single();

    if (reservationError || !reservation) {
      throw new Error(`Failed to create reservation: ${reservationError?.message || 'Unknown error'}`);
    }
    logStep("Reservation created", { reservationId: reservation.id, status: reservation.status });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Validate destination account
    try {
      await stripe.accounts.retrieve(discount.businesses.stripe_account_id);
    } catch {
      // Clean up reservation
      await supabaseAdmin.from("reservations").delete().eq("id", reservation.id);
      
      await supabaseAdmin
        .from("businesses")
        .update({ 
          stripe_account_id: null,
          stripe_onboarding_completed: false,
          stripe_payouts_enabled: false
        })
        .eq("id", discount.business_id);
        
      throw new Error("This business needs to re-complete payment setup. Please contact the business owner.");
    }

    // Create pending purchase record with reservation link
    const expiresAt = new Date(discount.end_at).toISOString();
    const purchaseData: Record<string, unknown> = {
      discount_id: discountId,
      user_id: user.id,
      business_id: discount.business_id,
      original_price_cents: originalPriceCents,
      discount_percent: discountPercent,
      final_price_cents: finalPriceCents,
      commission_percent: commissionPercent,
      commission_amount_cents: commissionAmountCents,
      business_payout_cents: businessPayoutCents,
      status: "pending",
      expires_at: expiresAt,
      reservation_id: reservation.id, // Link to reservation
    };

    if (isCredit) {
      purchaseData.balance_remaining_cents = initialBalanceCents;
    }

    const { data: purchaseRecord, error: purchaseError } = await supabaseAdmin
      .from("offer_purchases")
      .insert(purchaseData)
      .select()
      .single();

    if (purchaseError) {
      // Clean up reservation on failure
      await supabaseAdmin.from("reservations").delete().eq("id", reservation.id);
      throw new Error(`Failed to create purchase record: ${purchaseError.message}`);
    }
    logStep("Purchase record created with reservation link", { 
      purchaseId: purchaseRecord.id, 
      reservationId: reservation.id 
    });

    // Create Stripe checkout session
    const origin = req.headers.get("origin") || "https://fomo.lovable.app";
    
    const checkoutConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${discount.title} + Reservation`,
              description: `${discountPercent > 0 ? `${discountPercent}% off - ` : ''}${discount.businesses.name} - ${reservationData.preferred_date} at ${reservationData.preferred_time}`,
            },
            unit_amount: finalPriceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/offer-purchase-success?purchase_id=${purchaseRecord.id}`,
      cancel_url: `${origin}/feed`,
      metadata: {
        type: "offer_purchase_with_reservation",
        purchase_id: purchaseRecord.id,
        discount_id: discountId,
        reservation_id: reservation.id,
        user_id: user.id,
        business_id: discount.business_id,
      },
    };

    checkoutConfig.payment_intent_data = {
      application_fee_amount: commissionAmountCents,
      transfer_data: {
        destination: discount.businesses.stripe_account_id,
      },
    };

    const session = await stripe.checkout.sessions.create(checkoutConfig);

    // Update purchase record with checkout session ID
    await supabaseAdmin
      .from("offer_purchases")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", purchaseRecord.id);

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      url: session.url, 
      purchaseId: purchaseRecord.id,
      reservationId: reservation.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
