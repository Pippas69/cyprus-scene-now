import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Force cache refresh - v1
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CREATE-RESERVATION-OFFER-PENDING] ${step}`, details ? JSON.stringify(details) : "");
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

    // Fetch the discount/offer details WITH business info
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

    // Check user's purchase count for this offer (exclude awaiting_payment and pending)
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

    // Calculate pricing (for storing in offer_purchases)
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

    // Create pending reservation
    const preferredDateTime = new Date(`${reservationData.preferred_date}T${reservationData.preferred_time}:00`);

    const { data: reservation, error: reservationError } = await supabaseAdmin
      .from("reservations")
      .insert({
        business_id: discount.business_id,
        user_id: user.id,
        reservation_name: reservationData.reservation_name,
        party_size: reservationData.party_size,
        preferred_time: preferredDateTime.toISOString(),
        phone_number: reservationData.phone_number,
        seating_preference: reservationData.seating_preference && reservationData.seating_preference !== 'none' 
          ? reservationData.seating_preference : null,
        special_requests: reservationData.special_requests || null,
        status: 'pending', // Always pending until business accepts
      })
      .select()
      .single();

    if (reservationError || !reservation) {
      throw new Error(`Failed to create reservation: ${reservationError?.message || 'Unknown error'}`);
    }
    logStep("Reservation created", { reservationId: reservation.id, status: reservation.status });

    // Create offer_purchase record with status "awaiting_payment"
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
      status: "awaiting_payment", // New status - waiting for business approval
      expires_at: expiresAt,
      reservation_id: reservation.id,
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
    logStep("Purchase record created with awaiting_payment status", { 
      purchaseId: purchaseRecord.id, 
      reservationId: reservation.id 
    });

    // Send reservation notifications (user confirmation + business alert)
    // Best-effort: do not fail the reservation flow if notifications fail.
    try {
      await supabaseAdmin.functions.invoke('send-reservation-notification', {
        body: {
          reservationId: reservation.id,
          type: 'new',
        },
      });
      logStep("Reservation notifications sent", { reservationId: reservation.id });
    } catch (notifyError) {
      console.error("Error sending reservation notifications:", notifyError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Reservation submitted successfully. You'll receive a payment link when accepted.",
      purchaseId: purchaseRecord.id,
      reservationId: reservation.id,
      reservationStatus: 'pending'
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
