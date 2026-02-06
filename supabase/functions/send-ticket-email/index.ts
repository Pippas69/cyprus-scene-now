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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-TICKET-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const { orderId, userEmail, eventTitle, tickets, eventDate, eventLocation, businessName, customerName, eventCoverImage, userId, eventId } = await req.json();
    logStep("Request data", { orderId, userEmail, eventTitle, ticketCount: tickets?.length, businessName, hasEventCover: !!eventCoverImage });

    if (!orderId || !userEmail || !tickets || tickets.length === 0) {
      throw new Error("Missing required fields: orderId, userEmail, or tickets");
    }

    // Format event date if provided
    let formattedDate = "";
    let formattedTime = "";
    if (eventDate) {
      try {
        const date = new Date(eventDate);
        formattedDate = date.toLocaleDateString("el-GR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        formattedTime = date.toLocaleTimeString("el-GR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        formattedDate = eventDate;
      }
    }

    // Generate ticket QR sections
    const ticketQRs = tickets.map((ticket: { id: string; tierName: string; qrToken: string; pricePaid?: string }, index: number) => {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.qrToken)}&bgcolor=ffffff&color=0d3b66`;
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
                          <img src="${qrCodeUrl}" alt="QR Code" style="width: 140px; height: 140px; display: block; border-radius: 6px;" />
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
    `;

    const emailHtml = wrapPremiumEmail(content, '🎟️ Εισιτήρια Έτοιμα');

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <tickets@fomo.com.cy>",
      to: [userEmail],
      subject: `🎟️ Τα εισιτήριά σου για ${eventTitle}`,
      html: emailHtml,
    });

    logStep("Email sent successfully", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
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
