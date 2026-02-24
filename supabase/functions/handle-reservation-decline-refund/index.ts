import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

// Force cache refresh - v1
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reservationId } = await req.json();

    if (!reservationId) {
      return new Response(
        JSON.stringify({ error: "Reservation ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find any offer purchase linked to this reservation
    const { data: purchase, error: purchaseError } = await supabase
      .from("offer_purchases")
      .select(`
        id,
        status,
        stripe_payment_intent_id,
        user_id,
        amount_cents,
        discounts (
          id,
          title,
          business_id,
          businesses (
            name
          )
        )
      `)
      .eq("reservation_id", reservationId)
      .eq("status", "paid")
      .maybeSingle();

    if (purchaseError) {
      console.error("Error fetching offer purchase:", purchaseError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch offer purchase", details: purchaseError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No linked purchase found - nothing to refund
    if (!purchase) {
      console.log("No paid offer purchase linked to this reservation");
      return new Response(
        JSON.stringify({ success: true, message: "No linked offer purchase to refund" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found linked offer purchase:", purchase.id);

    // Check if we have a payment intent to refund
    if (!purchase.stripe_payment_intent_id) {
      console.log("No payment intent ID found for purchase");
      
      // Still update the status to cancelled
      await supabase
        .from("offer_purchases")
        .update({ status: "cancelled" })
        .eq("id", purchase.id);

      return new Response(
        JSON.stringify({ success: true, message: "Purchase cancelled (no payment to refund)" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe and issue refund
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Calculate 97% refund (3% retention fee for processing)
    const REFUND_PERCENTAGE = 0.97;
    const originalAmountCents = purchase.amount_cents;
    const refundAmountCents = Math.floor(originalAmountCents * REFUND_PERCENTAGE);
    const feeRetainedCents = originalAmountCents - refundAmountCents;

    console.log(`Processing partial refund: Original €${(originalAmountCents / 100).toFixed(2)}, Refund €${(refundAmountCents / 100).toFixed(2)}, Fee €${(feeRetainedCents / 100).toFixed(2)}`);

    // Create the partial refund (97% of original amount)
    const refund = await stripe.refunds.create({
      payment_intent: purchase.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: "requested_by_customer",
    });

    console.log("Stripe partial refund created:", refund.id);

    // Update purchase status to refunded
    const { error: updateError } = await supabase
      .from("offer_purchases")
      .update({ status: "refunded" })
      .eq("id", purchase.id);

    if (updateError) {
      console.error("Error updating purchase status:", updateError);
    }

    // Get user email for notification
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", purchase.user_id)
      .single();

    // Send refund notification email with fee breakdown
    if (resendApiKey && userProfile?.email) {
      try {
        const resend = new Resend(resendApiKey);
        const discountData = purchase.discounts as any;
        const businessName = discountData?.businesses?.name || "The business";
        const offerTitle = discountData?.title || "your offer";
        const originalAmount = (originalAmountCents / 100).toFixed(2);
        const refundAmount = (refundAmountCents / 100).toFixed(2);
        const feeRetained = (feeRetainedCents / 100).toFixed(2);

        await resend.emails.send({
          from: "ΦΟΜΟ <support@fomo.com.cy>",
          to: [userProfile.email],
          subject: "Your reservation was declined - Partial refund processed",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Reservation Declined</h1>
              <p>Hi ${userProfile.name || "there"},</p>
              <p>Unfortunately, <strong>${businessName}</strong> was unable to accommodate your reservation.</p>
              <p>Your purchase for "<strong>${offerTitle}</strong>" has been refunded with a 3% processing fee retained.</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Original Payment</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd; text-align: right;">€${originalAmount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Processing Fee (3%)</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd; text-align: right; color: #666;">-€${feeRetained}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Refund Amount</strong></td>
                    <td style="padding: 8px 0; text-align: right; color: #22c55e; font-size: 18px;"><strong>€${refundAmount}</strong></td>
                  </tr>
                </table>
                <p style="margin: 15px 0 0; font-size: 12px; color: #888;">Refund ID: ${refund.id}</p>
              </div>
              
              <p style="color: #666;">The refund will appear on your payment method within 5-10 business days, depending on your bank.</p>
              <p>We apologize for any inconvenience. Please feel free to browse other offers on ΦΟΜΟ!</p>
              <p style="margin-top: 30px;">Best regards,<br>The ΦΟΜΟ Team</p>
            </div>
          `,
        });
        console.log("Refund notification email sent to:", userProfile.email);

        // Send push notification
        const pushResult = await sendPushIfEnabled(purchase.user_id, {
          title: '❌ Κράτηση απορρίφθηκε',
          body: `Επιστροφή €${refundAmount} επεξεργάστηκε`,
          tag: `refund-${purchase.id}`,
          data: {
            url: '/dashboard-user/offers',
            type: 'reservation_declined_refund',
            entityType: 'purchase',
            entityId: purchase.id,
          },
        }, supabase);
        console.log("Push notification sent:", pushResult);
      } catch (emailError) {
        console.error("Error sending refund email:", emailError);
        // Don't fail the whole operation if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        purchaseId: purchase.id,
        message: "Refund processed successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in handle-reservation-decline-refund:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
