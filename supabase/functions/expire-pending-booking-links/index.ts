// Edge Function: expire-pending-booking-links
// Φάση 5 — Cron job: marks pending_bookings whose expires_at has passed as 'link_expired'
//
// Runs hourly via pg_cron.
// Calls public.expire_pending_booking_links() which atomically:
//   - flips status pending → link_expired
//   - inserts a 'link_expired' audit log entry per row

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    console.log("[expire-pending-booking-links] Starting expiration check");

    const { data: expireResult, error: expireErr } = await admin.rpc(
      "expire_pending_booking_links",
    );

    if (expireErr) {
      console.error("[expire-pending-booking-links] RPC error", expireErr);
      return jsonResponse({ error: "Expiration check failed", details: expireErr.message }, 500);
    }

    const { data: noShowResult, error: noShowErr } = await admin.rpc(
      "detect_pending_booking_no_shows",
    );

    if (noShowErr) {
      console.error("[expire-pending-booking-links] No-show RPC error", noShowErr);
    }

    console.log("[expire-pending-booking-links] Complete", {
      expire: expireResult,
      no_show: noShowResult,
    });

    return jsonResponse({
      success: true,
      expire: expireResult,
      no_show: noShowResult,
    });
  } catch (err) {
    console.error("[expire-pending-booking-links] Unexpected error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "Internal error", details: msg }, 500);
  }
});
