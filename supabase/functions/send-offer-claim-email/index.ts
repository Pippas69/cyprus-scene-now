import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";
import {
  wrapPremiumEmail,
  emailGreeting,
  eventHeader,
  infoCard,
  detailRow,
  qrCodeSection,
  ctaButton,
  noteBox,
  discountBadge,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-OFFER-CLAIM-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
};

interface OfferClaimEmailRequest {
  purchaseId: string;
  userId: string;
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
    monday: 'Δευ',
    tuesday: 'Τρί',
    wednesday: 'Τετ',
    thursday: 'Πέμ',
    friday: 'Παρ',
    saturday: 'Σάβ',
    sunday: 'Κυρ',
  };
  
  return days.map(d => dayTranslations[d] || d).join(', ');
};

const formatTime = (time: string | null): string => {
  if (!time) return '';
  return time.substring(0, 5);
};

const getCategoryLabel = (category: string | null): string => {
  const labels: Record<string, string> = {
    drink: 'Ποτά',
    food: 'Φαγητό',
    account_total: 'Σύνολο Λογαριασμού',
  };
  return labels[category || ''] || '';
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
      month: 'short',
    });

    // Build info rows
    let infoRows = detailRow('Άτομα', `${data.partySize}`);
    infoRows += detailRow('Ισχύει', validDaysText);
    infoRows += detailRow('Ώρες', validTimeText);
    infoRows += detailRow('Λήξη', expiryDate, true);
    if (data.category) {
      infoRows += detailRow('Κατηγορία', getCategoryLabel(data.category));
    }

    const content = `
      ${emailGreeting(data.userName)}
      
      <p style="color: #334155; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
        Η προσφορά σου είναι έτοιμη! Δείξε τον κωδικό QR στο κατάστημα για εξαργύρωση.
      </p>

      ${eventHeader(data.offerTitle, data.businessName, data.businessLogo || undefined)}
      
      ${discountDisplay ? discountBadge(discountDisplay) : ''}

      ${data.offerDescription ? `
        <p style="color: #64748b; font-size: 13px; text-align: center; margin: 0 0 20px 0; font-style: italic;">
          ${data.offerDescription}
        </p>
      ` : ''}

      ${qrCodeSection(qrCodeUrl, undefined, 'Δείξε στο κατάστημα')}

      ${infoCard('Λεπτομέρειες', infoRows)}

      ${noteBox('Αυτή η προσφορά ισχύει για walk-in. Δεν εγγυάται διαθεσιμότητα θέσης.', 'warning')}

      ${data.showReservationCta ? ctaButton('Κάνε Κράτηση', `https://fomo.com.cy/business/${data.businessId}`) : ''}

      ${ctaButton('Δες τις προσφορές σου', 'https://fomo.com.cy/dashboard-user?tab=offers')}
    `;

    const html = wrapPremiumEmail(content, '✓ Προσφορά Έτοιμη');

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <offers@fomo.com.cy>",
      to: [data.userEmail],
      subject: `✓ ${data.offerTitle} - ${data.businessName}`,
      html,
    });

    logStep("Email sent successfully", emailResponse);

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
