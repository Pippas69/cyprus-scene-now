import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

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
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <!--[if mso]>
          <style type="text/css">
            table, td, div, p, span { font-family: Arial, sans-serif !important; }
          </style>
          <![endif]-->
        </head>
        <body style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0d3b66;">
          <!-- Container with rounded corners -->
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
            <tr>
              <td>
                <!-- Header with ΦΟΜΟ branding -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0d3b66;">
                  <tr>
                    <td style="padding: 48px 24px 36px 24px; text-align: center; background-color: #0d3b66;">
                      <h1 style="color: #4ecdc4; margin: 0 0 8px 0; font-size: 42px; font-weight: bold; letter-spacing: 4px; font-family: Georgia, serif;">ΦΟΜΟ</h1>
                      <p style="color: #8bc4c0; margin: 0 0 20px 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">CYPRUS EVENTS & NIGHTLIFE</p>
                      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                        <tr>
                          <td style="background-color: rgba(78, 205, 196, 0.2); border-radius: 24px; padding: 10px 24px; border: 1px solid rgba(78, 205, 196, 0.3);">
                            <span style="color: #ffffff; font-size: 14px; font-weight: bold;">🎓 Επαλήθευση Φοιτητικής Ιδιότητας</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                
                <!-- Content Card -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff;">
                  <tr>
                    <td style="padding: 32px 24px;">
                      <p style="color: #102b4a; font-size: 18px; line-height: 1.6; margin: 0 0 20px 0;">
                        Γεια σου${userName ? ` <strong>${userName}</strong>` : ''}! 👋
                      </p>
                      
                      <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                        Λάβαμε αίτημα επαλήθευσης της φοιτητικής σου ιδιότητας από το <strong style="color: #0d3b66;">${universityName}</strong>.
                      </p>
                      
                      <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 28px 0;">
                        Πάτησε το παρακάτω κουμπί για να ολοκληρώσεις την επαλήθευση και να αποκτήσεις πρόσβαση σε αποκλειστικές φοιτητικές εκπτώσεις!
                      </p>
                      
                      <!-- CTA Button - Email Client Safe -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td align="center" bgcolor="#4ecdc4" style="border-radius: 12px; background-color: #4ecdc4;">
                                  <a href="${verificationUrl}" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; padding: 16px 40px; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif; border-radius: 12px;">
                                    ✓ Επαλήθευση Φοιτητικής Ιδιότητας
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #64748b; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
                        Ή αντίγραψε αυτόν τον σύνδεσμο στο browser σου:
                      </p>
                      <p style="color: #4ecdc4; font-size: 11px; word-break: break-all; text-align: center; margin: 8px 0 0 0;">
                        <a href="${verificationUrl}" style="color: #4ecdc4;">${verificationUrl}</a>
                      </p>
                      
                      <!-- Info Box with Seafoam accent -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 28px;">
                        <tr>
                          <td style="background-color: #f0fdfa; border-radius: 12px; padding: 16px; border-left: 4px solid #4ecdc4;">
                            <p style="color: #0d3b66; font-size: 13px; margin: 0; line-height: 1.5;">
                              <strong>⏱ Σημαντικό:</strong> Ο σύνδεσμος ισχύει για 24 ώρες. Αν λήξει, θα χρειαστεί να ζητήσεις νέο από τις ρυθμίσεις του προφίλ σου.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #94a3b8; font-size: 12px; margin: 28px 0 0 0; line-height: 1.5; text-align: center;">
                        Αν δεν ζήτησες εσύ αυτή την επαλήθευση, αγνόησε αυτό το email.
                      </p>
                    </td>
                  </tr>
                </table>
                
                <!-- Navy Footer -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #102b4a;">
                  <tr>
                    <td style="padding: 28px; text-align: center;">
                      <p style="color: #4ecdc4; font-size: 20px; font-weight: bold; letter-spacing: 3px; font-family: Georgia, serif; margin: 0 0 8px 0;">ΦΟΜΟ</p>
                      <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ΦΟΜΟ Cyprus. Όλα τα δικαιώματα διατηρούνται.</p>
                      <p style="color: #64748b; font-size: 11px; margin: 8px 0 0 0;">Discover. Experience. Connect.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
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
