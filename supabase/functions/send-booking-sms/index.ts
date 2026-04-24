// supabase/functions/send-booking-sms/index.ts
// Φάση 1Β — Στέλνει SMS booking link μέσω Twilio (Messaging Service)
// Ελέγχει rate limits, καταγράφει στο sms_charges + sms_rate_limits.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

interface RequestBody {
  business_id: string;
  to_phone: string; // E.164
  message_body: string;
  pending_booking_id?: string | null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ---- Env ----
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Supabase env not configured" }, 500);
  }
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);
  if (!TWILIO_API_KEY) return json({ error: "TWILIO_API_KEY not configured" }, 500);
  if (!TWILIO_MESSAGING_SERVICE_SID)
    return json({ error: "TWILIO_MESSAGING_SERVICE_SID not configured" }, 500);

  // ---- Auth (verify caller is logged in) ----
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing Authorization header" }, 401);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userId = userData.user.id;

  // ---- Parse & validate body ----
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { business_id, to_phone, message_body, pending_booking_id } = body ?? {};

  if (!business_id || typeof business_id !== "string") {
    return json({ error: "business_id is required" }, 400);
  }
  if (!to_phone || typeof to_phone !== "string" || !isE164(to_phone)) {
    return json({ error: "to_phone must be in E.164 format (e.g. +35799123456)" }, 400);
  }
  if (!message_body || typeof message_body !== "string" || message_body.length > 480) {
    return json({ error: "message_body required (max 480 chars)" }, 400);
  }

  // ---- Service-role client for DB ops ----
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ---- Verify business ownership ----
  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select("id, user_id, name, sms_sending_paused, sms_paused_reason")
    .eq("id", business_id)
    .maybeSingle();

  if (bizErr) {
    console.error("Business lookup error:", bizErr);
    return json({ error: "Failed to verify business" }, 500);
  }
  if (!biz) return json({ error: "Business not found" }, 404);
  if (biz.user_id !== userId) {
    return json({ error: "You do not own this business" }, 403);
  }

  // ---- SMS sending paused check (Φάση 6: 3 failed card charges) ----
  if (biz.sms_sending_paused) {
    return json(
      {
        error: "sms_sending_paused",
        reason: biz.sms_paused_reason ?? "payment_failed",
        message:
          "SMS sending has been paused for this business. Please update your payment method.",
      },
      402, // Payment Required
    );
  }

  // ---- Rate-limit check ----
  const { data: rateCheck, error: rateErr } = await admin.rpc("check_sms_rate_limit", {
    _phone: to_phone,
    _business_id: business_id,
  });
  if (rateErr) {
    console.error("Rate limit RPC error:", rateErr);
    return json({ error: "Rate limit check failed" }, 500);
  }
  const rate = rateCheck as { allowed: boolean; reason?: string; limit?: number } | null;
  if (!rate?.allowed) {
    return json(
      {
        error: "rate_limited",
        reason: rate?.reason ?? "unknown",
        limit: rate?.limit,
      },
      429,
    );
  }

  // ---- Send SMS via Twilio gateway ----
  let twilioSid: string | null = null;
  let twilioStatus: string = "queued";
  let twilioNumSegments = 1;
  let errorCode: string | null = null;
  let errorMessage: string | null = null;

  try {
    const twilioParams = new URLSearchParams({
      To: to_phone,
      MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
      Body: message_body,
    });

    const twilioResp = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: twilioParams,
    });

    const twilioJson = await twilioResp.json();

    if (!twilioResp.ok) {
      console.error("Twilio API error:", twilioResp.status, twilioJson);
      errorCode = String(twilioJson?.code ?? twilioResp.status);
      errorMessage = String(twilioJson?.message ?? "Twilio request failed");

      // Log a failed charge row (not billable)
      await admin.from("sms_charges").insert({
        business_id,
        pending_booking_id: pending_booking_id ?? null,
        to_phone,
        message_body,
        status: "failed",
        is_billable: false,
        error_code: errorCode,
        error_message: errorMessage,
      });

      return json(
        { error: "twilio_error", code: errorCode, message: errorMessage },
        502,
      );
    }

    twilioSid = twilioJson.sid ?? null;
    twilioStatus = twilioJson.status ?? "queued";
    // Capture num_segments from initial Twilio response (may also be updated by the
    // status webhook). Twilio returns it as string in num_segments field.
    var twilioNumSegments = Math.max(1, parseInt(String(twilioJson.num_segments ?? "1"), 10) || 1);
  } catch (e) {
    console.error("Twilio fetch threw:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";

    await admin.from("sms_charges").insert({
      business_id,
      pending_booking_id: pending_booking_id ?? null,
      to_phone,
      message_body,
      status: "failed",
      is_billable: false,
      error_message: msg,
    });

    return json({ error: "twilio_request_failed", message: msg }, 502);
  }

  // ---- Persist charge + rate-limit row ----
  const { data: charge, error: chargeErr } = await admin
    .from("sms_charges")
    .insert({
      business_id,
      pending_booking_id: pending_booking_id ?? null,
      to_phone,
      message_body,
      twilio_message_sid: twilioSid,
      status: twilioStatus as
        | "queued"
        | "sent"
        | "delivered"
        | "failed"
        | "undelivered",
      is_billable: false, // becomes true via Twilio status webhook (Φάση 5)
    })
    .select("id")
    .single();

  if (chargeErr) {
    console.error("Failed to insert sms_charge:", chargeErr);
    // SMS already sent — do not fail the whole request
  }

  const { error: rateInsertErr } = await admin.from("sms_rate_limits").insert({
    phone_number: to_phone,
    business_id,
  });
  if (rateInsertErr) {
    console.error("Failed to insert sms_rate_limit:", rateInsertErr);
  }

  // ---- Increment daily SMS quota + check 160/200 admin alert threshold ----
  let quotaInfo: { sms_count?: number; threshold_crossed?: boolean } = {};
  try {
    const { data: q, error: qErr } = await admin.rpc("increment_sms_daily_quota", {
      _business_id: business_id,
    });
    if (qErr) {
      console.error("increment_sms_daily_quota failed:", qErr);
    } else if (q && typeof q === "object") {
      quotaInfo = q as { sms_count: number; threshold_crossed: boolean };

      // Notify all admins when business crosses 160/200 daily threshold
      if (quotaInfo.threshold_crossed) {
        try {
          const { data: admins } = await admin
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (admins && admins.length > 0) {
            const rows = admins.map((a: { user_id: string }) => ({
              user_id: a.user_id,
              type: "admin_alert",
              event_type: "sms_quota_threshold",
              title: "⚠️ SMS Quota Alert",
              message: `${biz.name} έχει στείλει ${quotaInfo.sms_count}/200 SMS σήμερα.`,
              entity_type: "business",
              entity_id: business_id,
              read: false,
            }));
            const { error: notifErr } = await admin.from("notifications").insert(rows);
            if (notifErr) {
              console.error("Failed to insert admin notifications:", notifErr);
            }
          }
        } catch (e) {
          console.error("Admin notification error:", e);
        }
      }
    }
  } catch (e) {
    console.error("Quota tracking error:", e);
  }

  // ---- Audit log entry ----
  try {
    await admin.rpc("log_pending_booking_audit", {
      _pending_booking_id: pending_booking_id ?? null,
      _business_id: business_id,
      _action: "sms_sent",
      _actor_user_id: userId,
      _metadata: {
        twilio_message_sid: twilioSid,
        twilio_status: twilioStatus,
        sms_charge_id: charge?.id ?? null,
      },
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }

  return json({
    success: true,
    twilio_message_sid: twilioSid,
    status: twilioStatus,
    sms_charge_id: charge?.id ?? null,
    daily_sms_count: quotaInfo.sms_count,
  });
});
