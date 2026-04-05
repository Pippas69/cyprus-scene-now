import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";
import {
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
  wrapBusinessEmail,
  infoCard,
  detailRow,
  ctaButton,
  successBadge,
  noteBox,
} from "../_shared/email-templates.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  reservationDate?: string; // YYYY-MM-DD
  reservationTime?: string; // HH:mm
}

const formatPartySizeText = (partySize: number) => {
  if (partySize === 1) return '1 άτομο';
  return `${partySize} άτομα`;
};

const BodySchema = z.object({
  businessEmail: email,
  businessName: safeString(200),
  offerTitle: safeString(500),
  customerName: safeString(200).optional(),
  claimedCount: positiveInt.optional(),
  remainingCount: nonNegativeInt.optional(),
  businessId: flexId.optional(),
  hasReservation: z.boolean().optional(),
  reservationDate: dateString.optional(),
  reservationTime: safeString(20).optional(),
  partySize: positiveInt.optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {
    logStep("Function started");

    const data = await parseBody(req, BodySchema);
    logStep("Request data", { 
      businessEmail: data.businessEmail, 
      offerTitle: data.offerTitle,
      hasReservation: data.hasReservation,
      reservationDate: data.reservationDate,
      reservationTime: data.reservationTime
    });

    // Format claimed time - ALWAYS use Cyprus timezone
    const claimedDate = new Date(data.claimedAt);
    const formattedClaimDate = claimedDate.toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Nicosia',
    });
    const formattedClaimTime = claimedDate.toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Nicosia',
    });

    // Format reservation date/time if present
    let reservationSection = '';
    if (data.hasReservation && data.reservationDate) {
      // Parse local date and time
      const [year, month, day] = data.reservationDate.split('-').map(Number);
      const resDate = new Date(year, month - 1, day);
      
      const formattedResDate = resDate.toLocaleDateString('el-GR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Europe/Nicosia',
      });
      
      reservationSection = `
        ${successBadge('Κράτηση Επιβεβαιώθηκε')}
        ${infoCard('Κράτηση', 
          detailRow('Ημερομηνία', formattedResDate) +
          detailRow('Ώρα', data.reservationTime || '--:--') +
          detailRow('Άτομα', `${data.partySize}`)
        )}
      `;
    }

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

    // Email subject depends on reservation
    const emailSubject = data.hasReservation
      ? `📋 Νέα κράτηση με προσφορά: ${data.customerName}`
      : `🎁 Νέα διεκδίκηση: ${formatPartySizeText(data.partySize)} για "${data.offerTitle}"`;

    const subheader = data.hasReservation ? '📋 Κράτηση & Προσφορά' : '🎁 Νέα Διεκδίκηση';

    const content = `
      ${!data.hasReservation ? successBadge('Νέα Διεκδίκηση') : ''}
      
      <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
        ${data.hasReservation 
          ? 'Νέα κράτηση με διεκδίκηση προσφοράς.'
          : 'Κάποιος διεκδίκησε την προσφορά σας.'}
      </p>

      ${reservationSection}

      ${infoCard('Προσφορά', 
        detailRow('Προσφορά', data.offerTitle) +
        detailRow('Πελάτης', data.customerName) +
        (!data.hasReservation ? detailRow('Άτομα', formatPartySizeText(data.partySize)) : '') +
        detailRow('Ώρα διεκδίκησης', `${formattedClaimDate}, ${formattedClaimTime}`) +
        (data.totalPeople ? detailRow('Υπόλοιπο', `${data.remainingPeople}/${data.totalPeople}`, true) : '')
      )}

      ${availabilityNote}

      ${ctaButton(data.hasReservation ? 'Διαχείριση Κρατήσεων' : 'Δες τις προσφορές', 
        data.hasReservation ? 'https://fomo.com.cy/dashboard-business/reservations' : 'https://fomo.com.cy/dashboard-business/offers')}

      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 20px;">
        Διαχείριση ειδοποιήσεων: Ρυθμίσεις → Ειδοποιήσεις
      </p>
    `;

    const html = wrapBusinessEmail(content, subheader);

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <support@fomo.com.cy>",
      to: [data.businessEmail],
      subject: emailSubject,
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

      const pushTitle = data.hasReservation ? 'Νέα κράτηση με προσφορά ✓' : 'Νέα διεκδίκηση ✓';
      const pushBody = `${data.customerName} · ${data.offerTitle} · ${formatPartySizeText(data.partySize)}`;
      const stableTag = data.purchaseId ? `n:offer_claimed:${data.purchaseId}` : `n:offer_claimed:${data.offerTitle}`.slice(0, 120);

      const pushResult = await sendPushIfEnabled(
        data.businessUserId,
        {
          title: pushTitle,
          body: pushBody,
          tag: stableTag,
          data: {
            url: data.hasReservation ? '/dashboard-business/reservations' : '/dashboard-business/offers',
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
      headers: { "Content-Type": "application/json", ...securityHeaders },
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...securityHeaders },
      }
    );
  }
});
