import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-STUDENT-VERIFICATION-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { verificationId, universityEmail, universityName, userName } = await req.json();
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

    logStep("Sending verification email", { verificationUrl });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f1f5f9;">
          <!-- Header with ΦΟΜΟ branding -->
          <div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 48px 24px 36px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px; font-family: Georgia, serif;">ΦΟΜΟ</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 10px 0 20px 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Cyprus Events</p>
            <p style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 500;">🎓 Επαλήθευση Φοιτητικής Ιδιότητας</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 32px 24px;">
            <p style="color: #102b4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Γεια σου${userName ? ` <strong>${userName}</strong>` : ''}! 👋
            </p>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
              Λάβαμε αίτημα επαλήθευσης της φοιτητικής σου ιδιότητας από το <strong>${universityName}</strong>.
            </p>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              Πάτησε το παρακάτω κουμπί για να ολοκληρώσεις την επαλήθευση και να αποκτήσεις πρόσβαση σε αποκλειστικές φοιτητικές εκπτώσεις!
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #3ec3b7 0%, #2fa89d 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(62, 195, 183, 0.4);">
                ✓ Επαλήθευση Φοιτητικής Ιδιότητας
              </a>
            </div>
            
            <div style="background: #f0f9ff; border-radius: 12px; padding: 16px; margin-top: 24px;">
              <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">
                <strong>⏱ Σημαντικό:</strong> Ο σύνδεσμος ισχύει για 24 ώρες. Αν λήξει, θα χρειαστεί να ζητήσεις νέο.
              </p>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; margin: 32px 0 0 0; line-height: 1.5;">
              Αν δεν ζήτησες εσύ αυτή την επαλήθευση, αγνόησε αυτό το email.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ΦΟΜΟ Cyprus. Όλα τα δικαιώματα διατηρούνται.</p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <noreply@fomo.cy>",
      to: [universityEmail],
      subject: "🎓 Επαλήθευση Φοιτητικής Ιδιότητας - ΦΟΜΟ",
      html: emailHtml,
    });

    logStep("Email sent successfully", emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("Error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
