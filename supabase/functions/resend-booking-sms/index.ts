// Edge Function: resend-booking-sms
// Φάση 3 — Resend SMS for an existing pending_booking
//
// Behavior (per user spec):
//   - Generate NEW 16-char token (via generate_booking_token RPC)
//   - Reset expires_at = now() + 48h
//   - Set status back to 'pending' (handles link_expired → pending)
//   - Send a fresh SMS via send-booking-sms (which enforces rate-limits)
//   - Old token is invalidated (overwritten)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PUBLIC_BOOKING_BASE_URL = "https://fomo.com.cy/r";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const user = userData.user;

    let body: { pending_booking_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const pendingId = body.pending_booking_id;
    if (!pendingId || typeof pendingId !== "string" || !UUID_RE.test(pendingId)) {
      return jsonResponse({ error: "pending_booking_id (uuid) is required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Load pending booking + business
    const { data: pending, error: pErr } = await admin
      .from("pending_bookings")
      .select("id, business_id, customer_phone, status")
      .eq("id", pendingId)
      .maybeSingle();

    if (pErr) {
      console.error("[resend-booking-sms] lookup error", pErr);
      return jsonResponse({ error: "Failed to lookup booking" }, 500);
    }
    if (!pending) return jsonResponse({ error: "Pending booking not found" }, 404);

    if (pending.status === "confirmed") {
      return jsonResponse({ error: "Booking already confirmed" }, 409);
    }

    // Verify ownership
    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .select("id, user_id, name")
      .eq("id", pending.business_id)
      .maybeSingle();
    if (bizErr || !biz) return jsonResponse({ error: "Business not found" }, 404);
    if (biz.user_id !== user.id) return jsonResponse({ error: "Forbidden" }, 403);

    // Generate new token via RPC
    const { data: newToken, error: tokErr } = await admin.rpc("generate_booking_token");
    if (tokErr || !newToken) {
      console.error("[resend-booking-sms] token gen error", tokErr);
      return jsonResponse({ error: "Failed to generate new token" }, 500);
    }

    const newExpires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // Update pending booking with new token + reset
    const { error: updErr } = await admin
      .from("pending_bookings")
      .update({
        token: newToken as unknown as string,
        expires_at: newExpires,
        status: "pending",
      })
      .eq("id", pendingId);

    if (updErr) {
      console.error("[resend-booking-sms] update error", updErr);
      return jsonResponse({ error: "Failed to update booking" }, 500);
    }

    const bookingUrl = `${PUBLIC_BOOKING_BASE_URL}/${newToken}`;
    const messageBody = `ΦΟΜΟ: Complete your booking at ${biz.name}: ${bookingUrl}`;

    // Dispatch SMS
    const smsResp = await fetch(`${SUPABASE_URL}/functions/v1/send-booking-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        business_id: pending.business_id,
        pending_booking_id: pendingId,
        to_phone: pending.customer_phone,
        message_body: messageBody,
      }),
    });

    if (!smsResp.ok) {
      const errText = await smsResp.text().catch(() => "");
      console.error("[resend-booking-sms] SMS dispatch failed", smsResp.status, errText);

      // Note: we do NOT cancel here — the new token is valid even if SMS failed
      // (rate-limit etc). Business can retry. But surface the error.
      return jsonResponse(
        {
          error: "Failed to send SMS",
          status: smsResp.status,
          details: errText.slice(0, 500),
          new_token_active: true,
          token: newToken,
          booking_url: bookingUrl,
          expires_at: newExpires,
        },
        502,
      );
    }

    const smsResult = await smsResp.json().catch(() => ({}));

    return jsonResponse({
      success: true,
      pending_booking_id: pendingId,
      token: newToken,
      booking_url: bookingUrl,
      expires_at: newExpires,
      sms: smsResult,
    });
  } catch (err) {
    console.error("[resend-booking-sms] Unexpected error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "Internal server error", details: msg }, 500);
  }
});
