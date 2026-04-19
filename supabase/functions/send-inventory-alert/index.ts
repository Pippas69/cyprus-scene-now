// Inventory Alert Edge Function
// Sends LOW_INVENTORY (remaining == 2) and SOLD_OUT (remaining == 0) alerts
// With idempotency to prevent duplicate alerts

import { createClient } from "npm:@supabase/supabase-js@2";
import { 
  sendBusinessNotification, 
  wrapBusinessEmailContent,
  type BusinessNotificationType 
} from "../_shared/business-notification-helper.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[INVENTORY-ALERT] ${step}`, details ? JSON.stringify(details) : '');
};

interface InventoryAlertRequest {
  businessId: string;
  businessUserId: string;
  businessName: string;
  objectType: 'EVENT' | 'OFFER' | 'RESERVATION_SLOTS';
  objectId: string;
  objectTitle: string;
  remaining: number;
  total?: number;
}

const BodySchema = z.object({
  businessId: flexId,
  businessEmail: email.optional(),
  entityType: safeString(50),
  entityTitle: safeString(500),
  remaining: nonNegativeInt,
  total: nonNegativeInt.optional(),
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

    // Determine alert type based on remaining count
    let alertType: BusinessNotificationType | null = null;
    let title = "";
    let message = "";
    let emoji = "";

    if (data.remaining === 0) {
      alertType = 'SOLD_OUT';
 title = "Εξαντλήθηκε";
      message = `${data.objectTitle} • sold out`;
 emoji = "";
    } else if (data.remaining === 2) {
      alertType = 'LOW_INVENTORY';
 title = "Απομένουν 2 ️";
      message = `${data.objectTitle} • σχεδόν sold out`;
 emoji = "️";
    } else {
      // No alert needed for other remaining values
      logStep("No alert needed", { remaining: data.remaining });
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email content
    const objectTypeName = data.objectType === 'EVENT' ? 'Εκδήλωση' : 
                          data.objectType === 'OFFER' ? 'Προσφορά' : 'Κρατήσεις';
    
    const emailHtml = wrapBusinessEmailContent(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: ${data.remaining === 0 ? '#fef2f2' : '#fef3c7'}; 
                    color: ${data.remaining === 0 ? '#dc2626' : '#d97706'}; 
                    padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
          ${emoji} ${data.remaining === 0 ? 'Εξαντλήθηκε!' : 'Χαμηλή Διαθεσιμότητα'}
        </div>
      </div>

      <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 22px; text-align: center;">
        ${data.businessName}
      </h2>
      
      <div style="background: ${data.remaining === 0 ? '#fef2f2' : '#fef3c7'}; 
                  border-left: 4px solid ${data.remaining === 0 ? '#ef4444' : '#f59e0b'}; 
                  border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="color: #0d3b66; margin: 0 0 12px 0; font-size: 16px;">
          ${objectTypeName}: ${data.objectTitle}
        </h3>
        <p style="color: #475569; margin: 0; font-size: 14px;">
          ${data.remaining === 0 
            ? 'Όλες οι διαθέσιμες θέσεις έχουν εξαντληθεί.'
            : `Απομένουν μόνο <strong>2</strong> θέσεις${data.total ? ` από ${data.total}` : ''}.`
          }
        </p>
      </div>

      ${data.remaining > 0 ? `
        <p style="color: #475569; text-align: center; margin: 24px 0;">
          Μπορείτε να προσθέσετε περισσότερες θέσεις ή να κλείσετε τη διαθεσιμότητα.
        </p>
      ` : ''}

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://fomo.com.cy/dashboard-business/${data.objectType === 'EVENT' ? 'events' : 'offers'}"
           style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); 
                  color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; 
                  font-weight: 600; font-size: 16px;">
          Διαχείριση ${data.objectType === 'EVENT' ? 'Εκδηλώσεων' : 'Προσφορών'}
        </a>
      </div>

      <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
        Αυτή η ειδοποίηση στάλθηκε αυτόματα. Μπορείτε να απενεργοποιήσετε τις ειδοποιήσεις αποθέματος στις Ρυθμίσεις.
      </p>
    `);

    // Send the notification
    const result = await sendBusinessNotification({
      businessId: data.businessId,
      businessUserId: data.businessUserId,
      type: alertType,
      title,
      message,
      objectType: data.objectType,
      objectId: data.objectId,
      deepLink: `/dashboard-business/${data.objectType === 'EVENT' ? 'events' : 'offers'}`,
      emailSubject: `${emoji} ${title} - ${data.objectTitle}`,
      emailHtml,
      payload: {
        remaining: data.remaining,
        total: data.total,
        threshold: data.remaining === 0 ? 'sold_out' : 'low_2',
      },
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
