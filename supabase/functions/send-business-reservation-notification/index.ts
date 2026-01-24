// Business Reservation Notification Edge Function
// Handles: New reservations (event/offer/profile), Cancellations, No-shows, Check-ins
// All essential notifications (new reservations) are ALWAYS sent
// Optional notifications respect user preferences

import { 
  sendBusinessNotification, 
  wrapBusinessEmailContent,
  type BusinessNotificationType 
} from "../_shared/business-notification-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const data: BusinessReservationNotificationRequest = await req.json();
    logStep("Request data", data);

    let title = "";
    let message = "";
    let deepLink = "/dashboard-business/reservations";
    let emailSubject = "";
    let emoji = "";
    let skipEmail = false;
    
    // Format date and time
    const formattedDate = new Date(data.reservationDate).toLocaleDateString('el-GR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    switch (data.type) {
      case 'NEW_RESERVATION':
      case 'NEW_RESERVATION_EVENT':
      case 'NEW_RESERVATION_OFFER':
      case 'NEW_RESERVATION_PROFILE':
        emoji = "✅";
        title = `Νέα κράτηση ${emoji}`;
        message = `${data.customerName} • ${formattedDate} ${data.reservationTime} • ${data.partySize} άτομα`;
        emailSubject = `${emoji} Νέα κράτηση: ${data.customerName} - ${formattedDate}`;
        
        // Add context for where the reservation came from
        if (data.eventTitle) {
          message = `${data.customerName} • ${data.eventTitle} • ${data.partySize} άτομα`;
        } else if (data.offerTitle) {
          message = `${data.customerName} • ${data.offerTitle} • ${data.partySize} άτομα`;
        }
        break;

      case 'RESERVATION_CANCELLED':
        emoji = "❌";
        title = "Ακύρωση κράτησης";
        message = `${data.customerName} • ${formattedDate} ${data.reservationTime}`;
        emailSubject = `Ακύρωση: ${data.customerName} - ${formattedDate}`;
        skipEmail = true; // Optional notification - no email
        break;

      case 'RESERVATION_NO_SHOW':
        emoji = "⚠️";
        title = "Δεν εμφανίστηκε";
        message = `${data.customerName} • ${data.reservationTime}`;
        emailSubject = `No-show: ${data.customerName}`;
        skipEmail = true; // Optional notification - no email
        break;

      case 'RESERVATION_CHECK_IN':
        emoji = "✅";
        title = "Check-in έγινε";
        message = `${data.customerName} • τώρα`;
        emailSubject = `Check-in: ${data.customerName}`;
        skipEmail = true; // Optional notification - no email
        break;

      default:
        logStep("Unknown notification type", { type: data.type });
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Build email content for new reservations
    const emailHtml = skipEmail ? undefined : wrapBusinessEmailContent(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                    color: white; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
          ${emoji} Νέα Κράτηση!
        </div>
      </div>

      <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 22px; text-align: center;">
        ${data.businessName}
      </h2>

      <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); 
                  border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 18px; border-bottom: 2px solid #10b981; padding-bottom: 8px;">
          📋 Λεπτομέρειες Κράτησης
        </h3>
        
        <table style="width: 100%; color: #475569; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Πελάτης:</td>
            <td style="padding: 8px 0; text-align: right;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Ημερομηνία:</td>
            <td style="padding: 8px 0; text-align: right;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Ώρα:</td>
            <td style="padding: 8px 0; text-align: right;">${data.reservationTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Αριθμός ατόμων:</td>
            <td style="padding: 8px 0; text-align: right;">${data.partySize} ${data.partySize === 1 ? 'άτομο' : 'άτομα'}</td>
          </tr>
          ${data.eventTitle ? `
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Εκδήλωση:</td>
            <td style="padding: 8px 0; text-align: right;">${data.eventTitle}</td>
          </tr>
          ` : ''}
          ${data.offerTitle ? `
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Προσφορά:</td>
            <td style="padding: 8px 0; text-align: right;">${data.offerTitle}</td>
          </tr>
          ` : ''}
          ${data.notes ? `
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Σημειώσεις:</td>
            <td style="padding: 8px 0; text-align: right;">${data.notes}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://fomo.com.cy/dashboard-business/reservations" 
           style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); 
                  color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; 
                  font-weight: 600; font-size: 16px;">
          Διαχείριση Κρατήσεων
        </a>
      </div>
    `);

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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
