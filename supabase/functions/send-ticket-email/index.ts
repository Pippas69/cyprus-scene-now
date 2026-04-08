import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";
import {
  wrapPremiumEmail,
  emailGreeting,
  emailTitle,
  eventHeader,
  infoCard,
  detailRow,
  qrCodeSection,
  ctaButton,
  noteBox,
} from "../_shared/email-templates.ts";
import { securityHeaders } from "../_shared/security-headers.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-TICKET-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
};

const BodySchema = z.object({
  orderId: flexId,
  userEmail: email,
  eventTitle: safeString(500),
  tickets: z.array(z.object({
    tierName: safeString(200).optional(),
    qrCodeToken: safeString(500).optional(),
    seatLabel: optionalString(100),
  }).passthrough()).min(1).max(200),
  eventDate: dateString.optional(),
  eventLocation: optionalString(500),
  businessName: safeString(200).optional(),
  customerName: safeString(200).optional(),
  eventCoverImage: optionalString(2048),
  userId: flexId.optional(),
  eventId: flexId.optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: securityHeaders });
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

    const { orderId, userEmail, eventTitle, tickets, eventDate, eventLocation, businessName, customerName, eventCoverImage, userId, eventId } = await parseBody(req, BodySchema);
    logStep("Request data", { orderId, userEmail, eventTitle, ticketCount: tickets?.length, businessName, hasEventCover: !!eventCoverImage });

    if (!orderId || !userEmail || !tickets || tickets.length === 0) {
      throw new Error("Missing required fields: orderId, userEmail, or tickets");
    }

    // Format event date if provided - ALWAYS use Cyprus timezone
    let formattedDate = "";
    let formattedTime = "";
    if (eventDate) {
      try {
        const date = new Date(eventDate);
        formattedDate = date.toLocaleDateString("el-GR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "Europe/Nicosia",
        });
        formattedTime = date.toLocaleTimeString("el-GR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Nicosia",
        });
      } catch {
        formattedDate = eventDate;
      }
    }

    // Generate ticket QR sections
    const ticketQRs = tickets.map((ticket: { id: string; tierName: string; qrToken: string; pricePaid?: string }, index: number) => {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=M&data=${encodeURIComponent(ticket.qrToken)}&bgcolor=ffffff&color=000000`;
      return `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 16px;">
          <tr>
            <td style="background-color: #f8fafc; border-radius: 12px; padding: 16px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 12px; text-align: center;">
                    <span style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Εισιτήριο ${index + 1}</span>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 12px;">
                    <span style="color: #0d3b66; font-size: 14px; font-weight: 600;">${ticket.tierName}</span>
                    ${ticket.pricePaid ? `<span style="color: #64748b; font-size: 13px;"> · ${ticket.pricePaid}</span>` : ''}
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 2px solid #4ecdc4; border-radius: 12px; padding: 12px;">
                      <tr>
                        <td>
                          <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; display: block;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-top: 10px;">
                    <span style="color: #94a3b8; font-size: 10px;">${ticket.id.slice(0, 8).toUpperCase()}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    }).join("");

    // Build info rows
    let infoRows = '';
    if (formattedDate) {
      infoRows += detailRow('Ημερομηνία', formattedDate);
    }
    if (formattedTime) {
      infoRows += detailRow('Ώρα', formattedTime);
    }
    if (eventLocation) {
      infoRows += detailRow('Τοποθεσία', eventLocation);
    }
    infoRows += detailRow('Εισιτήρια', `${tickets.length}`, true);

    const content = `
      ${customerName ? emailGreeting(customerName) : ''}
      
      <p style="color: #334155; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
        Τα εισιτήριά σου είναι έτοιμα! Εμφάνισε τα παρακάτω QR codes στην είσοδο.
      </p>

      ${eventHeader(eventTitle, businessName || '', eventCoverImage)}
      
      ${infoCard('Λεπτομέρειες', infoRows)}

      <p style="color: #0d3b66; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 16px 0; text-align: center;">
        Τα εισιτήριά σου
      </p>
      
      ${ticketQRs}

      ${noteBox('Κράτα αυτό το email ή έχε πρόσβαση στα εισιτήριά σου από το ΦΟΜΟ dashboard.', 'info')}

      ${ctaButton('Δες τα εισιτήριά σου', 'https://fomo.com.cy/dashboard-user?tab=events&subtab=tickets')}

      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 20px;">
        Παραγγελία #${orderId.slice(0, 8).toUpperCase()}
      </p>

      <p style="color: #94a3b8; font-size: 10px; text-align: center; margin-top: 12px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        Αυτό το email αποτελεί επιβεβαίωση πληρωμής και δεν είναι φορολογικό παραστατικό. Για την έκδοση απόδειξης ή τιμολογίου, παρακαλούμε επικοινωνήστε απευθείας με τον διοργανωτή της εκδήλωσης${businessName ? ` (${businessName})` : ''}.
      </p>
    `;

    const emailHtml = wrapPremiumEmail(content, '🎟️ Εισιτήρια Έτοιμα');

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <support@fomo.com.cy>",
      to: [userEmail],
      subject: `🎟️ Τα εισιτήριά σου για ${eventTitle}`,
      html: emailHtml,
    });

    logStep("Email sent successfully", emailResponse);

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
