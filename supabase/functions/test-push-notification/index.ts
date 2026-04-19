import { createClient } from "npm:@supabase/supabase-js@2";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {
    // Get auth header and validate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log(`[TEST-PUSH] Sending test notification to user: ${user.id}`);

    // Call the send-push-notification function with service role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Invoke the send-push-notification function
    const { data, error } = await serviceClient.functions.invoke("send-push-notification", {
      body: {
        userId: user.id,
 title: "Test Notification",
        body: "Push notifications are working! / Οι push ειδοποιήσεις λειτουργούν!",
        data: {
          url: "/settings",
          type: "test",
        },
      },
    });

    if (error) {
      console.error("[TEST-PUSH] Error invoking send-push-notification:", error);
      throw error;
    }

    console.log("[TEST-PUSH] Result:", data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Test notification sent",
      result: data,
    }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[TEST-PUSH] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
