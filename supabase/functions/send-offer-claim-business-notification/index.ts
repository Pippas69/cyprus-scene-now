import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";
import {
  wrapBusinessEmail,
  infoCard,
  detailRow,
  ctaButton,
  successBadge,
  noteBox,
} from "../_shared/email-templates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[OFFER-CLAIM-BUSINESS-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

interface OfferClaimBusinessNotificationRequest {
  purchaseId?: string;
  businessEmail: string;
  businessName: string;
  businessUserId?: string;
  offerTitle: string;
  customerName: string;
  partySize: number;
  claimedAt: string;
  remainingPeople: number;
  totalPeople: number | null;
  hasReservation?: boolean;
  reservationDate?: string;
  reservationTime?: string;
}

const formatPartySizeText = (partySize: number) => {
  if (partySize === 1) return '1 άτομο';
  return `${partySize} άτομα`;
};

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
      month: 'short',
    });
    const formattedTime = claimedDate.toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Availability status
    const isLowAvailability = data.remainingPeople < 5;
    const isFullyClaimed = data.remainingPeople === 0;

    // Build availability note
    let availabilityNote = '';
    if (isFullyClaimed) {
      availabilityNote = noteBox('Η προσφορά εξαντλήθηκε! Έκλεισε αυτόματα.', 'warning');
    } else if (isLowAvailability) {
      availabilityNote = noteBox(`Χαμηλή διαθεσιμότητα: ${data.remainingPeople} θέσεις`, 'warning');
    }

    const content = `
      ${successBadge('Νέα Διεκδίκηση')}
      
      <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
        Κάποιος διεκδίκησε την προσφορά σας.
      </p>

      ${infoCard('Λεπτομέρειες', 
        detailRow('Προσφορά', data.offerTitle) +
        detailRow('Πελάτης', data.customerName) +
        detailRow('Άτομα', formatPartySizeText(data.partySize)) +
        detailRow('Ώρα', `${formattedDate}, ${formattedTime}`) +
        (data.totalPeople ? detailRow('Υπόλοιπο', `${data.remainingPeople}/${data.totalPeople}`, true) : '')
      )}

      ${availabilityNote}

      ${ctaButton('Δες τις προσφορές', 'https://fomo.com.cy/dashboard-business/offers')}

      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 20px;">
        Διαχείριση ειδοποιήσεων: Ρυθμίσεις → Ειδοποιήσεις
      </p>
    `;

    const html = wrapBusinessEmail(content, '🎁 Νέα Διεκδίκηση');

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <noreply@fomo.com.cy>",
      to: [data.businessEmail],
      subject: `🎁 Νέα διεκδίκηση: ${formatPartySizeText(data.partySize)} για "${data.offerTitle}"`,
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

      const pushTitle = 'Νέα διεκδίκηση ✓';
      const pushBody = `${data.customerName} · ${data.offerTitle} · ${formatPartySizeText(data.partySize)}`;
      const stableTag = data.purchaseId ? `n:offer_claimed:${data.purchaseId}` : `n:offer_claimed:${data.offerTitle}`.slice(0, 120);

      const pushResult = await sendPushIfEnabled(
        data.businessUserId,
        {
          title: pushTitle,
          body: pushBody,
          tag: stableTag,
          data: {
            url: '/dashboard-business/offers',
            type: 'offer_claimed',
            entityType: 'offer',
          },
        },
        supabaseClient
      );
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
