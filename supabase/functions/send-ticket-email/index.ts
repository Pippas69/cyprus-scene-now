import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-TICKET-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
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

    const { orderId, userEmail, eventTitle, tickets, eventDate, eventLocation, businessName, customerName } = await req.json();
    logStep("Request data", { orderId, userEmail, eventTitle, ticketCount: tickets?.length, businessName });

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

    // Generate QR code URLs for each ticket (using a public QR code generator)
    const ticketDetails = tickets.map((ticket: { id: string; tierName: string; qrToken: string; pricePaid?: string }, index: number) => {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.qrToken)}`;
      return `
        <div style="background: #ffffff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
          <div style="background: #f0f9ff; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <h3 style="margin: 0; color: #0369a1; font-size: 16px;">Ticket ${index + 1}</h3>
            <p style="margin: 4px 0 0 0; color: #0ea5e9; font-weight: bold;">${ticket.tierName}${ticket.pricePaid ? ` - ${ticket.pricePaid}` : ''}</p>
          </div>
          <img src="${qrCodeUrl}" alt="QR Code" style="width: 180px; height: 180px; margin: 0 auto; display: block; border: 4px solid #0ea5e9; border-radius: 8px;" />
          <p style="font-size: 11px; color: #64748b; margin: 12px 0 0 0;">Ticket ID: ${ticket.id.slice(0, 8)}</p>
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
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">CYPRUS SCENE</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your tickets are ready!</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 32px 24px;">
            <!-- Greeting -->
            ${customerName ? `<p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">Hi ${customerName},</p>` : ''}
            <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">Thank you for your purchase! Your tickets for the event are confirmed and ready to use.</p>
            
            <!-- Event Details Card -->
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #0ea5e9;">
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">${eventTitle}</h2>
              ${businessName ? `<p style="margin: 0 0 12px 0; color: #64748b; font-size: 14px;">Organized by: <strong style="color: #0369a1;">${businessName}</strong></p>` : ''}
              ${formattedDate ? `<p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Date:</strong> ${formattedDate}</p>` : ''}
              ${eventLocation ? `<p style="margin: 0; color: #374151; font-size: 14px;"><strong>Location:</strong> ${eventLocation}</p>` : ''}
            </div>

            <!-- Order Info -->
            <p style="color: #64748b; font-size: 13px; margin: 0 0 24px 0;">Order ID: ${orderId.slice(0, 8).toUpperCase()}</p>

            <!-- Tickets Section -->
            <h3 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px; text-align: center;">Your QR Codes</h3>
            <p style="color: #64748b; margin: 0 0 20px 0; text-align: center; font-size: 14px;">Show these QR codes at the event entrance for check-in</p>
            
            ${ticketDetails}

            <!-- Footer Note -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">
                You can also view and download your tickets anytime from your dashboard.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Have questions? Contact the event organizer for assistance.
              </p>
            </div>
          </div>

          <!-- Brand Footer -->
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Cyprus Scene. Discover events in Cyprus.
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Cyprus Scene <onboarding@resend.dev>",
      to: [userEmail],
      subject: `Your tickets for ${eventTitle} - Cyprus Scene`,
      html: emailHtml,
    });

    logStep("Email sent", emailResponse);

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
