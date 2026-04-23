// Edge Function: delete-pending-booking
// Φάση 3 — Owner-only deletion of a pending booking link
//
// Allowed when status IN ('pending','link_expired','cancelled').
// Forbids deletion of 'confirmed' (use refund flow for those).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const { data: pending, error: pErr } = await admin
      .from("pending_bookings")
      .select("id, business_id, status")
      .eq("id", pendingId)
      .maybeSingle();

    if (pErr) {
      console.error("[delete-pending-booking] lookup error", pErr);
      return jsonResponse({ error: "Failed to lookup booking" }, 500);
    }
    if (!pending) return jsonResponse({ error: "Pending booking not found" }, 404);

    if (pending.status === "confirmed") {
      return jsonResponse(
        { error: "Cannot delete a confirmed booking. Use refund instead." },
        409,
      );
    }

    // Verify ownership
    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .select("id, user_id")
      .eq("id", pending.business_id)
      .maybeSingle();
    if (bizErr || !biz) return jsonResponse({ error: "Business not found" }, 404);
    if (biz.user_id !== user.id) return jsonResponse({ error: "Forbidden" }, 403);

    const { error: delErr } = await admin
      .from("pending_bookings")
      .delete()
      .eq("id", pendingId);

    if (delErr) {
      console.error("[delete-pending-booking] delete error", delErr);
      return jsonResponse({ error: "Failed to delete" }, 500);
    }

    return jsonResponse({ success: true, deleted_id: pendingId });
  } catch (err) {
    console.error("[delete-pending-booking] Unexpected error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "Internal server error", details: msg }, 500);
  }
});
