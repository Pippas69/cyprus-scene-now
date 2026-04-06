import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[send-2fa-code] ${step}`, details ? JSON.stringify(details) : "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

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

    logStep("User authenticated", { userId: user.id });

    // Use service role for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user email
    const userEmail = user.email;
    if (!userEmail) {
      return errorResponse("User has no email", 400);
    }

    // Invalidate any existing unused codes for this user
    await supabaseAdmin
      .from("email_otp_codes")
      .update({ used: true })
      .eq("user_id", user.id)
      .eq("used", false);

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store code
    const { error: insertError } = await supabaseAdmin
      .from("email_otp_codes")
      .insert({
        user_id: user.id,
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      logStep("Failed to insert OTP code", insertError);
      return errorResponse("Failed to generate code", 500);
    }

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: "ΦΟΜΟ <support@fomo.com.cy>",
      to: [userEmail],
      subject: "Κωδικός Επαλήθευσης 2FA - ΦΟΜΟ",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 24px; font-weight: bold; color: #000; margin-bottom: 8px;">Κωδικός Επαλήθευσης</h1>
          <p style="font-size: 14px; color: #555; margin-bottom: 24px;">Χρησιμοποιήστε τον παρακάτω κωδικό για να ολοκληρώσετε τη σύνδεσή σας:</p>
          <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #000;">${code}</span>
          </div>
          <p style="font-size: 12px; color: #999;">Ο κωδικός λήγει σε 5 λεπτά. Αν δεν ζητήσατε αυτόν τον κωδικό, αγνοήστε αυτό το email.</p>
          <p style="font-size: 12px; color: #999; margin-top: 16px;">— Η ομάδα ΦΟΜΟ</p>
        </div>
      `,
    });

    if (emailError) {
      logStep("Failed to send email", emailError);
      return errorResponse("Failed to send verification code", 500);
    }

    logStep("2FA code sent successfully", { email: userEmail });
    return jsonResponse({ success: true });
  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || "Internal server error", 500);
  }
});
