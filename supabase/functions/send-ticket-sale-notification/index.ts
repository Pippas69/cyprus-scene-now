import {
  wrapBusinessEmail,
  infoCard,
  detailRow,
  ctaButton,
  successBadge,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[TICKET-SALE-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

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

    const formattedAmount = totalAmount === 0 ? 'Δωρεάν' : `€${(totalAmount / 100).toFixed(2)}`;

    const content = `
      ${successBadge('Νέα Πώληση Εισιτηρίων')}
      
      <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
        Πωλήθηκαν εισιτήρια για την εκδήλωσή σας.
      </p>

      ${infoCard('Λεπτομέρειες', 
        detailRow('Εκδήλωση', eventTitle) +
        detailRow('Πελάτης', customerName || 'Anonymous') +
        detailRow('Τύπος', tierName) +
        detailRow('Εισιτήρια', `${ticketCount}`) +
        detailRow('Ποσό', formattedAmount, true)
      )}

      ${ctaButton('Δες τις πωλήσεις', 'https://fomo.com.cy/dashboard-business/ticket-sales')}

      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 20px;">
        Διαχείριση ειδοποιήσεων: Ρυθμίσεις → Ειδοποιήσεις
      </p>
    `;

    const html = wrapBusinessEmail(content, '🎟️ Νέα Πώληση');

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <support@fomo.com.cy>",
      to: [businessEmail],
      subject: `🎟️ Νέα πώληση: ${ticketCount} εισιτήρι${ticketCount > 1 ? 'α' : 'ο'} για ${eventTitle}`,
      html,
    });

    logStep("Email sent successfully", emailResponse);

    // NOTE: Push for ticket sales is sent by the payment completion flow.
    // This function is email-only to avoid duplicate push notifications.

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
