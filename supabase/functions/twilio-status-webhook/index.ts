// Edge Function: twilio-status-webhook
// Φάση 5 — Twilio status callback webhook
//
// Twilio posts delivery status updates here for each SMS we send via Messaging Service.
// We update sms_charges.status and flip is_billable=true for delivered/sent statuses.
// We also write an audit log entry when the SMS is delivered or fails.
//
// Twilio sends application/x-www-form-urlencoded data with these fields:
//   MessageSid, MessageStatus, To, From, ErrorCode (optional), ErrorMessage (optional)
//
// Security: Twilio signs the webhook with X-Twilio-Signature. We validate using
// HMAC-SHA1 with the Twilio Auth Token. If TWILIO_AUTH_TOKEN is not set, we skip
// signature validation (development fallback) and log a warning.
//
// IMPORTANT: This function uses verify_jwt = false (set in supabase/config.toml)
// because Twilio cannot send Supabase JWTs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-twilio-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Twilio billable statuses — we charge for delivered (and sent as fallback if no DLR)
const BILLABLE_STATUSES = new Set(["sent", "delivered"]);
const FINAL_STATUSES = new Set(["delivered", "failed", "undelivered"]);
const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

function normalizeTwilioStatus(status: string): "queued" | "sent" | "delivered" | "failed" | "undelivered" {
  switch (status.toLowerCase()) {
    case "accepted":
    case "scheduled":
    case "sending":
    case "queued":
      return "queued";
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "failed":
      return "failed";
    case "undelivered":
      return "undelivered";
    default:
      return "queued";
  }
}

function toCentsFromTwilioPrice(price: string | null | undefined): number | null {
  if (!price) return null;
  const amount = Number(price);
  if (!Number.isFinite(amount)) return null;
  return Math.round(Math.abs(amount) * 100);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Twilio signature validation: HMAC-SHA1 of (full URL + sorted POST params concat)
function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) {
    data += k + params[k];
  }
  const hmac = createHmac("sha1", authToken);
  hmac.update(data);
  const expected = hmac.digest("base64");
  return expected === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    // Parse form-encoded body
    const rawBody = await req.text();
    const params: Record<string, string> = {};
    new URLSearchParams(rawBody).forEach((v, k) => {
      params[k] = v;
    });

    // Validate Twilio signature (if auth token configured)
    if (TWILIO_AUTH_TOKEN) {
      const signature = req.headers.get("x-twilio-signature") ?? "";
      // Twilio computes signature using the public-facing URL
      const url = req.url;
      const valid = validateTwilioSignature(TWILIO_AUTH_TOKEN, url, params, signature);
      if (!valid) {
        console.error("[twilio-status-webhook] Invalid signature", {
          url,
          paramKeys: Object.keys(params),
        });
        return jsonResponse({ error: "Invalid signature" }, 403);
      }
    } else {
      console.warn("[twilio-status-webhook] TWILIO_AUTH_TOKEN not set — skipping signature check");
    }

    const messageSid = params["MessageSid"];
    const messageStatus = params["MessageStatus"];
    const errorCode = params["ErrorCode"] || null;
    const errorMessage = params["ErrorMessage"] || null;
    // Twilio sends NumSegments as a string in the status callback
    const numSegments = Math.max(
      1,
      parseInt(String(params["NumSegments"] ?? "1"), 10) || 1,
    );

    if (!messageSid || !messageStatus) {
      return jsonResponse({ error: "Missing MessageSid or MessageStatus" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Lookup the sms_charge row by Twilio SID
    const { data: charge, error: lookupErr } = await admin
      .from("sms_charges")
      .select("id, business_id, pending_booking_id, status, is_billable")
      .eq("twilio_message_sid", messageSid)
      .maybeSingle();

    if (lookupErr) {
      console.error("[twilio-status-webhook] Lookup error", lookupErr);
      return jsonResponse({ error: "Lookup failed" }, 500);
    }

    if (!charge) {
      // Not necessarily an error — could be a webhook for a deleted charge or duplicate
      console.warn("[twilio-status-webhook] No sms_charge found for SID", messageSid);
      return jsonResponse({ ok: true, message: "no_matching_charge" }, 200);
    }

    const normalizedStatus = normalizeTwilioStatus(messageStatus);
    const becomesBillable = BILLABLE_STATUSES.has(normalizedStatus) && !charge.is_billable;
    const isFinal = FINAL_STATUSES.has(normalizedStatus);

    const updates: Record<string, unknown> = {
      status: normalizedStatus,
      updated_at: new Date().toISOString(),
    };

    let exactCostCents: number | null = null;
    let exactCurrency: string | null = null;

    if (messageSid && LOVABLE_API_KEY && TWILIO_API_KEY) {
      try {
        const twilioResp = await fetch(`${TWILIO_GATEWAY}/Messages/${messageSid}.json`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
          },
        });
        if (twilioResp.ok) {
          const twilioJson = await twilioResp.json();
          exactCostCents = toCentsFromTwilioPrice(twilioJson?.price ?? null);
          exactCurrency = typeof twilioJson?.price_unit === "string" ? String(twilioJson.price_unit).toUpperCase() : null;
          const fetchedSegments = Math.max(1, parseInt(String(twilioJson?.num_segments ?? params["NumSegments"] ?? "1"), 10) || 1);
          updates.num_segments = fetchedSegments;
          if (exactCostCents !== null) updates.cost_cents = exactCostCents;
          if (exactCurrency) updates.cost_currency = exactCurrency;
        } else {
          console.warn("[twilio-status-webhook] Failed to fetch exact Twilio message pricing", { status: twilioResp.status, messageSid });
        }
      } catch (fetchErr) {
        console.error("[twilio-status-webhook] Exact Twilio pricing fetch error", fetchErr);
      }
    }

    if (becomesBillable) {
      updates.is_billable = true;
      if (exactCostCents === null) {
        updates.cost_cents = 5;
      }
      if (!exactCurrency) {
        updates.cost_currency = "EUR";
      }
    }

    // Always refresh num_segments from the webhook (initial send may have estimated 1)
    if (numSegments > 0) updates.num_segments = numSegments;

    if (errorCode) updates.error_code = errorCode;
    if (errorMessage) updates.error_message = errorMessage;

    const { error: updErr } = await admin
      .from("sms_charges")
      .update(updates)
      .eq("id", charge.id);

    if (updErr) {
      console.error("[twilio-status-webhook] Update error", updErr);
      return jsonResponse({ error: "Update failed" }, 500);
    }

    // Audit log entry on delivery / failure
    if (isFinal && charge.pending_booking_id) {
      const action =
        normalizedStatus === "delivered" ? "sms_delivered" : "sms_failed";
      try {
        await admin.rpc("log_pending_booking_audit", {
          _pending_booking_id: charge.pending_booking_id,
          _business_id: charge.business_id,
          _action: action,
          _actor_user_id: null,
          _metadata: {
            twilio_message_sid: messageSid,
            twilio_status: messageStatus,
            error_code: errorCode,
            error_message: errorMessage,
          },
        });
      } catch (e) {
        console.error("[twilio-status-webhook] Audit log error", e);
      }
    }

    console.log("[twilio-status-webhook] Updated charge", {
      sms_charge_id: charge.id,
      status: normalizedStatus,
      becomes_billable: becomesBillable,
    });

    return jsonResponse({ ok: true, sms_charge_id: charge.id, status: normalizedStatus, cost_cents: updates.cost_cents ?? null, num_segments: updates.num_segments ?? numSegments });
  } catch (err) {
    console.error("[twilio-status-webhook] Unexpected error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "Internal error", details: msg }, 500);
  }
});
