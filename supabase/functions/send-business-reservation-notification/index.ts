// Business Reservation Notification Edge Function
// Handles: New reservations (event/offer/profile), Cancellations, No-shows, Check-ins
// All essential notifications (new reservations) are ALWAYS sent
// Optional notifications respect user preferences

import { 
  sendBusinessNotification, 
  wrapBusinessEmailContent,
  type BusinessNotificationType 
} from "../_shared/business-notification-helper.ts";
import { infoCard, detailRow, ctaButton, successBadge, transactionCodeBox } from "../_shared/email-templates.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[BUSINESS-RESERVATION-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

interface BusinessReservationNotificationRequest {
  businessId: string;
  businessUserId: string;
  businessName: string;
  
  // Notification type
  type: 'NEW_RESERVATION' | 'NEW_RESERVATION_EVENT' | 'NEW_RESERVATION_OFFER' | 'NEW_RESERVATION_PROFILE' | 
        'RESERVATION_CANCELLED' | 'RESERVATION_NO_SHOW' | 'RESERVATION_CHECK_IN';
  
  // Reservation details
  reservationId: string;
  customerName: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  
  // Optional context
  eventTitle?: string;
  offerTitle?: string;
  notes?: string;
}

const BodySchema = z.object({
  businessId: flexId,
  businessEmail: email.optional(),
  type: safeString(100),
  reservationName: safeString(200).optional(),
  reservationDate: dateString.optional(),
  reservationTime: safeString(20).optional(),
  partySize: positiveInt.optional(),
  reservationId: flexId.optional(),
  businessName: safeString(200).optional(),
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
    
    const data = await parseBody(req, BodySchema);
    logStep("Request data", data);

    let title = "";
    let message = "";
    let deepLink = "/dashboard-business/reservations";
    let emailSubject = "";
    let skipEmail = false;
    
    // Format date - ALWAYS use Cyprus timezone
    const formattedDate = new Date(data.reservationDate).toLocaleDateString('el-GR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Nicosia',
    });

    switch (data.type) {
      case 'NEW_RESERVATION':
      case 'NEW_RESERVATION_EVENT':
      case 'NEW_RESERVATION_OFFER':
      case 'NEW_RESERVATION_PROFILE':
        title = `Νέα κράτηση ✓`;
        message = `${data.customerName} · ${formattedDate} ${data.reservationTime} · ${data.partySize} άτομα`;
        emailSubject = `✓ Νέα κράτηση: ${data.customerName}`;
        
        if (data.eventTitle) {
          message = `${data.customerName} · ${data.eventTitle} · ${data.partySize} άτομα`;
        } else if (data.offerTitle) {
          message = `${data.customerName} · ${data.offerTitle} · ${data.partySize} άτομα`;
        }
        break;

      case 'RESERVATION_CANCELLED':
        title = "Ακύρωση κράτησης";
        message = `${data.customerName} · ${formattedDate} ${data.reservationTime}`;
        emailSubject = `Ακύρωση: ${data.customerName}`;
        skipEmail = true;
        break;

      case 'RESERVATION_NO_SHOW':
        title = "Δεν εμφανίστηκε";
        message = `${data.customerName} · ${data.reservationTime}`;
        emailSubject = `No-show: ${data.customerName}`;
        skipEmail = true;
        break;

      case 'RESERVATION_CHECK_IN':
        title = "Check-in ✓";
        message = `${data.customerName} · τώρα`;
        emailSubject = `Check-in: ${data.customerName}`;
        skipEmail = true;
        break;

      default:
        logStep("Unknown notification type", { type: data.type });
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          status: 400,
          headers: { ...securityHeaders, "Content-Type": "application/json" },
        });
    }

    // Build email content for new reservations
    const emailHtml = skipEmail ? undefined : wrapBusinessEmailContent(`
      ${successBadge('Νέα Κράτηση')}
      
      <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
        Νέα κράτηση για το <strong>${data.businessName}</strong>.
      </p>

      ${infoCard('Λεπτομέρειες', 
        detailRow('Πελάτης', data.customerName) +
        detailRow('Ημερομηνία', formattedDate) +
        detailRow('Ώρα', data.reservationTime) +
        detailRow('Άτομα', `${data.partySize}`) +
        (data.eventTitle ? detailRow('Εκδήλωση', data.eventTitle) : '') +
        (data.offerTitle ? detailRow('Προσφορά', data.offerTitle) : '') +
        (data.notes ? detailRow('Σημειώσεις', data.notes) : '')
      )}

      ${ctaButton('Διαχείριση', 'https://fomo.com.cy/dashboard-business/reservations')}
    `, '📋 Νέα Κράτηση');

    // Send the notification
    const result = await sendBusinessNotification({
      businessId: data.businessId,
      businessUserId: data.businessUserId,
      type: data.type as BusinessNotificationType,
      title,
      message,
      objectType: 'RESERVATION',
      objectId: data.reservationId,
      deepLink,
      emailSubject: skipEmail ? undefined : emailSubject,
      emailHtml,
      skipEmail,
    });

    logStep("Notification result", result);

    return new Response(JSON.stringify(result), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
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
