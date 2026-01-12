import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-OFFER-CLAIM-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
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

interface OfferClaimEmailRequest {
  purchaseId: string;
  userEmail: string;
  userName: string;
  offerTitle: string;
  offerDescription: string | null;
  category: string | null;
  discountType: string | null;
  percentOff: number | null;
  specialDealText: string | null;
  businessName: string;
  businessLogo: string | null;
  partySize: number;
  qrCodeToken: string;
  expiresAt: string;
  validDays: string[] | null;
  validStartTime: string | null;
  validEndTime: string | null;
  showReservationCta: boolean | null;
  businessId: string;
}

const formatDays = (days: string[] | null): string => {
  if (!days || days.length === 0 || days.length === 7) return 'Κάθε μέρα';
  
  const dayTranslations: Record<string, string> = {
    monday: 'Δευτέρα',
    tuesday: 'Τρίτη',
    wednesday: 'Τετάρτη',
    thursday: 'Πέμπτη',
    friday: 'Παρασκευή',
    saturday: 'Σάββατο',
    sunday: 'Κυριακή',
  };
  
  return days.map(d => dayTranslations[d] || d).join(', ');
};

const formatTime = (time: string | null): string => {
  if (!time) return '';
  return time.substring(0, 5);
};

const getCategoryLabel = (category: string | null): string => {
  const labels: Record<string, string> = {
    drink: '🍹 Ποτά',
    food: '🍽️ Φαγητό',
    account_total: '💳 Σύνολο Λογαριασμού',
  };
  return labels[category || ''] || '';
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const data: OfferClaimEmailRequest = await req.json();
    logStep("Request data", { purchaseId: data.purchaseId, userEmail: data.userEmail });

    // Generate QR code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.qrCodeToken)}&bgcolor=ffffff&color=0d3b66`;

    // Format discount display
    let discountDisplay = '';
    if (data.discountType === 'percentage' && data.percentOff) {
      discountDisplay = `-${data.percentOff}%`;
    } else if (data.discountType === 'special_deal' && data.specialDealText) {
      discountDisplay = data.specialDealText;
    } else if (data.percentOff) {
      discountDisplay = `-${data.percentOff}%`;
    }

    // Format validity info
    const validDaysText = formatDays(data.validDays);
    const validTimeText = data.validStartTime && data.validEndTime 
      ? `${formatTime(data.validStartTime)} - ${formatTime(data.validEndTime)}`
      : 'Όλη μέρα';

    // Format expiry date
    const expiryDate = new Date(data.expiresAt).toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const html = wrapEmailContent(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
          ✓ Η προσφορά σας είναι έτοιμη!
        </div>
      </div>

      <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 22px; text-align: center;">
        Γεια σου ${data.userName}!
      </h2>
      
      <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6; text-align: center;">
        Μόλις διεκδικήσατε μια προσφορά. Δείξτε τον παρακάτω κωδικό QR στο κατάστημα για να εξαργυρώσετε.
      </p>

      <!-- Offer Card -->
      <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 2px solid #4ecdc4;">
        ${data.businessLogo ? `
          <div style="text-align: center; margin-bottom: 16px;">
            <img src="${data.businessLogo}" alt="${data.businessName}" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover;">
          </div>
        ` : ''}
        
        <h3 style="color: #0d3b66; margin: 0 0 8px 0; font-size: 20px; text-align: center;">
          ${data.offerTitle}
        </h3>
        
        <p style="color: #475569; margin: 0 0 16px 0; font-size: 14px; text-align: center;">
          ${data.businessName}
        </p>

        ${discountDisplay ? `
          <div style="text-align: center; margin-bottom: 16px;">
            <span style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); color: white; padding: 8px 20px; border-radius: 8px; font-size: 24px; font-weight: bold;">
              ${discountDisplay}
            </span>
          </div>
        ` : ''}

        ${data.category ? `
          <p style="color: #64748b; margin: 0 0 8px 0; font-size: 13px; text-align: center;">
            ${getCategoryLabel(data.category)}
          </p>
        ` : ''}

        ${data.offerDescription ? `
          <p style="color: #475569; margin: 0; font-size: 14px; text-align: center; font-style: italic;">
            ${data.offerDescription}
          </p>
        ` : ''}
      </div>

      <!-- QR Code -->
      <div style="text-align: center; margin: 32px 0; padding: 24px; background: #f8fafc; border-radius: 12px;">
        <p style="color: #0d3b66; font-weight: bold; margin: 0 0 16px 0; font-size: 16px;">
          📱 Ο Κωδικός QR σας
        </p>
        <img src="${qrCodeUrl}" alt="QR Code" style="width: 180px; height: 180px; border-radius: 8px; border: 3px solid #4ecdc4;">
        <p style="color: #64748b; font-size: 12px; margin: 16px 0 0 0;">
          Δείξτε αυτόν τον κωδικό QR στο ${data.businessName}
        </p>
      </div>

      <!-- Details -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h4 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 16px;">
          📋 Λεπτομέρειες
        </h4>
        
        <table style="width: 100%; color: #475569; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Άτομα:</td>
            <td style="padding: 8px 0; text-align: right;">${data.partySize} ${data.partySize === 1 ? 'άτομο' : 'άτομα'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Ισχύει:</td>
            <td style="padding: 8px 0; text-align: right;">${validDaysText}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Ώρες:</td>
            <td style="padding: 8px 0; text-align: right;">${validTimeText}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Λήξη:</td>
            <td style="padding: 8px 0; text-align: right;">${expiryDate}</td>
          </tr>
        </table>
      </div>

      <!-- Important Note -->
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #f59e0b;">
        <p style="color: #92400e; margin: 0; font-size: 13px; line-height: 1.5;">
          ⚠️ <strong>Σημείωση:</strong> Αυτή η προσφορά ισχύει για walk-in πελάτες και δεν εγγυάται θέση.
          ${data.showReservationCta ? 'Αν θέλετε να κάνετε κράτηση, επισκεφθείτε το προφίλ της επιχείρησης.' : ''}
        </p>
      </div>

      ${data.showReservationCta ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://fomo.cy/business/${data.businessId}" style="display: inline-block; background: #0d3b66; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Κάντε Κράτηση
          </a>
        </div>
      ` : ''}

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://fomo.cy/dashboard-user/offers" style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Δείτε τις Προσφορές σας
        </a>
      </div>
    `);

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <offers@fomo.cy>",
      to: [data.userEmail],
      subject: `✓ Η προσφορά σας: ${data.offerTitle}`,
      html,
    });

    logStep("Email sent successfully", emailResponse);

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
