import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-OFFER-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
};

interface OfferEmailRequest {
  purchaseId: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  offerTitle: string;
  offerTerms?: string;
  businessName: string;
  businessLogo?: string;
  originalPriceCents: number;
  finalPriceCents: number;
  discountPercent: number;
  expiresAt: string;
  qrCodeToken: string;
}

const BodySchema = z.object({
  purchaseId: flexId,
  userEmail: email,
  userName: safeString(200).optional(),
  offerTitle: safeString(500),
  offerTerms: optionalString(2000),
  businessName: safeString(200),
  originalPriceCents: nonNegativeInt.optional(),
  finalPriceCents: nonNegativeInt.optional(),
  discountPercent: nonNegativeInt.optional(),
  expiresAt: dateString.optional(),
  qrCodeToken: safeString(500),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {

    // Auth guard: only service_role or internal calls allowed
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader || !serviceKey || authHeader !== `Bearer ${serviceKey}`) {
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

    const {
      purchaseId,
      userId,
      userEmail,
      userName,
      offerTitle,
      offerTerms,
      businessName,
      originalPriceCents,
      finalPriceCents,
      discountPercent,
      expiresAt,
      qrCodeToken,
    } = await parseBody(req, BodySchema);

    logStep("Request data", { purchaseId, userEmail, offerTitle, businessName });

    if (!purchaseId || !userEmail || !qrCodeToken) {
      throw new Error("Missing required fields: purchaseId, userEmail, or qrCodeToken");
    }

    // Format expiry date
    let formattedExpiry = "";
    if (expiresAt) {
      try {
        const date = new Date(expiresAt);
        formattedExpiry = date.toLocaleDateString("el-GR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Nicosia",
        });
      } catch {
        formattedExpiry = expiresAt;
      }
    }

    // Format prices
    const originalPrice = (originalPriceCents / 100).toFixed(2);
    const finalPrice = (finalPriceCents / 100).toFixed(2);
    const savedAmount = ((originalPriceCents - finalPriceCents) / 100).toFixed(2);

    // Generate QR code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=M&data=${encodeURIComponent(qrCodeToken)}&bgcolor=ffffff&color=000000`;

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
            <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px;">ΦΟΜΟ</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 10px 0 20px 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Cyprus Events</p>
 <p style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 500;">Your offer is ready! </p>
          </div>
          
          <div style="background-color: #ffffff; padding: 32px 24px;">
            <!-- Greeting -->
            ${userName ? `<p style="color: #102b4a; font-size: 16px; margin: 0 0 24px 0;">Hi <strong>${userName}</strong>,</p>` : ''}
            <p style="color: #374151; font-size: 16px; margin: 0 0 28px 0; line-height: 1.6;">Your purchase is confirmed! Show the QR code below at <strong>${businessName}</strong> to redeem your offer.</p>
            
            <!-- Offer Details Card -->
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f7f5 100%); border-radius: 16px; padding: 24px; margin-bottom: 28px; border-left: 4px solid #3ec3b7;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
 <span style="font-size: 24px;"></span>
                <h2 style="margin: 0; color: #102b4a; font-size: 20px; font-weight: bold;">${offerTitle}</h2>
              </div>
              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">From <strong style="color: #102b4a;">${businessName}</strong></p>
              
              <!-- Price Details -->
              <div style="background: #ffffff; border-radius: 12px; padding: 16px; margin-top: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="color: #94a3b8; font-size: 14px;">Original price:</span>
                  <span style="color: #94a3b8; font-size: 14px; text-decoration: line-through;">€${originalPrice}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="color: #102b4a; font-size: 16px; font-weight: 600;">You paid:</span>
                  <span style="color: #3ec3b7; font-size: 20px; font-weight: bold;">€${finalPrice}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                  <span style="color: #10b981; font-size: 14px; font-weight: 600;">You saved:</span>
                  <span style="color: #10b981; font-size: 14px; font-weight: 600;">€${savedAmount} (${discountPercent}% off)</span>
                </div>
              </div>
            </div>

            <!-- Validity Info -->
            <div style="background: #fffbeb; border-radius: 12px; padding: 16px; margin-bottom: 28px; border: 1px solid #fcd34d;">
              <div style="display: flex; align-items: center; gap: 8px;">
 <span style="font-size: 18px;"></span>
                <div>
                  <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">Valid until</p>
                  <p style="margin: 4px 0 0 0; color: #b45309; font-size: 14px;">${formattedExpiry}</p>
                </div>
              </div>
            </div>

            ${offerTerms ? `
              <!-- Terms -->
              <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 28px;">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Terms & Conditions</p>
                <p style="margin: 0; color: #374151; font-size: 13px; line-height: 1.5;">${offerTerms}</p>
              </div>
            ` : ''}

            <!-- QR Code Section -->
            <div style="text-align: center; margin-bottom: 28px;">
              <h3 style="color: #102b4a; margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">Your Redemption Code</h3>
              <p style="color: #64748b; margin: 0 0 20px 0; font-size: 14px;">Show this QR code at ${businessName}</p>
              
              <div style="background: #ffffff; border: 3px solid #3ec3b7; border-radius: 16px; padding: 20px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 43, 74, 0.08);">
                <img src="${qrCodeUrl}" alt="QR Code" style="width: 180px; height: 180px; display: block;" />
              </div>
              
              <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0 0;">Purchase ID: #${purchaseId.slice(0, 8).toUpperCase()}</p>
            </div>

            <!-- Footer Note -->
            <div style="margin-top: 36px; padding-top: 24px; border-top: 2px solid #e2e8f0; text-align: center;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0; line-height: 1.6;">
                You can also access your offers anytime from your <strong>ΦΟΜΟ dashboard</strong>.
              </p>
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                Questions? Contact ${businessName} for assistance.
              </p>
            </div>
          </div>

          <!-- Brand Footer -->
          <div style="background: #102b4a; padding: 28px; text-align: center;">
            <p style="color: #3ec3b7; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px 0;">ΦΟΜΟ</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} ΦΟΜΟ. Discover events in Cyprus.
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <support@fomo.com.cy>",
      to: [userEmail],
 subject: `Your offer from ${businessName} is ready!`,
      html: emailHtml,
    });

    logStep("Email sent successfully", emailResponse);

    // Send push notification if userId provided
    if (userId) {
      const pushResult = await sendPushIfEnabled(userId, {
        title: 'Η προσφορά σου είναι έτοιμη',
        body: `${offerTitle} από ${businessName}`,
        tag: `offer-${purchaseId}`,
        data: {
          url: `/dashboard-user/offers`,
          type: 'offer_purchased',
          entityType: 'offer',
          entityId: purchaseId,
        },
      }, supabaseClient);
      logStep("Push notification sent", pushResult);
    }

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
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
