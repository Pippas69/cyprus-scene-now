// Send Push Notification - Uses shared Web Push encryption for iOS/Safari compatibility
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEncryptedPush, PushPayload } from "../_shared/web-push-crypto.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-PUSH-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
}

const BodySchema = z.object({
  userId: flexId,
  title: safeString(200),
  body: safeString(1000),
  icon: optionalString(500),
  data: z.record(z.unknown()).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: securityHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { userId, title, body, icon, data } = await parseBody(req, BodySchema);
    logStep("Request data", { userId, title });

    if (!userId || !title || !body) {
      throw new Error("Missing required fields: userId, title, body");
    }

    // Build push payload
    const payload: PushPayload = {
      title,
      body,
      icon: icon || "/fomo-logo-new.png",
      badge: "/fomo-logo-new.png",
      data: {
        url: data?.url || "/dashboard-business/ticket-sales",
        ...data,
      },
    };

    // Use shared encrypted push function
    const result = await sendEncryptedPush(userId, payload, supabaseClient);

    logStep("Push notifications sent", result);

    return new Response(JSON.stringify({ 
      success: true,
      sent: result.sent,
      failed: result.failed,
    }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
