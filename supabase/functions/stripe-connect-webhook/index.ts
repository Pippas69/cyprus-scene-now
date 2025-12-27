import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-CONNECT-WEBHOOK] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeConnectWebhookSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET");

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (stripeConnectWebhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          stripeConnectWebhookSecret
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logStep("Webhook signature verification failed", { error: errorMessage });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // If no webhook secret configured, parse without verification (for development)
      logStep("No webhook secret configured, parsing without verification");
      event = JSON.parse(body) as Stripe.Event;
    }

    logStep("Event received", { type: event.type, id: event.id });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle account.updated events
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      logStep("Processing account.updated", { 
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted
      });

      // Find the business with this Stripe account
      const { data: business, error: businessError } = await supabaseClient
        .from("businesses")
        .select("id, stripe_account_id")
        .eq("stripe_account_id", account.id)
        .single();

      if (businessError || !business) {
        logStep("Business not found for account", { accountId: account.id });
        // Return 200 anyway to acknowledge receipt
        return new Response(JSON.stringify({ received: true, warning: "Business not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Update the business with the current account status
      const { error: updateError } = await supabaseClient
        .from("businesses")
        .update({
          stripe_onboarding_completed: account.details_submitted ?? false,
          stripe_payouts_enabled: account.payouts_enabled ?? false,
        })
        .eq("id", business.id);

      if (updateError) {
        logStep("Failed to update business", { error: updateError });
      } else {
        logStep("Business updated successfully", { 
          businessId: business.id,
          onboardingCompleted: account.details_submitted,
          payoutsEnabled: account.payouts_enabled
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
