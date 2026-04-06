import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[verify-2fa-code] ${step}`, details ? JSON.stringify(details) : "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    // Verify the user's JWT
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.length !== 6) {
      return errorResponse("Invalid code format", 400);
    }

    logStep("Verifying code", { userId: user.id });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find valid, unused code for this user
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from("email_otp_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      logStep("DB error", fetchError);
      return errorResponse("Verification failed", 500);
    }

    if (!otpRecord) {
      logStep("Invalid or expired code");
      return jsonResponse({ success: false, error: "invalid_code" }, 400);
    }

    // Mark code as used
    await supabaseAdmin
      .from("email_otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    logStep("Code verified successfully");
    return jsonResponse({ success: true });
  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || "Internal server error", 500);
  }
});
