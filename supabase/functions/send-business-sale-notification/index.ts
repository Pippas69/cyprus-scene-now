// Business Sale Notification Edge Function
// Handles: Ticket sales and Offer redemptions (essential - always sent)
// These are critical business notifications that cannot be disabled

import { 
  sendBusinessNotification, 
  wrapBusinessEmailContent 
} from "../_shared/business-notification-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[BUSINESS-SALE-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

interface BusinessSaleNotificationRequest {
  businessId: string;
  businessUserId: string;
  businessName: string;
  
  // Notification type
  type: 'TICKET_SALE' | 'OFFER_REDEEMED';
  
  // Sale details
  objectId: string;
  objectTitle: string;
  quantity: number;
  
  // Customer info
  customerName: string;
  
  // Optional amount info
  amountCents?: number;
  currency?: string;
  
  // For offers
  remainingRedemptions?: number;
  totalRedemptions?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const data: BusinessSaleNotificationRequest = await req.json();
    logStep("Request data", data);

    let title = "";
    let message = "";
    let deepLink = "/dashboard-business";
    let emailSubject = "";
    let emoji = "";
    
    const formattedAmount = data.amountCents 
      ? `€${(data.amountCents / 100).toFixed(2)}` 
      : '';

    switch (data.type) {
      case 'TICKET_SALE':
        emoji = "🎟️";
        title = `Πώληση εισιτηρίων ${emoji}`;
        message = `${data.objectTitle} • ${data.quantity} εισιτήρια${formattedAmount ? ` • ${formattedAmount}` : ''}`;
        deepLink = "/dashboard-business/tickets";
        emailSubject = `${emoji} Πώληση εισιτηρίων: ${data.quantity}x "${data.objectTitle}"`;
        break;

      case 'OFFER_REDEEMED':
        emoji = "✅";
        title = `Εξαργύρωση προσφοράς ${emoji}`;
        message = `${data.objectTitle} • ${data.quantity} χρήση`;
        deepLink = "/dashboard-business/offers";
        emailSubject = `${emoji} Εξαργύρωση: "${data.objectTitle}" από ${data.customerName}`;
        break;

      default:
        logStep("Unknown notification type", { type: data.type });
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Build email content
    const emailHtml = wrapBusinessEmailContent(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: ${data.type === 'TICKET_SALE' 
          ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' 
          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}; 
                    color: white; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
          ${emoji} ${data.type === 'TICKET_SALE' ? 'Νέα Πώληση Εισιτηρίων!' : 'Νέα Εξαργύρωση Προσφοράς!'}
        </div>
      </div>

      <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 22px; text-align: center;">
        Καλά νέα, ${data.businessName}!
      </h2>

      <div style="background: ${data.type === 'TICKET_SALE' 
        ? 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)' 
        : 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)'}; 
                  border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 18px; 
                   border-bottom: 2px solid ${data.type === 'TICKET_SALE' ? '#8b5cf6' : '#10b981'}; 
                   padding-bottom: 8px;">
          📋 Λεπτομέρειες ${data.type === 'TICKET_SALE' ? 'Πώλησης' : 'Εξαργύρωσης'}
        </h3>
        
        <table style="width: 100%; color: #475569; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">
              ${data.type === 'TICKET_SALE' ? 'Εκδήλωση:' : 'Προσφορά:'}
            </td>
            <td style="padding: 8px 0; text-align: right;">${data.objectTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Πελάτης:</td>
            <td style="padding: 8px 0; text-align: right;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Ποσότητα:</td>
            <td style="padding: 8px 0; text-align: right;">${data.quantity}</td>
          </tr>
          ${data.amountCents ? `
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Ποσό:</td>
            <td style="padding: 8px 0; text-align: right; color: #10b981; font-weight: bold;">
              ${formattedAmount}
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${data.type === 'OFFER_REDEEMED' && data.remainingRedemptions !== undefined ? `
        <div style="background: ${data.remainingRedemptions === 0 ? '#fef2f2' : data.remainingRedemptions < 5 ? '#fef3c7' : '#f0fdf4'}; 
                    border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
          <p style="color: ${data.remainingRedemptions === 0 ? '#dc2626' : data.remainingRedemptions < 5 ? '#d97706' : '#16a34a'}; 
                    margin: 0; font-size: 14px;">
            ${data.remainingRedemptions === 0 
              ? '🔴 Η προσφορά εξαντλήθηκε!' 
              : data.remainingRedemptions < 5 
                ? `⚠️ Απομένουν ${data.remainingRedemptions} εξαργυρώσεις` 
                : `✅ Απομένουν ${data.remainingRedemptions} εξαργυρώσεις`}
          </p>
        </div>
      ` : ''}

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://fomo.com.cy${deepLink}" 
           style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); 
                  color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; 
                  font-weight: 600; font-size: 16px;">
          ${data.type === 'TICKET_SALE' ? 'Δείτε τα Εισιτήρια' : 'Δείτε τις Προσφορές'}
        </a>
      </div>
    `);

    // Send the notification (these are essential - always sent)
    const result = await sendBusinessNotification({
      businessId: data.businessId,
      businessUserId: data.businessUserId,
      type: data.type,
      title,
      message,
      objectType: data.type === 'TICKET_SALE' ? 'TICKET' : 'OFFER',
      objectId: data.objectId,
      deepLink,
      emailSubject,
      emailHtml,
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
