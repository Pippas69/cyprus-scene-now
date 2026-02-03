import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-TICKET-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
};

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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { orderId, userEmail, eventTitle, tickets, eventDate, eventLocation, businessName, customerName, eventCoverImage, userId, eventId } = await req.json();
    logStep("Request data", { orderId, userEmail, eventTitle, ticketCount: tickets?.length, businessName, hasEventCover: !!eventCoverImage });

    if (!orderId || !userEmail || !tickets || tickets.length === 0) {
      throw new Error("Missing required fields: orderId, userEmail, or tickets");
    }

    // Format event date if provided
    let formattedDate = eventDate || "";
    if (eventDate) {
      try {
        const date = new Date(eventDate);
        formattedDate = date.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        formattedDate = eventDate;
      }
    }

    // Generate QR code URLs for each ticket
    const ticketDetails = tickets.map((ticket: { id: string; tierName: string; qrToken: string; pricePaid?: string }, index: number) => {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.qrToken)}&color=102b4a`;
      return `
        <div style="background: #ffffff; border: 2px solid #3ec3b7; border-radius: 16px; padding: 24px; margin-bottom: 20px; text-align: center; box-shadow: 0 4px 12px rgba(16, 43, 74, 0.08);">
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f7f5 100%); border-radius: 12px; padding: 14px; margin-bottom: 20px;">
            <p style="margin: 0; color: #102b4a; font-size: 14px; font-weight: 600;">Ticket ${index + 1}</p>
            <p style="margin: 6px 0 0 0; color: #3ec3b7; font-weight: bold; font-size: 16px;">${ticket.tierName}${ticket.pricePaid ? ` - ${ticket.pricePaid}` : ''}</p>
          </div>
          <div style="background: #ffffff; padding: 16px; border-radius: 12px; display: inline-block; border: 3px solid #3ec3b7;">
            <img src="${qrCodeUrl}" alt="QR Code" style="width: 180px; height: 180px; display: block;" />
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 16px 0 0 0;">Scan at entry</p>
          <p style="font-size: 10px; color: #94a3b8; margin: 8px 0 0 0;">ID: ${ticket.id.slice(0, 8).toUpperCase()}</p>
        </div>
      `;
    }).join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f1f5f9;">
          <!-- Header with ΦΟΜΟ branding - matching splash screen gradient -->
          <div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 48px 24px 36px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px;">ΦΟΜΟ</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 10px 0 20px 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Cyprus Events</p>
            <p style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 500;">Your tickets are ready! 🎉</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 32px 24px;">
            <!-- Greeting -->
            ${customerName ? `<p style="color: #102b4a; font-size: 16px; margin: 0 0 24px 0;">Hi <strong>${customerName}</strong>,</p>` : ''}
            <p style="color: #374151; font-size: 16px; margin: 0 0 28px 0; line-height: 1.6;">Thank you for your purchase! Your tickets are confirmed and ready for use. We can't wait to see you there!</p>
            
            <!-- Event Details Card -->
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f7f5 100%); border-radius: 16px; padding: 24px; margin-bottom: 28px; border-left: 4px solid #3ec3b7;">
              <h2 style="margin: 0 0 16px 0; color: #102b4a; font-size: 22px; font-weight: bold;">${eventTitle}</h2>
              ${businessName ? `<p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">Organized by <strong style="color: #102b4a;">${businessName}</strong></p>` : ''}
              <div style="display: flex; flex-wrap: wrap; gap: 16px;">
                ${formattedDate ? `
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">📅</span>
                    <span style="color: #374151; font-size: 14px;">${formattedDate}</span>
                  </div>
                ` : ''}
                ${eventLocation ? `
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">📍</span>
                    <span style="color: #374151; font-size: 14px;">${eventLocation}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Event Cover Image -->
            ${eventCoverImage ? `
              <div style="border-radius: 16px; overflow: hidden; margin-bottom: 28px;">
                <img src="${eventCoverImage}" alt="${eventTitle}" style="width: 100%; height: auto; display: block;" />
              </div>
            ` : ''}

            <!-- Order Info -->
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 24px 0; text-transform: uppercase; letter-spacing: 1px;">Order #${orderId.slice(0, 8).toUpperCase()}</p>

            <!-- Tickets Section -->
            <h3 style="color: #102b4a; margin: 0 0 8px 0; font-size: 20px; text-align: center; font-weight: bold;">Your Entry Passes</h3>
            <p style="color: #64748b; margin: 0 0 24px 0; text-align: center; font-size: 14px;">Present these QR codes at the entrance</p>
            
            ${ticketDetails}

            <!-- Footer Note -->
            <div style="margin-top: 36px; padding-top: 24px; border-top: 2px solid #e2e8f0; text-align: center;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0; line-height: 1.6;">
                You can also access your tickets anytime from your <strong>ΦΟΜΟ dashboard</strong>.
              </p>
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                Questions? Contact the event organizer for assistance.
              </p>
            </div>
          </div>

          <!-- Brand Footer -->
          <div style="background: #102b4a; padding: 28px; text-align: center;">
            <p style="color: #3ec3b7; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px 0;">ΦΟΜΟ</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} ΦΟΜΟ. Discover events in Cyprus.
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <tickets@fomo.com.cy>",
      to: [userEmail],
      subject: `🎟️ Your tickets for ${eventTitle}`,
      html: emailHtml,
    });

    logStep("Email sent successfully", emailResponse);

    // Create in-app notification for the user
    if (userId) {
      try {
        await supabaseClient.from('notifications').insert({
          user_id: userId,
          title: '🎟️ Τα εισιτήριά σου είναι έτοιμα!',
          message: `${tickets.length} εισιτήρι${tickets.length > 1 ? 'α' : 'ο'} για "${eventTitle}"`,
          type: 'ticket',
          event_type: 'ticket_purchased',
          entity_type: 'ticket',
          entity_id: orderId,
          deep_link: `/dashboard-user/tickets`,
          delivered_at: new Date().toISOString(),
        });
        logStep("In-app notification created for user", { userId });

        // Send push notification
        const pushResult = await sendPushIfEnabled(userId, {
          title: '🎟️ Τα εισιτήριά σου είναι έτοιμα!',
          body: `${tickets.length} εισιτήρι${tickets.length > 1 ? 'α' : 'ο'} για "${eventTitle}"`,
          tag: `ticket-${orderId}`,
          data: {
            url: `/dashboard-user/tickets`,
            type: 'ticket_purchased',
            entityType: 'ticket',
            entityId: orderId,
          },
        }, supabaseClient);
        logStep("Push notification sent", pushResult);
      } catch (notifError) {
        logStep("Failed to create in-app notification", notifError);
      }
    }

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
