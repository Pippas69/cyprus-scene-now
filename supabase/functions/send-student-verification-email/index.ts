import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";
import {
  wrapPremiumEmail,
  emailGreeting,
  emailTitle,
  ctaButton,
  noteBox,
} from "../_shared/email-templates.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-STUDENT-VERIFICATION-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
};

const BodySchema = z.object({
  verificationId: flexId,
  universityEmail: email,
  universityName: safeString(200).optional(),
  userName: safeString(200).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {

    // Auth guard: require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }
    const _token = authHeader.replace("Bearer ", "");
    const _authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { error: _authError } = await _authClient.auth.getUser(_token);
    if (_authError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { verificationId, universityEmail, universityName, userName } = await parseBody(req, BodySchema);
    logStep("Request data", { verificationId, universityEmail, universityName });

    if (!verificationId || !universityEmail) {
      throw new Error("Missing required fields: verificationId or universityEmail");
    }

    // Generate verification token and set expiry (24 hours)
    const verificationToken = crypto.randomUUID();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

    // Update the verification record with token
    const { error: updateError } = await supabaseClient
      .from('student_verifications')
      .update({
        verification_token: verificationToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .eq('id', verificationId);

    if (updateError) {
      logStep("Failed to update verification token", updateError);
      throw updateError;
    }

    // Build verification URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://fomocy.lovable.app";
    const verificationUrl = `${baseUrl}/verify-student?token=${verificationToken}`;

    logStep("Sending verification email to university email");

    const content = `
      ${userName ? emailGreeting(userName) : `<p style="color: #334155; font-size: 14px; margin: 0 0 16px 0;">Γεια σου!</p>`}
      
      <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
        Λάβαμε αίτημα επαλήθευσης της φοιτητικής σου ιδιότητας από το <strong style="color: #0d3b66;">${universityName}</strong>.
      </p>
      
      <p style="color: #334155; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
        Πάτησε το παρακάτω κουμπί για να ολοκληρώσεις την επαλήθευση και να αποκτήσεις πρόσβαση σε αποκλειστικές φοιτητικές εκπτώσεις.
      </p>
      
      ${ctaButton('Επαλήθευση', verificationUrl)}

      <p style="color: #64748b; font-size: 11px; margin: 20px 0 0 0; text-align: center; word-break: break-all;">
        ${verificationUrl}
      </p>

      ${noteBox('Ο σύνδεσμος ισχύει για 24 ώρες. Αν λήξει, ζήτησε νέο από τις ρυθμίσεις.', 'info')}

      <p style="color: #94a3b8; font-size: 11px; margin: 20px 0 0 0; text-align: center;">
        Αν δεν ζήτησες εσύ αυτή την επαλήθευση, αγνόησε αυτό το email.
      </p>
    `;

    const emailHtml = wrapPremiumEmail(content, '🎓 Επαλήθευση Φοιτητή');

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <support@fomo.com.cy>",
      to: [universityEmail],
      subject: "🎓 Επαλήθευση Φοιτητικής Ιδιότητας - ΦΟΜΟ",
      html: emailHtml,
    });

    logStep("Email sent successfully", emailResponse);

    // Get user_id from verification record to send push
    const { data: verification } = await supabaseClient
      .from('student_verifications')
      .select('user_id')
      .eq('id', verificationId)
      .single();

    if (verification?.user_id) {
      const pushResult = await sendPushIfEnabled(verification.user_id, {
        title: '🎓 Επαλήθευση Email',
        body: `Έλεγξε το ${universityEmail} για τον σύνδεσμο επαλήθευσης`,
        tag: `student-verification-${verificationId}`,
        data: {
          url: '/dashboard-user?tab=settings',
          type: 'student_verification',
          entityType: 'verification',
          entityId: verificationId,
        },
      }, supabaseClient);
      logStep("Push notification sent", pushResult);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...securityHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    logStep("Error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...securityHeaders, "Content-Type": "application/json" } }
    );
  }
});
