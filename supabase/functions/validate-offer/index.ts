import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Language = "el" | "en";

type ValidateOfferRequest = {
  qrToken: string;
  businessId: string;
  language?: Language;
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[VALIDATE-OFFER] ${step}`, details ? JSON.stringify(details) : "");
};

const msg = (language: Language) => ({
  success: language === "el" ? "Επιτυχής Επαλήθευση!" : "Successfully Verified!",
  notFound: language === "el" ? "Η αγορά δεν βρέθηκε" : "Purchase not found",
  wrongBusiness:
    language === "el"
      ? "Αυτή η αγορά δεν ανήκει στην επιχείρησή σας"
      : "This purchase doesn't belong to your business",
  alreadyRedeemed:
    language === "el"
      ? "Αυτή η αγορά έχει ήδη εξαργυρωθεί"
      : "This purchase has already been redeemed",
  expired: language === "el" ? "Αυτή η αγορά έχει λήξει" : "This purchase has expired",
  notPaid:
    language === "el" ? "Αυτή η αγορά δεν έχει πληρωθεί" : "This purchase hasn't been paid",
  notValidToday:
    language === "el" ? "Η προσφορά δεν ισχύει σήμερα" : "This offer is not valid today",
  notValidHours:
    language === "el"
      ? "Η προσφορά ισχύει μόνο σε συγκεκριμένες ώρες"
      : "This offer is only valid during specific hours",
  unauthorized: language === "el" ? "Μη εξουσιοδοτημένο" : "Unauthorized",
  invalidRequest: language === "el" ? "Μη έγκυρο αίτημα" : "Invalid request",
  internalError: language === "el" ? "Σφάλμα σάρωσης" : "Scan error",
});

const withinOfferHoursCyprus = (start: string, end: string, nowHHMM: string) => {
  const startTime = String(start).substring(0, 5);
  const endTime = String(end).substring(0, 5);

  // Overnight window (e.g., 22:00-04:00)
  if (endTime < startTime) {
    return nowHHMM >= startTime || nowHHMM <= endTime;
  }

  return nowHHMM >= startTime && nowHHMM <= endTime;
};

// Helper to safely log scan without breaking the flow
const logScan = async (
  supabaseAdmin: any,
  discountId: string | null,
  scannedBy: string,
  success: boolean,
  locationInfo: Record<string, unknown>
) => {
  try {
    await supabaseAdmin.from("discount_scans").insert({
      discount_id: discountId,
      scanned_by: scannedBy,
      scan_type: "offer_redeem",
      scanned_at: new Date().toISOString(),
      success,
      location_info: locationInfo,
    });
  } catch (e) {
    console.error("[VALIDATE-OFFER] Failed to log scan", e);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: msg("en").unauthorized }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, message: msg("en").unauthorized }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ValidateOfferRequest;
    const language: Language = body.language === "el" ? "el" : "en";
    const m = msg(language);

    if (!body.qrToken || !body.businessId) {
      return new Response(JSON.stringify({ success: false, message: m.invalidRequest }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Request", { userId: user.id, businessId: body.businessId, qrToken: body.qrToken });

    // Verify the caller actually owns this business
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, user_id")
      .eq("id", body.businessId)
      .single();

    if (businessError || !business) {
      logStep("Business not found", { businessError });
      return new Response(JSON.stringify({ success: false, message: m.wrongBusiness }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (business.user_id !== user.id) {
      logStep("Wrong business owner", { expected: business.user_id, actual: user.id });
      return new Response(JSON.stringify({ success: false, message: m.wrongBusiness }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch purchase by QR token
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("offer_purchases")
      .select(
        `
        id,
        discount_id,
        user_id,
        reservation_id,
        original_price_cents,
        discount_percent,
        final_price_cents,
        status,
        created_at,
        expires_at,
        redeemed_at,
        redeemed_by,
        qr_code_token,
        discounts (
          id,
          title,
          description,
          business_id,
          valid_days,
          valid_start_time,
          valid_end_time
        )
      `
      )
      .eq("qr_code_token", body.qrToken)
      .single();

    if (purchaseError || !purchase) {
      logStep("Purchase not found", { purchaseError, qrToken: body.qrToken });
      await logScan(supabaseAdmin, null, user.id, false, { reason: "not_found", qrToken: body.qrToken });

      return new Response(JSON.stringify({ success: false, message: m.notFound }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Purchase found", { purchaseId: purchase.id, status: purchase.status });

    // Verify purchase belongs to the business
    const discount = purchase.discounts as any;
    if (!discount || discount.business_id !== body.businessId) {
      logStep("Discount mismatch", { discountBusinessId: discount?.business_id, requestedBusinessId: body.businessId });
      await logScan(supabaseAdmin, purchase.discount_id, user.id, false, { reason: "wrong_business" });

      return new Response(JSON.stringify({ success: false, message: m.wrongBusiness }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Status checks
    if (purchase.status === "redeemed") {
      logStep("Already redeemed", { redeemedAt: purchase.redeemed_at });
      await logScan(supabaseAdmin, purchase.discount_id, user.id, false, { reason: "already_redeemed" });

      return new Response(JSON.stringify({ success: false, message: m.alreadyRedeemed }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (purchase.status !== "paid") {
      logStep("Not paid", { status: purchase.status });
      await logScan(supabaseAdmin, purchase.discount_id, user.id, false, { reason: "not_paid", status: purchase.status });

      return new Response(JSON.stringify({ success: false, message: m.notPaid }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Expiry
    if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
      logStep("Expired", { expiresAt: purchase.expires_at });
      await logScan(supabaseAdmin, purchase.discount_id, user.id, false, { reason: "expired" });

      return new Response(JSON.stringify({ success: false, message: m.expired }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce days/hours at redemption time (Cyprus timezone)
    if (discount?.valid_days && Array.isArray(discount.valid_days) && discount.valid_days.length > 0) {
      const cyprusWeekday = new Date()
        .toLocaleDateString("en-US", { timeZone: "Europe/Nicosia", weekday: "long" })
        .toLowerCase();

      if (!discount.valid_days.map((d: string) => String(d).toLowerCase()).includes(cyprusWeekday)) {
        logStep("Not valid today", { cyprusWeekday, validDays: discount.valid_days });
        await logScan(supabaseAdmin, purchase.discount_id, user.id, false, { 
          reason: "not_valid_today", 
          cyprusWeekday, 
          valid_days: discount.valid_days 
        });

        return new Response(JSON.stringify({ success: false, message: m.notValidToday }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (discount?.valid_start_time && discount?.valid_end_time) {
      const cyprusTime = new Date().toLocaleTimeString("en-GB", {
        timeZone: "Europe/Nicosia",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      if (!withinOfferHoursCyprus(discount.valid_start_time, discount.valid_end_time, cyprusTime)) {
        logStep("Not valid hours", { cyprusTime, start: discount.valid_start_time, end: discount.valid_end_time });
        await logScan(supabaseAdmin, purchase.discount_id, user.id, false, { 
          reason: "not_valid_hours", 
          cyprusTime, 
          start: discount.valid_start_time, 
          end: discount.valid_end_time 
        });

        return new Response(JSON.stringify({ success: false, message: m.notValidHours }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Redeem (atomic-ish)
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("offer_purchases")
      .update({
        status: "redeemed",
        redeemed_at: nowIso,
        redeemed_by: user.id,
      })
      .eq("id", purchase.id)
      .eq("status", "paid");

    if (updateError) {
      logStep("Update failed", { updateError });
      await logScan(supabaseAdmin, purchase.discount_id, user.id, false, { 
        reason: "update_failed", 
        error: updateError.message 
      });

      return new Response(JSON.stringify({ success: false, message: m.internalError }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If this offer purchase is linked to a reservation, mark it as checked-in too.
    // This is what makes "κράτηση μέσω προσφοράς" flip to Check-in immediately after scanning.
    try {
      const reservationId = (purchase as any)?.reservation_id as string | null | undefined;
      if (reservationId) {
        await supabaseAdmin
          .from('reservations')
          .update({
            checked_in_at: nowIso,
            checked_in_by: user.id,
          })
          .eq('id', reservationId)
          .is('checked_in_at', null);
      }
    } catch (e) {
      console.error('[VALIDATE-OFFER] Failed to check-in linked reservation', e);
    }

    // Fetch profile for display
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", purchase.user_id)
      .single();

    logStep("Success", { purchaseId: purchase.id, duration: Date.now() - startedAt });

    return new Response(
      JSON.stringify({
        success: true,
        message: m.success,
        purchase: {
          ...purchase,
          profiles: profile ?? null,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[VALIDATE-OFFER] Unhandled error", error);
    return new Response(JSON.stringify({ success: false, message: msg("en").internalError }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
