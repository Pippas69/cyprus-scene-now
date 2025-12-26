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

    const { orderId, userEmail, eventTitle, tickets } = await req.json();
    logStep("Request data", { orderId, userEmail, eventTitle, ticketCount: tickets?.length });

    if (!orderId || !userEmail || !tickets || tickets.length === 0) {
      throw new Error("Missing required fields: orderId, userEmail, or tickets");
    }

    // Generate QR code URLs for each ticket (using a public QR code generator)
    const ticketDetails = tickets.map((ticket: { id: string; tierName: string; qrToken: string }, index: number) => {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.qrToken)}`;
      return `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">
          <h3 style="margin: 0 0 8px 0; color: #0ea5e9;">Ticket ${index + 1} - ${ticket.tierName}</h3>
          <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; margin: 8px auto;" />
          <p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;">ID: ${ticket.id.slice(0, 8)}</p>
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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #0ea5e9; margin: 0;">🎟️ Your Tickets</h1>
              <p style="color: #6b7280; margin: 8px 0 0 0;">Thank you for your purchase!</p>
            </div>
            
            <div style="background-color: #f0f9ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 8px 0; color: #0369a1;">${eventTitle}</h2>
              <p style="margin: 0; color: #6b7280;">Order ID: ${orderId.slice(0, 8)}</p>
            </div>

            <h3 style="color: #374151; margin-bottom: 16px;">Your QR Codes</h3>
            <p style="color: #6b7280; margin-bottom: 16px;">Show these QR codes at the event entrance for check-in:</p>
            
            ${ticketDetails}

            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                You can also view your tickets anytime in your dashboard.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Tickets <onboarding@resend.dev>",
      to: [userEmail],
      subject: `🎟️ Your tickets for ${eventTitle}`,
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
