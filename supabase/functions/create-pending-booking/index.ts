// Edge Function: create-pending-booking
// Phase 2 — Atomic creation of a pending booking + SMS dispatch
//
// Flow:
//   1. Authenticate caller (JWT)
//   2. Validate input (Zod)
//   3. Verify business ownership
//   4. Verify event ownership (if provided)
//   5. Check SMS rate limits BEFORE creating any DB rows
//   6. Insert pending_booking (DB trigger generates 16-char token)
//   7. Send SMS via send-booking-sms function
//   8. If SMS fails → mark pending_booking as 'cancelled' (cleanup)
//   9. Return { token, booking_url, pending_booking_id, expires_at }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  z,
  parseBody,
  uuid,
  optionalString,
  positiveInt,
  ValidationError,
  validationErrorResponse,
} from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Public booking URL — fixed to production domain
const PUBLIC_BOOKING_BASE_URL = "https://fomo.com.cy/r";

// E.164 phone validation (must include +, 8-15 digits total)
const e164Phone = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format (e.g. +35799123456)");

const BodySchema = z.object({
  business_id: uuid,
  event_id: uuid.nullable().optional(),
  booking_type: z.enum(["reservation", "ticket", "walk_in"]),
  customer_phone: e164Phone,
  customer_name: optionalString(200),
  party_size: positiveInt.max(500).nullable().optional(),
  seating_preference: optionalString(100),
  preferred_time: optionalString(100),
  tier_data: z.record(z.unknown()).nullable().optional(),
  notes: optionalString(1000),
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // ── 1. Authenticate ───────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing or invalid Authorization header" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[create-pending-booking] Missing Supabase env vars");
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const user = userData.user;

    // ── 2. Validate input ─────────────────────────────────────
    let body: z.infer<typeof BodySchema>;
    try {
      body = await parseBody(req, BodySchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        return validationErrorResponse(err, corsHeaders);
      }
      throw err;
    }

    // ── 3. Verify business ownership (service role) ──────────
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: business, error: bizError } = await adminClient
      .from("businesses")
      .select("id, user_id, name")
      .eq("id", body.business_id)
      .maybeSingle();

    if (bizError) {
      console.error("[create-pending-booking] Business lookup error:", bizError);
      return jsonResponse({ error: "Failed to verify business" }, 500);
    }
    if (!business) {
      return jsonResponse({ error: "Business not found" }, 404);
    }
    if (business.user_id !== user.id) {
      return jsonResponse({ error: "Forbidden: not your business" }, 403);
    }

    // ── 4. If event_id provided, verify it belongs to this business ──
    if (body.event_id) {
      const { data: ev, error: evErr } = await adminClient
        .from("events")
        .select("id, business_id")
        .eq("id", body.event_id)
        .maybeSingle();

      if (evErr) {
        console.error("[create-pending-booking] Event lookup error:", evErr);
        return jsonResponse({ error: "Failed to verify event" }, 500);
      }
      if (!ev || ev.business_id !== body.business_id) {
        return jsonResponse({ error: "Event not found or not yours" }, 404);
      }
    }

    // ── 5. Pre-check SMS rate limit (avoid orphan booking) ──
    const { data: rateCheck, error: rateErr } = await adminClient.rpc(
      "check_sms_rate_limit",
      { _phone: body.customer_phone, _business_id: body.business_id }
    );

    if (rateErr) {
      console.error("[create-pending-booking] Rate limit RPC error:", rateErr);
      return jsonResponse({ error: "Failed to check rate limit" }, 500);
    }

    const rc = (rateCheck ?? {}) as { allowed?: boolean; reason?: string };
    if (!rc.allowed) {
      return jsonResponse(
        { error: "Rate limit exceeded", reason: rc.reason ?? "rate_limited" },
        429
      );
    }

    // ── 6. Insert pending_booking (token auto-generated by trigger) ──
    const { data: pending, error: insErr } = await adminClient
      .from("pending_bookings")
      .insert({
        business_id: body.business_id,
        event_id: body.event_id ?? null,
        created_by_user_id: user.id,
        booking_type: body.booking_type,
        customer_phone: body.customer_phone,
        customer_name: body.customer_name || null,
        party_size: body.party_size ?? null,
        seating_preference: body.seating_preference || null,
        preferred_time: body.preferred_time || null,
        tier_data: body.tier_data ?? null,
        notes: body.notes || null,
        status: "pending",
      })
      .select("id, token, expires_at")
      .single();

    if (insErr || !pending) {
      console.error("[create-pending-booking] Insert error:", insErr);
      return jsonResponse({ error: "Failed to create pending booking" }, 500);
    }

    // Audit log: 'created'
    try {
      await adminClient.rpc("log_pending_booking_audit", {
        _pending_booking_id: pending.id,
        _business_id: body.business_id,
        _action: "created",
        _actor_user_id: user.id,
        _metadata: {
          booking_type: body.booking_type,
          event_id: body.event_id ?? null,
          customer_phone: body.customer_phone,
        },
      });
    } catch (e) {
      console.error("[create-pending-booking] Audit log error:", e);
    }

    const bookingUrl = `${PUBLIC_BOOKING_BASE_URL}/${pending.token}`;
    const messageBody = `ΦΟΜΟ: Complete your booking at ${business.name}: ${bookingUrl}`;

    // ── 7. Dispatch SMS via send-booking-sms (forward caller JWT) ──
    const smsResp = await fetch(
      `${SUPABASE_URL}/functions/v1/send-booking-sms`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          business_id: body.business_id,
          pending_booking_id: pending.id,
          to_phone: body.customer_phone,
          message_body: messageBody,
        }),
      }
    );

    if (!smsResp.ok) {
      const errText = await smsResp.text().catch(() => "");
      console.error(
        "[create-pending-booking] SMS dispatch failed:",
        smsResp.status,
        errText
      );

      // Cleanup: cancel the pending booking so the token can't be used
      await adminClient
        .from("pending_bookings")
        .update({ status: "cancelled" })
        .eq("id", pending.id);

      return jsonResponse(
        {
          error: "Failed to send SMS",
          details: errText.slice(0, 500),
        },
        502
      );
    }

    const smsResult = await smsResp.json().catch(() => ({}));

    return jsonResponse(
      {
        success: true,
        pending_booking_id: pending.id,
        token: pending.token,
        booking_url: bookingUrl,
        expires_at: pending.expires_at,
        sms: smsResult,
      },
      200
    );
  } catch (err) {
    console.error("[create-pending-booking] Unexpected error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "Internal server error", details: msg }, 500);
  }
});
