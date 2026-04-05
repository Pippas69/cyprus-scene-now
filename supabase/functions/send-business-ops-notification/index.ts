// Business Operations Notification Edge Function
// Handles: Creation success, Boost status, Plan changes, Followers, RSVP updates
// All with idempotency and proper preference checking

import { 
  sendBusinessNotification, 
  wrapBusinessEmailContent,
  type BusinessNotificationType 
} from "../_shared/business-notification-helper.ts";
import { infoCard, detailRow, ctaButton } from "../_shared/email-templates.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[BUSINESS-OPS-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

interface BusinessOpsNotificationRequest {
  businessId: string;
  businessUserId: string;
  businessName: string;
  type: 'EVENT_CREATED' | 'OFFER_CREATED' | 'BOOST_ACTIVATED' | 'BOOST_STARTED' | 'BOOST_ENDED' | 'PLAN_CHANGED' | 'NEW_FOLLOWER' | 'RSVP_UPDATE';
  
  // For created items
  objectType?: string;
  objectId?: string;
  objectTitle?: string;
  
  // For boost notifications
  boostTier?: string;
  boostDuration?: string;
  
  // For plan changes
  oldPlan?: string;
  newPlan?: string;
  
  // For followers
  followerName?: string;
  followerCount?: number;
  
  // For RSVP
  rsvpType?: 'interested' | 'going';
  rsvpCount?: number;
  eventTitle?: string;
}

const BodySchema = z.object({
  businessId: flexId,
  type: safeString(100),
  businessName: safeString(200).optional(),
  eventTitle: safeString(500).optional(),
  offerTitle: safeString(500).optional(),
  reservationName: safeString(200).optional(),
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
    logStep("Request data", data);

    let title = "";
    let message = "";
    let deepLink = "/dashboard-business";
    let emailSubject = "";
    let emailContent = "";
    let skipEmail = true; // Most of these don't need email

    switch (data.type) {
      case 'EVENT_CREATED':
        title = "Εκδήλωση δημιουργήθηκε ✅";
        message = `${data.objectTitle || 'Νέα εκδήλωση'} δημιουργήθηκε επιτυχώς`;
        deepLink = "/dashboard-business/events";
        break;

      case 'OFFER_CREATED':
        title = "Προσφορά δημιουργήθηκε ✅";
        message = `${data.objectTitle || 'Νέα προσφορά'} δημιουργήθηκε επιτυχώς`;
        deepLink = "/dashboard-business/offers";
        break;

      case 'BOOST_ACTIVATED':
        title = "Boost ενεργοποιήθηκε 🚀";
        message = `${data.boostTier || 'Boost'} για ${data.objectTitle || 'το περιεχόμενό σας'}`;
        deepLink = "/dashboard-business/boost";
        break;

      case 'BOOST_STARTED':
        title = "Boost ξεκίνησε 🔥";
        message = `Το boost για ${data.objectTitle || 'το περιεχόμενό σας'} είναι τώρα ενεργό`;
        deepLink = "/dashboard-business/boost";
        break;

      case 'BOOST_ENDED':
        title = "Boost ολοκληρώθηκε";
        message = `Το boost για ${data.objectTitle || 'το περιεχόμενό σας'} ολοκληρώθηκε`;
        deepLink = "/dashboard-business/boost";
        break;

      case 'PLAN_CHANGED':
        title = "Αλλαγή πλάνου";
        message = data.newPlan 
          ? `Αναβαθμιστήκατε σε ${data.newPlan}` 
          : 'Το πλάνο σας άλλαξε';
        deepLink = "/dashboard-business/settings";
        skipEmail = false;
        emailSubject = `📋 Αλλαγή πλάνου - ${data.businessName}`;
        emailContent = wrapBusinessEmailContent(`
          <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
            Το πλάνο συνδρομής σας ενημερώθηκε.
          </p>

          ${infoCard('Λεπτομέρειες', 
            (data.oldPlan ? detailRow('Προηγούμενο', data.oldPlan) : '') +
            (data.newPlan ? detailRow('Νέο πλάνο', data.newPlan, true) : '')
          )}

          ${ctaButton('Ρυθμίσεις', 'https://fomo.com.cy/dashboard-business/settings')}
        `, '📋 Αλλαγή Πλάνου');
        break;

      case 'NEW_FOLLOWER':
        title = "Νέος ακόλουθος 👋";
        message = data.followerName 
          ? `${data.followerName} σας ακολούθησε` 
          : `Έχετε νέο ακόλουθο!`;
        if (data.followerCount && data.followerCount > 1) {
          message = `+${data.followerCount} νέοι ακόλουθοι`;
        }
        deepLink = "/dashboard-business/analytics";
        break;

      case 'RSVP_UPDATE':
        const rsvpLabel = data.rsvpType === 'going' ? 'θα πάνε' : 'ενδιαφέρονται';
        title = `RSVP: ${data.rsvpCount || 1} ${rsvpLabel}`;
        message = data.eventTitle 
          ? `${data.rsvpCount || 1} άτομα ${rsvpLabel} για "${data.eventTitle}"` 
          : `Νέο RSVP`;
        deepLink = "/dashboard-business/events";
        break;

      default:
        logStep("Unknown notification type", { type: data.type });
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          status: 400,
          headers: { ...securityHeaders, "Content-Type": "application/json" },
        });
    }

    // Send the notification
    const result = await sendBusinessNotification({
      businessId: data.businessId,
      businessUserId: data.businessUserId,
      type: data.type as BusinessNotificationType,
      title,
      message,
      objectType: data.objectType,
      objectId: data.objectId,
      deepLink,
      emailSubject: skipEmail ? undefined : emailSubject,
      emailHtml: skipEmail ? undefined : emailContent,
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
