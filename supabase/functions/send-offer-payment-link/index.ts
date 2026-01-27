import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

// Force cache refresh - v1
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SEND-OFFER-PAYMENT-LINK] ${step}`, details ? JSON.stringify(details) : "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { reservationId } = await req.json() as { reservationId: string };
    
    if (!reservationId) throw new Error("Reservation ID is required");

    // Fetch the offer_purchase linked to this reservation
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("offer_purchases")
      .select(`
        *,
        discounts!inner(
          id, title, description, percent_off, offer_type, bonus_percent, credit_amount_cents,
          businesses!inner(id, name, stripe_account_id, stripe_payouts_enabled)
        )
      `)
      .eq("reservation_id", reservationId)
      .eq("status", "awaiting_payment")
      .single();

    if (purchaseError || !purchase) {
      throw new Error("No awaiting payment offer purchase found for this reservation");
    }

    logStep("Purchase found", { purchaseId: purchase.id, status: purchase.status });

    // Fetch user details
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("name, email")
      .eq("id", purchase.user_id)
      .single();

    if (profileError || !profile?.email) {
      throw new Error("Could not find user email");
    }

    logStep("User profile found", { email: profile.email });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Validate destination account
    const stripeAccountId = purchase.discounts.businesses.stripe_account_id;
    try {
      await stripe.accounts.retrieve(stripeAccountId);
    } catch {
      throw new Error("Business payment account is no longer valid");
    }

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create Stripe checkout session
    const origin = "https://fomo.lovable.app";
    const discountPercent = purchase.discount_percent || 0;
    
    const checkoutConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : profile.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${purchase.discounts.title}`,
              description: `${discountPercent > 0 ? `${discountPercent}% off - ` : ''}${purchase.discounts.businesses.name}`,
            },
            unit_amount: purchase.final_price_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/offer-purchase-success?purchase_id=${purchase.id}`,
      cancel_url: `${origin}/dashboard/user?tab=offers`,
      expires_at: Math.floor(expiresAt.getTime() / 1000), // Unix timestamp
      metadata: {
        type: "offer_purchase_with_reservation",
        purchase_id: purchase.id,
        discount_id: purchase.discount_id,
        reservation_id: reservationId,
        user_id: purchase.user_id,
        business_id: purchase.business_id,
      },
    };

    // Add payment intent data for Connect
    checkoutConfig.payment_intent_data = {
      application_fee_amount: purchase.commission_amount_cents || 0,
      transfer_data: {
        destination: stripeAccountId,
      },
    };

    const session = await stripe.checkout.sessions.create(checkoutConfig);
    
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Update purchase record with checkout session and expiration
    await supabaseAdmin
      .from("offer_purchases")
      .update({ 
        stripe_checkout_session_id: session.id,
        payment_link_url: session.url,
        payment_link_expires_at: expiresAt.toISOString(),
      })
      .eq("id", purchase.id);

    logStep("Purchase record updated with payment link");

    // Send email to user with payment link
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      const formattedExpiry = expiresAt.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Reservation Accepted!</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
        Hi ${profile.name || 'there'},
      </p>
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
        Great news! <strong>${purchase.discounts.businesses.name}</strong> has accepted your reservation. 
        Complete your payment to confirm your booking.
      </p>
      
      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #333;">${purchase.discounts.title}</h3>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #6366f1;">
          €${(purchase.final_price_cents / 100).toFixed(2)}
        </p>
        ${discountPercent > 0 ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #22c55e;">You save ${discountPercent}%!</p>` : ''}
      </div>

      <a href="${session.url}" style="display: block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 20px;">
        Complete Payment
      </a>

      <p style="font-size: 14px; color: #ef4444; text-align: center; margin-bottom: 20px;">
        ⏰ Payment link expires: ${formattedExpiry}
      </p>

      <p style="font-size: 14px; color: #666; margin-bottom: 0;">
        If you don't complete payment within 24 hours, your reservation will be automatically cancelled.
      </p>
    </div>
    <div style="background: #f8f9fa; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        FOMO Cyprus - Never miss out!
      </p>
    </div>
  </div>
</body>
</html>
      `;

      try {
        await resend.emails.send({
          from: "FOMO <offers@fomo.cy>",
          to: [profile.email],
          subject: `✅ Reservation Accepted - Complete Your Payment for ${purchase.discounts.businesses.name}`,
          html: emailHtml,
        });
        logStep("Payment link email sent");

        // Send push notification
        const pushResult = await sendPushIfEnabled(purchase.user_id, {
          title: '✅ Κράτηση εγκρίθηκε!',
          body: `Ολοκλήρωσε την πληρωμή για ${purchase.discounts.businesses.name}`,
          tag: `payment-link-${purchase.id}`,
          data: {
            url: session.url,
            type: 'offer_payment_link',
            entityType: 'purchase',
            entityId: purchase.id,
          },
        }, supabaseAdmin);
        logStep("Push notification sent", pushResult);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      checkoutUrl: session.url,
      expiresAt: expiresAt.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
