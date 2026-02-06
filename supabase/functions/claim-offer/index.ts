import { createClient } from "npm:@supabase/supabase-js@2";
import { localToUtcISOString } from "../_shared/timezone.ts";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CLAIM-OFFER] ${step}`, details ? JSON.stringify(details) : '');
};

interface ReservationData {
  preferred_date: string;
  preferred_time: string;
  party_size: number;
}

interface ClaimOfferRequest {
  discountId: string;
  partySize: number;
  withReservation?: boolean;
  reservationData?: ReservationData;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    const { discountId, partySize, withReservation, reservationData }: ClaimOfferRequest = await req.json();
    logStep("Request data", { discountId, partySize, withReservation, reservationData });

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
        .in("status", ["paid", "redeemed"]) 
        .maybeSingle();

      if (existingClaim) {
        throw new Error("You have already claimed this offer");
      }
    }

    // If reservation requested, check capacity first
    let reservationId: string | null = null;
    if (withReservation && reservationData) {
      logStep("Creating reservation with offer claim", reservationData);
      
      // Check capacity
      const { data: capacityData, error: capacityError } = await supabaseAdmin.rpc(
        'get_business_available_capacity',
        {
          p_business_id: discount.business_id,
          p_date: reservationData.preferred_date,
        }
      );

      if (capacityError) {
        logStep("Capacity check error", { error: capacityError.message });
        throw new Error("Could not check reservation availability");
      }

      const capacity = capacityData as { available?: boolean; remaining_capacity?: number; reason?: string } | null;
      if (!capacity?.available) {
        throw new Error(capacity?.reason || "No availability for reservations on this date");
      }
      if (capacity?.remaining_capacity !== undefined && capacity.remaining_capacity < partySize) {
        throw new Error("Not enough reservation slots available");
      }
      // Create reservation - convert Cyprus local date+time to a UTC instant (DST-safe)
      const preferredDateTime = localToUtcISOString(
        reservationData.preferred_date,
        reservationData.preferred_time,
        'Europe/Nicosia'
      );

      const reservationName =
        (user.user_metadata?.first_name && user.user_metadata?.last_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : null) ||
        user.email?.split("@")[0] ||
        "Guest";
      
      const { data: reservation, error: reservationError } = await supabaseAdmin
        .from("reservations")
        .insert({
          business_id: discount.business_id,
          user_id: user.id,
          reservation_name: reservationName,
          event_id: null, // Direct business reservation
          preferred_time: preferredDateTime,
          party_size: partySize,
          status: "accepted", // Auto-accept for offer-based reservations
          special_requests: `Offer claim: ${discount.title}`,
          confirmation_code: crypto.randomUUID().substring(0, 6).toUpperCase(),
        })
        .select()
        .single();

      if (reservationError) {
        logStep("Reservation insert error", reservationError);
        throw new Error("Failed to create reservation");
      }
      
      reservationId = reservation.id;
      logStep("Reservation created", { reservationId });

      // Trigger reservation notifications (user + business)
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-reservation-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            reservationId,
            type: "new",
          }),
        });
        logStep("Reservation notification sent");
      } catch (notifError) {
        logStep("Reservation notification error", notifError);
      }
    }

    // Generate unique QR token
    const qrCodeToken = crypto.randomUUID();

    // Calculate expiry (end of offer validity)
    const expiresAt = discount.end_at;

    // Create claim record
    const discountPercent = Number(discount.percent_off ?? 0);

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("offer_purchases")
      .insert({
        discount_id: discountId,
        user_id: user.id,
        business_id: discount.business_id,
        original_price_cents: 0,
        discount_percent: discountPercent,
        final_price_cents: 0,
        amount_paid_cents: 0,
        commission_percent: 0,
        commission_amount_cents: 0,
        business_payout_cents: 0,
        status: "paid",
        qr_code_token: qrCodeToken,
        expires_at: expiresAt,
        party_size: partySize,
        claim_type: withReservation ? "with_reservation" : "walk_in",
        reservation_id: reservationId,
      })
      .select()
      .single();

    if (purchaseError) {
      logStep("Purchase insert error", purchaseError);
      // Clean up reservation if purchase failed
      if (reservationId) {
        await supabaseAdmin.from("reservations").delete().eq("id", reservationId);
      }
      throw new Error("Failed to create claim record");
    }
    logStep("Claim record created", { purchaseId: purchase.id, hasReservation: !!reservationId });

    // Deduct people from availability
    const newPeopleRemaining = peopleRemaining - partySize;
    const { error: updateError } = await supabaseAdmin
      .from("discounts")
      .update({ 
        people_remaining: newPeopleRemaining,
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

    // Send email + in-app + push to user
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-offer-claim-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          purchaseId: purchase.id,
          userId: user.id,
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
          showReservationCta: false,
          businessId: discount.business_id,
          hasReservation: !!reservationId,
          reservationDate: reservationData?.preferred_date,
          reservationTime: reservationData?.preferred_time,
        }),
      });
      const emailResult = await emailResponse.text();
      logStep("User email sent", { status: emailResponse.status, result: emailResult.substring(0, 100) });
    } catch (emailError) {
      logStep("User email error", String(emailError));
    }

    // Also create in-app notification directly (backup) 
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: user.id,
        title: '🎁 Προσφορά διεκδικήθηκε!',
        message: `"${discount.title}" από ${discount.businesses.name} - έτοιμη για εξαργύρωση`,
        type: 'offer',
        event_type: 'offer_claimed',
        entity_type: 'offer',
        entity_id: purchase.id,
        deep_link: `/dashboard-user/offers`,
        delivered_at: new Date().toISOString(),
      });
      logStep("User in-app notification created directly");
    } catch (notifError) {
      logStep("User in-app notification error", String(notifError));
    }

    // Send push notification to user
    try {
      const pushResult = await sendPushIfEnabled(user.id, {
        title: '🎁 Προσφορά διεκδικήθηκε!',
        body: `"${discount.title}" από ${discount.businesses.name}`,
        tag: `offer-claim-${purchase.id}`,
        data: {
          url: `/dashboard-user/offers`,
          type: 'offer_claimed',
          entityType: 'offer',
          entityId: purchase.id,
        },
      }, supabaseAdmin);
      logStep("User push notification sent", pushResult);
    } catch (pushError) {
      logStep("User push notification error", String(pushError));
    }

    // Send notification to business
    if (businessOwner?.email) {
      try {
        const businessNotifResponse = await fetch(`${supabaseUrl}/functions/v1/send-offer-claim-business-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            businessEmail: businessOwner.email,
            businessName: discount.businesses.name,
            businessUserId: discount.businesses.user_id,
            offerTitle: discount.title,
            customerName: userName,
            partySize,
            claimedAt: new Date().toISOString(),
            remainingPeople: newPeopleRemaining,
            totalPeople: discount.total_people,
            hasReservation: !!reservationId,
            reservationDate: reservationData?.preferred_date,
            reservationTime: reservationData?.preferred_time,
          }),
        });
        const businessNotifResult = await businessNotifResponse.text();
        logStep("Business notification sent", { status: businessNotifResponse.status, result: businessNotifResult.substring(0, 100) });
      } catch (notifError) {
        logStep("Business notification error", String(notifError));
      }
    }

    // Also create in-app notification for business directly (backup)
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: discount.businesses.user_id,
        title: '🎁 Νέα διεκδίκηση προσφοράς!',
        message: `${userName} διεκδίκησε "${discount.title}" για ${partySize} ${partySize === 1 ? 'άτομο' : 'άτομα'}`,
        type: 'business',
        event_type: 'offer_claimed',
        entity_type: 'offer',
        entity_id: purchase.id,
        deep_link: '/dashboard-business/offers',
        delivered_at: new Date().toISOString(),
      });
      logStep("Business in-app notification created directly");
    } catch (notifError) {
      logStep("Business in-app notification error", String(notifError));
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
        showReservationCta: false,
        businessId: discount.business_id,
        hasReservation: !!reservationId,
        reservationId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error?.message });

    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Unknown error" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
