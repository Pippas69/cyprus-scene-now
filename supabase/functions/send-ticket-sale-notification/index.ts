import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[TICKET-SALE-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

// Branded email template parts
const emailHeader = `
  <div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 48px 24px 36px 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Cyprus Events</p>
  </div>
`;

const emailFooter = `
  <div style="background: #102b4a; padding: 28px; text-align: center; border-radius: 0 0 12px 12px;">
    <p style="color: #3ec3b7; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px 0; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</p>
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 ΦΟΜΟ. Discover events in Cyprus.</p>
  </div>
`;

const wrapEmailContent = (content: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap" rel="stylesheet">
  </head>
  <body style="margin: 0; padding: 20px; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      ${emailHeader}
      <div style="padding: 32px 24px;">
        ${content}
      </div>
      ${emailFooter}
    </div>
  </body>
  </html>
`;

interface TicketSaleNotificationRequest {
  orderId: string;
  eventId: string;
  eventTitle: string;
  customerName: string;
  ticketCount: number;
  totalAmount: number;
  tierName: string;
  businessEmail: string;
  businessName: string;
  businessUserId?: string;
}

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

    const {
      orderId,
      eventId,
      eventTitle,
      customerName,
      ticketCount,
      totalAmount,
      tierName,
      businessEmail,
      businessName,
      businessUserId,
    }: TicketSaleNotificationRequest = await req.json();

    logStep("Request data", { orderId, eventTitle, ticketCount, businessEmail });

    const formattedAmount = totalAmount === 0 ? 'Free' : `€${(totalAmount / 100).toFixed(2)}`;

    const html = wrapEmailContent(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
          🎟️ Νέα Πώληση Εισιτηρίων!
        </div>
      </div>

      <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 22px; text-align: center;">
        Καλά νέα, ${businessName}!
      </h2>
      
      <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6; text-align: center;">
        Μόλις πωλήθηκαν εισιτήρια για την εκδήλωσή σας.
      </p>

      <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 18px; border-bottom: 2px solid #4ecdc4; padding-bottom: 8px;">
          📋 Λεπτομέρειες Πώλησης
        </h3>
        
        <table style="width: 100%; color: #475569; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Εκδήλωση:</td>
            <td style="padding: 8px 0; text-align: right;">${eventTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Πελάτης:</td>
            <td style="padding: 8px 0; text-align: right;">${customerName || 'Anonymous'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Τύπος εισιτηρίου:</td>
            <td style="padding: 8px 0; text-align: right;">${tierName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Αριθμός εισιτηρίων:</td>
            <td style="padding: 8px 0; text-align: right;">${ticketCount}</td>
          </tr>
          <tr style="border-top: 2px solid #4ecdc4;">
            <td style="padding: 12px 0 8px 0; font-weight: 700; font-size: 16px; color: #0d3b66;">Συνολικό ποσό:</td>
            <td style="padding: 12px 0 8px 0; text-align: right; font-weight: 700; font-size: 16px; color: #10b981;">${formattedAmount}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://fomo.com.cy/dashboard-business/ticket-sales" style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Δείτε τις Πωλήσεις
        </a>
      </div>

      <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
        Για να απενεργοποιήσετε αυτές τις ειδοποιήσεις, μεταβείτε στις Ρυθμίσεις Λογαριασμού.
      </p>
    `);

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <noreply@fomo.com.cy>",
      to: [businessEmail],
      subject: `🎟️ Νέα πώληση: ${ticketCount} εισιτήρι${ticketCount > 1 ? 'α' : 'ο'} για ${eventTitle}`,
      html,
    });

    logStep("Email sent successfully", emailResponse);

    // Send push notification if businessUserId is provided
    if (businessUserId) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const pushResult = await sendPushIfEnabled(businessUserId, {
        title: '🎟️ Νέα Πώληση Εισιτηρίων!',
        body: `${customerName || 'Κάποιος'} αγόρασε ${ticketCount} εισιτήρι${ticketCount > 1 ? 'α' : 'ο'} για ${eventTitle}`,
        tag: `ticket-sale-${orderId}`,
        data: {
          url: '/dashboard-business/ticket-sales',
          type: 'ticket_sale',
          orderId,
          eventId,
        },
      }, supabaseClient);
      logStep("Push notification result", pushResult);
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
