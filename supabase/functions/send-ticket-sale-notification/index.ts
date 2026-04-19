import {
  wrapBusinessEmail,
  infoCard,
  detailRow,
  ctaButton,
  successBadge,
  transactionCodeBox,
} from "../_shared/email-templates.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[TICKET-SALE-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

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

const BodySchema = z.object({
  orderId: flexId,
  eventId: flexId.optional(),
  eventTitle: safeString(500),
  customerName: safeString(200).optional(),
  ticketCount: positiveInt,
  totalAmount: nonNegativeInt,
  tierName: safeString(200).optional(),
  businessEmail: email.optional(),
  businessName: safeString(200).optional(),
  businessUserId: flexId.optional(),
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
    } = await parseBody(req, BodySchema);

    logStep("Request data", { orderId, eventTitle, ticketCount, businessEmail });

    const formattedAmount = totalAmount === 0 ? 'Δωρεάν' : `€${(totalAmount / 100).toFixed(2)}`;

    // Fetch transaction_code for this order
    let transactionCode: string | null = null;
    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const { data: orderRow } = await supabaseAdmin
        .from('ticket_orders')
        .select('transaction_code')
        .eq('id', orderId)
        .maybeSingle();
      transactionCode = orderRow?.transaction_code ?? null;
    } catch (e) {
      logStep("Could not fetch transaction_code (non-fatal)", { e: String(e) });
    }

    const content = `
      ${successBadge('Νέα Πώληση Εισιτηρίων')}
      
      <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
        Πωλήθηκαν εισιτήρια για την εκδήλωσή σας.
      </p>

      ${transactionCodeBox(transactionCode)}

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

    const html = wrapBusinessEmail(content, 'Νέα Πώληση');

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <support@fomo.com.cy>",
      to: [businessEmail],
      subject: `Νέα πώληση εισιτηρίων - ${eventTitle}`,
      html,
    });

    logStep("Email sent successfully", emailResponse);

    // NOTE: Push for ticket sales is sent by the payment completion flow.
    // This function is email-only to avoid duplicate push notifications.

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...securityHeaders },
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...securityHeaders },
      }
    );
  }
});
