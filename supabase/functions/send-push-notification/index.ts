// Send Push Notification - Uses shared Web Push encryption for iOS/Safari compatibility
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEncryptedPush, PushPayload } from "../_shared/web-push-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { userId, title, body, icon, data }: PushNotificationRequest = await req.json();
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
