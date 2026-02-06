import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
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

    // Get business info for notifications
    const { data: businessData } = await supabaseAdmin
      .from("businesses")
      .select("user_id, name")
      .eq("id", body.businessId)
      .single();

    const customerName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : 'Πελάτης';

    // Create in-app notification for business owner
    if (businessData?.user_id) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: businessData.user_id,
          title: '✅ Εξαργύρωση προσφοράς!',
          message: `${customerName} εξαργύρωσε "${discount.title}"`,
          type: 'business',
          event_type: 'offer_redeemed',
          entity_type: 'offer',
          entity_id: purchase.id,
          deep_link: '/dashboard-business/discounts',
          delivered_at: nowIso,
        });
        logStep("Business in-app notification created");
      } catch (notifError) {
        logStep("Failed to create business notification", notifError);
      }
    }

    // Create in-app notification for user (offer holder)
    if (purchase.user_id) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: purchase.user_id,
          title: '✅ Προσφορά εξαργυρώθηκε!',
          message: `"${discount.title}"${businessData?.name ? ` - ${businessData.name}` : ''} εξαργυρώθηκε επιτυχώς`,
          type: 'offer',
          event_type: 'offer_redeemed',
          entity_type: 'offer',
          entity_id: purchase.id,
          deep_link: '/dashboard-user/offers',
          delivered_at: nowIso,
        });
        logStep("User in-app notification created");
      } catch (notifError) {
        logStep("Failed to create user notification", notifError);
      }

      // Send push notification to user
      try {
        await sendPushIfEnabled(
          purchase.user_id,
          {
            title: '✅ Προσφορά εξαργυρώθηκε!',
            body: `"${discount.title}" εξαργυρώθηκε επιτυχώς`,
            tag: `offer-redeemed-${purchase.id}`,
            data: {
              url: '/dashboard-user/offers',
              type: 'offer_redeemed',
              entityType: 'offer',
              entityId: purchase.id,
            },
          },
          supabaseAdmin
        );
        logStep("User push notification sent");
      } catch (pushError) {
        logStep("User push failed", pushError);
      }
    }

    // Send push notification to business (ALWAYS for essential)
    if (businessData?.user_id) {
      try {
        await sendPushIfEnabled(
          businessData.user_id,
          {
            title: '✅ Εξαργύρωση προσφοράς!',
            body: `${customerName} εξαργύρωσε "${discount.title}"`,
            tag: `biz-offer-redeemed-${purchase.id}`,
            data: {
              url: '/dashboard-business/discounts',
              type: 'offer_redeemed',
              entityType: 'offer',
              entityId: purchase.id,
            },
          },
          supabaseAdmin
        );
        logStep("Business push notification sent");
      } catch (pushError) {
        logStep("Business push failed", pushError);
      }
    }

    // Send emails (ALWAYS) to both user + business
    try {
      const [{ data: userEmailRow }, { data: bizEmailRow }] = await Promise.all([
        supabaseAdmin.from('profiles').select('email').eq('id', purchase.user_id).single(),
        businessData?.user_id
          ? supabaseAdmin.from('profiles').select('email').eq('id', businessData.user_id).single()
          : Promise.resolve({ data: null } as any),
      ]);

      const userEmail = (userEmailRow as any)?.email as string | undefined;
      const businessEmail = (bizEmailRow as any)?.email as string | undefined;

      const subjectUser = `✅ Η προσφορά εξαργυρώθηκε: ${discount.title}`;
      const subjectBiz = `✅ Νέα εξαργύρωση προσφοράς: ${discount.title}`;

      const baseWrap = (content: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:20px;background:#f4f4f5;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);"><div style="background:linear-gradient(180deg,#0d3b66 0%,#4ecdc4 100%);padding:48px 24px 36px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:42px;font-weight:bold;letter-spacing:4px;font-family:'Cinzel',Georgia,serif;">ΦΟΜΟ</h1><p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Offer Redemption</p></div><div style="padding:32px 24px;">${content}</div><div style="background:#102b4a;padding:28px;text-align:center;"><p style="color:#3ec3b7;font-size:18px;font-weight:bold;letter-spacing:2px;margin:0 0 8px;font-family:'Cinzel',Georgia,serif;">ΦΟΜΟ</p><p style="color:#94a3b8;font-size:12px;margin:0;">© 2025 ΦΟΜΟ.</p></div></div></body></html>`;

      const userHtml = baseWrap(`
        <h2 style="color:#0d3b66;margin:0 0 12px 0;">Η προσφορά εξαργυρώθηκε ✅</h2>
        <p style="color:#475569;margin:0;line-height:1.6;">Η προσφορά <strong>${discount.title}</strong> εξαργυρώθηκε επιτυχώς${businessData?.name ? ` στο <strong>${businessData.name}</strong>` : ''}.</p>
      `);

      const bizHtml = baseWrap(`
        <h2 style="color:#0d3b66;margin:0 0 12px 0;">Νέα εξαργύρωση προσφοράς ✅</h2>
        <p style="color:#475569;margin:0;line-height:1.6;"><strong>${customerName || 'Πελάτης'}</strong> εξαργύρωσε την προσφορά <strong>${discount.title}</strong>.</p>
      `);

      if (userEmail) {
        await resend.emails.send({
          from: "ΦΟΜΟ <notifications@fomo.com.cy>",
          to: [userEmail],
          subject: subjectUser,
          html: userHtml,
        });
      }

      if (businessEmail) {
        await resend.emails.send({
          from: "ΦΟΜΟ <notifications@fomo.com.cy>",
          to: [businessEmail],
          subject: subjectBiz,
          html: bizHtml,
        });
      }

      logStep('Offer redemption emails sent', { user: !!userEmail, business: !!businessEmail });
    } catch (emailErr) {
      logStep('Offer redemption email error (non-fatal)', {
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

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
