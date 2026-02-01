import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

// Force cache refresh - v1
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[EXPIRE-UNPAID-RESERVATIONS] ${step}`, details ? JSON.stringify(details) : "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started - checking for expired unpaid reservations");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find offer_purchases that are awaiting_payment and have expired payment links
    const now = new Date().toISOString();
    
    const { data: expiredPurchases, error: fetchError } = await supabaseAdmin
      .from("offer_purchases")
      .select(`
        id,
        reservation_id,
        user_id,
        business_id,
        payment_link_expires_at,
        discounts (
          title,
          businesses (id, name, user_id)
        )
      `)
      .eq("status", "awaiting_payment")
      .not("payment_link_expires_at", "is", null)
      .lt("payment_link_expires_at", now) as { data: any[] | null; error: any };

    if (fetchError) {
      throw new Error(`Error fetching expired purchases: ${fetchError.message}`);
    }

    logStep("Found expired purchases", { count: expiredPurchases?.length || 0 });

    if (!expiredPurchases || expiredPurchases.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "No expired unpaid reservations found",
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let processedCount = 0;
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    for (const purchase of expiredPurchases) {
      try {
        logStep("Processing expired purchase", { purchaseId: purchase.id, reservationId: purchase.reservation_id });

        // Update offer_purchase status to "expired"
        const { error: updatePurchaseError } = await supabaseAdmin
          .from("offer_purchases")
          .update({ status: "expired" })
          .eq("id", purchase.id);

        if (updatePurchaseError) {
          console.error("Error updating purchase:", updatePurchaseError);
          continue;
        }

        // Update linked reservation to "cancelled"
        if (purchase.reservation_id) {
          const { error: updateReservationError } = await supabaseAdmin
            .from("reservations")
            .update({ status: "cancelled" })
            .eq("id", purchase.reservation_id);

          if (updateReservationError) {
            console.error("Error updating reservation:", updateReservationError);
          }
        }

        // Notify business owner about the expired reservation
        if (resend && purchase.discounts?.businesses?.user_id) {
          // Get business owner's profile
          const { data: businessOwner } = await supabaseAdmin
            .from("profiles")
            .select("email, name")
            .eq("id", purchase.discounts.businesses.user_id)
            .single();

          // Get customer's profile
          const { data: customer } = await supabaseAdmin
            .from("profiles")
            .select("name, email")
            .eq("id", purchase.user_id)
            .single();

          if (businessOwner?.email) {
            const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: #ef4444; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Payment Expired</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
        Hi ${businessOwner.name || 'there'},
      </p>
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
        A customer didn't complete their payment within the 24-hour window. The reservation has been automatically cancelled.
      </p>
      
      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Offer:</p>
        <h3 style="margin: 0 0 15px 0; color: #333;">${purchase.discounts?.title || 'Unknown offer'}</h3>
        <p style="margin: 0 0 5px 0; font-size: 14px; color: #666;">Customer:</p>
        <p style="margin: 0; color: #333;">${customer?.name || 'Unknown'} (${customer?.email || 'No email'})</p>
      </div>

      <p style="font-size: 14px; color: #666; margin-bottom: 0;">
        The reservation slot is now available for other customers.
      </p>
    </div>
    <div style="background: #f8f9fa; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        ΦΟΜΟ Cyprus - Business Dashboard
      </p>
    </div>
  </div>
</body>
</html>
            `;

            try {
              await resend.emails.send({
                from: "ΦΟΜΟ <noreply@fomocy.com>",
                to: [businessOwner.email],
                subject: `⏰ Payment Expired - Reservation Cancelled`,
                html: emailHtml,
              });
              logStep("Business notification sent", { businessEmail: businessOwner.email });

              // Send push notification to business owner
              const pushResult = await sendPushIfEnabled(purchase.discounts.businesses.user_id, {
                title: '⏰ Πληρωμή έληξε',
                body: `Κράτηση ακυρώθηκε - ${customer?.name || 'Πελάτης'}`,
                tag: `expired-reservation-${purchase.id}`,
                data: {
                  url: '/dashboard-business/reservations',
                  type: 'payment_expired',
                  entityType: 'reservation',
                },
              }, supabaseAdmin);
              logStep("Push notification sent to business", pushResult);
            } catch (emailError) {
              console.error("Error sending business notification:", emailError);
            }
          }
        }

        processedCount++;
      } catch (processError) {
        console.error("Error processing expired purchase:", processError);
      }
    }

    logStep("Processing complete", { processedCount });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Processed ${processedCount} expired reservations`,
      processed: processedCount
    }), {
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
