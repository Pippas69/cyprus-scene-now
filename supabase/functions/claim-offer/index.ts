import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CLAIM-OFFER] ${step}`, details ? JSON.stringify(details) : '');
};

interface ClaimOfferRequest {
  discountId: string;
  partySize: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request
    const { discountId, partySize }: ClaimOfferRequest = await req.json();
    logStep("Request data", { discountId, partySize });

    if (!discountId || !partySize || partySize < 1) {
      throw new Error("Invalid request: discountId and partySize are required");
    }

    // Use service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get offer details with business info
    const { data: discount, error: discountError } = await supabaseAdmin
      .from("discounts")
      .select(`
        *,
        businesses (
          id,
          name,
          logo_url,
          user_id,
          accepts_direct_reservations
        )
      `)
      .eq("id", discountId)
      .single();

    if (discountError || !discount) {
      throw new Error("Offer not found");
    }
    logStep("Discount fetched", { title: discount.title, peopleRemaining: discount.people_remaining });

    // Validate offer is active
    if (!discount.active) {
      throw new Error("This offer is no longer active");
    }

    // Validate date range
    const now = new Date();
    const startAt = new Date(discount.start_at);
    const endAt = new Date(discount.end_at);
    if (now < startAt || now > endAt) {
      throw new Error("This offer is not currently available");
    }

    // Validate day of week
    if (discount.valid_days && discount.valid_days.length > 0) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const today = dayNames[now.getDay()];
      if (!discount.valid_days.includes(today)) {
        throw new Error("This offer is not valid today");
      }
    }

    // Validate time
    if (discount.valid_start_time && discount.valid_end_time) {
      const currentTime = now.toTimeString().substring(0, 5);
      const startTime = discount.valid_start_time.substring(0, 5);
      const endTime = discount.valid_end_time.substring(0, 5);
      if (currentTime < startTime || currentTime > endTime) {
        throw new Error("This offer is only valid during specific hours");
      }
    }

    // Validate party size against max per redemption
    const maxPeoplePerRedemption = discount.max_people_per_redemption || 5;
    if (partySize > maxPeoplePerRedemption) {
      throw new Error(`Maximum ${maxPeoplePerRedemption} people per redemption`);
    }

    // Check availability
    const peopleRemaining = discount.people_remaining ?? discount.total_people ?? 999;
    if (peopleRemaining < partySize) {
      throw new Error(`Only ${peopleRemaining} spots remaining`);
    }

    // Check one-per-user constraint
    if (discount.one_per_user) {
      const { data: existingClaim } = await supabaseAdmin
        .from("offer_purchases")
        .select("id")
        .eq("discount_id", discountId)
        .eq("user_id", user.id)
        .eq("status", "claimed")
        .single();

      if (existingClaim) {
        throw new Error("You have already claimed this offer");
      }
    }

    // Generate unique QR token
    const qrCodeToken = crypto.randomUUID();

    // Calculate expiry (end of offer validity)
    const expiresAt = discount.end_at;

    // Create claim record
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("offer_purchases")
      .insert({
        discount_id: discountId,
        user_id: user.id,
        business_id: discount.business_id,
        original_price_cents: 0,
        final_price_cents: 0,
        commission_percent: 0,
        commission_amount_cents: 0,
        business_payout_cents: 0,
        status: "claimed",
        qr_code_token: qrCodeToken,
        expires_at: expiresAt,
        party_size: partySize,
        claim_type: "walk_in",
      })
      .select()
      .single();

    if (purchaseError) {
      logStep("Purchase insert error", purchaseError);
      throw new Error("Failed to create claim record");
    }
    logStep("Claim record created", { purchaseId: purchase.id });

    // Deduct people from availability
    const newPeopleRemaining = peopleRemaining - partySize;
    const { error: updateError } = await supabaseAdmin
      .from("discounts")
      .update({ 
        people_remaining: newPeopleRemaining,
        // Deactivate if no more people
        active: newPeopleRemaining > 0 ? discount.active : false
      })
      .eq("id", discountId);

    if (updateError) {
      logStep("Failed to update availability", updateError);
    }
    logStep("Availability updated", { newPeopleRemaining });

    // Get user profile for emails
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("name, first_name, last_name, email")
      .eq("id", user.id)
      .single();

    const userName = userProfile?.name || 
      (userProfile?.first_name && userProfile?.last_name 
        ? `${userProfile.first_name} ${userProfile.last_name}` 
        : null) || 
      user.email?.split('@')[0] || 
      'Guest';

    // Get business owner email
    const { data: businessOwner } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", discount.businesses.user_id)
      .single();

    // Send email to user
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-offer-claim-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          purchaseId: purchase.id,
          userEmail: user.email,
          userName,
          offerTitle: discount.title,
          offerDescription: discount.description,
          category: discount.category,
          discountType: discount.discount_type,
          percentOff: discount.percent_off,
          specialDealText: discount.special_deal_text,
          businessName: discount.businesses.name,
          businessLogo: discount.businesses.logo_url,
          partySize,
          qrCodeToken,
          expiresAt: discount.end_at,
          validDays: discount.valid_days,
          validStartTime: discount.valid_start_time,
          validEndTime: discount.valid_end_time,
          showReservationCta: discount.show_reservation_cta,
          businessId: discount.business_id,
        }),
      });
      logStep("User email sent");
    } catch (emailError) {
      logStep("User email error", emailError);
    }

    // Send notification to business
    if (businessOwner?.email) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-offer-claim-business-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            businessEmail: businessOwner.email,
            businessName: discount.businesses.name,
            offerTitle: discount.title,
            customerName: userName,
            partySize,
            claimedAt: new Date().toISOString(),
            remainingPeople: newPeopleRemaining,
            totalPeople: discount.total_people,
          }),
        });
        logStep("Business notification sent");
      } catch (notifError) {
        logStep("Business notification error", notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchaseId: purchase.id,
        qrCodeToken,
        expiresAt,
        partySize,
        offerTitle: discount.title,
        businessName: discount.businesses.name,
        businessLogo: discount.businesses.logo_url,
        showReservationCta: discount.show_reservation_cta,
        businessId: discount.business_id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
