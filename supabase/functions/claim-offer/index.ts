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
  reservation_name?: string;
  phone_number?: string;
  seating_preference?: string | null;
}

interface ClaimOfferRequest {
  discountId: string;
  partySize: number;
  guestNames?: string[];
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
    const { discountId, partySize, guestNames, withReservation, reservationData }: ClaimOfferRequest = await req.json();
    logStep("Request data", { discountId, partySize, guestNames, withReservation, reservationData });

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

    // Atomic availability check with advisory lock
    const { data: claimResult, error: claimError } = await supabaseAdmin
      .rpc("claim_offer_spots_atomically", {
        p_discount_id: discountId,
        p_party_size: partySize,
      });

    if (claimError) {
      throw new Error("Failed to check availability: " + claimError.message);
    }

    if (!claimResult?.success) {
      throw new Error(claimResult?.message || "Not enough spots remaining");
    }
    const peopleRemaining = claimResult.remaining === -1 ? 999 : claimResult.remaining + partySize;

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
    const reservationGuestResults: { guest_name: string; qr_code_token: string }[] = [];
    
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
        reservationData.reservation_name?.trim() ||
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
          event_id: null,
          preferred_time: preferredDateTime,
          party_size: partySize,
          status: "accepted",
          special_requests: `Offer claim: ${discount.title}`,
          confirmation_code: crypto.randomUUID().substring(0, 6).toUpperCase(),
          source: "offer",
          phone: reservationData.phone_number?.trim() || null,
          seating_preference: reservationData.seating_preference || null,
        })
        .select()
        .single();

      if (reservationError) {
        logStep("Reservation insert error", reservationError);
        throw new Error("Failed to create reservation");
      }
      
      reservationId = reservation.id;
      logStep("Reservation created", { reservationId });

      // Create per-guest reservation_guests records with individual QR codes
      const names = guestNames && guestNames.length === partySize 
        ? guestNames 
        : Array.from({ length: partySize }, (_, i) => `Guest ${i + 1}`);
      
      const guestInserts = names.map((name) => ({
        reservation_id: reservationId!,
        guest_name: name.trim() || `Guest`,
        qr_code_token: crypto.randomUUID(),
        status: 'active',
      }));

      const { data: guestEntries, error: guestError } = await supabaseAdmin
        .from('reservation_guests')
        .insert(guestInserts)
        .select('guest_name, qr_code_token');

      if (guestError) {
        logStep("Guest insert error", guestError);
      } else if (guestEntries) {
        reservationGuestResults.push(...guestEntries);
        logStep("Reservation guests created", { count: guestEntries.length });
      }
    }

    // Generate unique QR token for the walk-in offer itself
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
      if (reservationId) {
        await supabaseAdmin.from("reservations").delete().eq("id", reservationId);
      }
      throw new Error("Failed to create claim record");
    }
    logStep("Claim record created", { purchaseId: purchase.id, hasReservation: !!reservationId });

    logStep("Availability already decremented atomically", { remaining: claimResult.remaining });

    // Create per-guest QR codes in offer_purchase_guests for ALL claims (walk-in & reservation)
    const walkInGuestResults: { guest_name: string; qr_code_token: string }[] = [];
    if (partySize >= 1) {
      const names = guestNames && guestNames.length === partySize
        ? guestNames
        : Array.from({ length: partySize }, (_, i) => i === 0 ? 'Guest' : `Guest ${i + 1}`);

      const guestInserts = names.map((name) => ({
        purchase_id: purchase.id,
        guest_name: (name || '').trim() || 'Guest',
        qr_code_token: crypto.randomUUID(),
        status: 'active',
      }));

      const { data: guestEntries, error: guestError } = await supabaseAdmin
        .from('offer_purchase_guests')
        .insert(guestInserts)
        .select('guest_name, qr_code_token');

      if (guestError) {
        logStep("Offer guest insert error", guestError);
      } else if (guestEntries) {
        walkInGuestResults.push(...guestEntries);
        logStep("Offer purchase guests created", { count: guestEntries.length });
      }
    }

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
          "apikey": supabaseServiceKey,
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
            "apikey": supabaseServiceKey,
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
            remainingPeople: claimResult.remaining,
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

    // Combine guest results: reservation guests take priority, fallback to walk-in guests
    const allGuests = reservationGuestResults.length > 0
      ? reservationGuestResults
      : walkInGuestResults;

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
        // Per-guest QR data for ALL claims (walk-in and reservation)
        guests: allGuests.length > 0 ? allGuests : undefined,
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