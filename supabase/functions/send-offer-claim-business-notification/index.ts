import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[OFFER-CLAIM-BUSINESS-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
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

interface OfferClaimBusinessNotificationRequest {
  businessEmail: string;
  businessName: string;
  businessUserId?: string; // Added for push notifications
  offerTitle: string;
  customerName: string;
  partySize: number;
  claimedAt: string;
  remainingPeople: number;
  totalPeople: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const data: OfferClaimBusinessNotificationRequest = await req.json();
    logStep("Request data", { businessEmail: data.businessEmail, offerTitle: data.offerTitle });

    // Format claimed time
    const claimedDate = new Date(data.claimedAt);
    const formattedDate = claimedDate.toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = claimedDate.toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Availability status
    const availabilityPercentage = data.totalPeople 
      ? Math.round((data.remainingPeople / data.totalPeople) * 100)
      : null;
    
    const isLowAvailability = data.remainingPeople < 5;
    const isFullyClaimed = data.remainingPeople === 0;

    const html = wrapEmailContent(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
          🎁 Νέα Διεκδίκηση Προσφοράς!
        </div>
      </div>

      <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 22px; text-align: center;">
        Καλά νέα, ${data.businessName}!
      </h2>
      
      <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6; text-align: center;">
        Κάποιος μόλις διεκδίκησε την προσφορά σας.
      </p>

      <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 18px; border-bottom: 2px solid #8b5cf6; padding-bottom: 8px;">
          📋 Λεπτομέρειες Διεκδίκησης
        </h3>
        
        <table style="width: 100%; color: #475569; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Προσφορά:</td>
            <td style="padding: 8px 0; text-align: right;">${data.offerTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Πελάτης:</td>
            <td style="padding: 8px 0; text-align: right;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Αριθμός ατόμων:</td>
            <td style="padding: 8px 0; text-align: right;">${data.partySize} ${data.partySize === 1 ? 'άτομο' : 'άτομα'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Ώρα διεκδίκησης:</td>
            <td style="padding: 8px 0; text-align: right;">${formattedDate}, ${formattedTime}</td>
          </tr>
        </table>
      </div>

      <!-- Availability Status -->
      <div style="background: ${isFullyClaimed ? '#fef2f2' : isLowAvailability ? '#fef3c7' : '#f0fdf4'}; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid ${isFullyClaimed ? '#ef4444' : isLowAvailability ? '#f59e0b' : '#22c55e'};">
        <h4 style="color: ${isFullyClaimed ? '#dc2626' : isLowAvailability ? '#d97706' : '#16a34a'}; margin: 0 0 12px 0; font-size: 16px;">
          ${isFullyClaimed ? '🔴 Η προσφορά εξαντλήθηκε!' : isLowAvailability ? '🟡 Χαμηλή διαθεσιμότητα' : '🟢 Κατάσταση Διαθεσιμότητας'}
        </h4>
        
        <p style="color: #475569; margin: 0; font-size: 14px;">
          ${isFullyClaimed 
            ? 'Όλες οι διαθέσιμες θέσεις έχουν διεκδικηθεί. Η προσφορά έκλεισε αυτόματα.'
            : `Υπολειπόμενες θέσεις: <strong>${data.remainingPeople}</strong>${data.totalPeople ? ` / ${data.totalPeople}` : ''}`
          }
        </p>
        
        ${availabilityPercentage !== null && !isFullyClaimed ? `
          <div style="margin-top: 12px; background: #e5e7eb; border-radius: 8px; height: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); height: 100%; width: ${100 - availabilityPercentage}%; border-radius: 8px;"></div>
          </div>
          <p style="color: #64748b; margin: 8px 0 0 0; font-size: 12px; text-align: right;">
            ${100 - availabilityPercentage}% διεκδικημένο
          </p>
        ` : ''}
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://fomo.com.cy/dashboard-business/offers" style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Δείτε τις Προσφορές
        </a>
      </div>

      <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
        Για να απενεργοποιήσετε αυτές τις ειδοποιήσεις, μεταβείτε στις Ρυθμίσεις Λογαριασμού.
      </p>
    `);

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <noreply@fomocy.com>",
      to: [data.businessEmail],
      subject: `🎁 Νέα διεκδίκηση: ${data.partySize} ${data.partySize === 1 ? 'άτομο' : 'άτομα'} για "${data.offerTitle}"`,
      html,
    });

    logStep("Email sent successfully", emailResponse);

    // Send push notification to business owner if userId provided
    if (data.businessUserId) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      const pushResult = await sendPushIfEnabled(data.businessUserId, {
        title: '🎁 Νέα διεκδίκηση προσφοράς!',
        body: `${data.partySize} ${data.partySize === 1 ? 'άτομο' : 'άτομα'} για "${data.offerTitle}"`,
        tag: `offer-claim-${Date.now()}`,
        data: {
          url: '/dashboard-business/offers',
          type: 'offer_claim',
          entityType: 'offer',
        },
      }, supabaseClient);
      logStep("Push notification sent", pushResult);
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
