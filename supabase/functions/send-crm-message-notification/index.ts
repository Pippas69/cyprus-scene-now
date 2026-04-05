import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled, type PushPayload } from "../_shared/web-push-crypto.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";

interface SendCrmMessageRequest {
  guestId: string;
  businessId: string;
  subject: string;
  message: string;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...securityHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { guestId, businessId, subject, message } = (await req.json()) as SendCrmMessageRequest;

    const trimmedSubject = subject?.trim();
    const trimmedMessage = message?.trim();

    if (!guestId || !businessId || !trimmedSubject || !trimmedMessage) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const { data: guestData, error: guestError } = await supabase
      .from("crm_guests")
      .select("id, user_id, businesses!inner(id, name, user_id)")
      .eq("id", guestId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (guestError) {
      return jsonResponse({ error: guestError.message }, 400);
    }

    if (!guestData) {
      return jsonResponse({ error: "Guest not found" }, 404);
    }

    const business = Array.isArray(guestData.businesses)
      ? guestData.businesses[0]
      : guestData.businesses;

    if (!business || business.user_id !== user.id) {
      return jsonResponse({ error: "Not authorized" }, 403);
    }

    if (!guestData.user_id) {
      return jsonResponse({ error: "Guest is not linked to a user" }, 400);
    }

    const title = `${business.name}: ${trimmedSubject}`.slice(0, 140);

    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: guestData.user_id,
      title,
      message: trimmedMessage,
      type: "personal",
      event_type: "business_message",
      entity_type: "business",
      entity_id: businessId,
      deep_link: "/notifications",
      read: false,
      delivered_at: new Date().toISOString(),
    });

    if (notificationError) {
      return jsonResponse({ error: notificationError.message }, 400);
    }

    const pushPayload: PushPayload = {
      title,
      body: trimmedMessage,
      icon: "/fomo-logo-new.png",
      badge: "/fomo-logo-new.png",
      tag: `crm:${businessId}:${guestId}:${crypto.randomUUID()}`.slice(0, 120),
      data: {
        url: "/notifications",
        type: "business_message",
        entityType: "business",
        entityId: businessId,
      },
    };

    const pushResult = await sendPushIfEnabled(guestData.user_id, pushPayload, supabase);

    return jsonResponse({
      success: true,
      push: pushResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
