import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Safe timestamp conversion helper
const safeTimestampToISO = (timestamp: number | null | undefined): string => {
  if (timestamp === null || timestamp === undefined || isNaN(timestamp)) {
    return new Date().toISOString(); // Fallback to now
  }
  try {
    return new Date(timestamp * 1000).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe-signature header");

    const body = await req.text();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified", { type: event.type });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: errorMsg });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout.session.completed", { sessionId: session.id, mode: session.mode });

      if (session.mode === "subscription") {
        // Handle subscription checkout
        logStep("Processing subscription checkout");
        
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const customerId = session.customer as string;
        
        // Get customer email to find business
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;
        
        if (!email) throw new Error("Customer email not found");

        // Find user and business by email
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (!profile) throw new Error("Profile not found for email");

        const { data: business } = await supabaseClient
          .from('businesses')
          .select('id')
          .eq('user_id', profile.id)
          .single();

        if (!business) throw new Error("Business not found for user");

        // Get plan from session metadata (passed from create-subscription-checkout)
        const planId = session.metadata?.plan_id;
        
        if (!planId) {
          // Fallback: use product ID mapping
          const productId = subscription.items.data[0].price.product as string;
          const PRODUCT_TO_PLAN: Record<string, string> = {
            'prod_TVSonedIy7XkZP': 'starter',
            'prod_TVSrQMBUEJcK9U': 'starter',
            'prod_TVSrruG57XDuaf': 'growth',
            'prod_TVSrS3ku7sHjV8': 'growth',
            'prod_TVSrsxDx5fVltE': 'professional',
            'prod_TVSrJNi9KJtRYz': 'professional',
          };
          const planSlug = PRODUCT_TO_PLAN[productId];
          if (!planSlug) throw new Error(`Unknown product ID: ${productId}`);
          
          const { data: plan } = await supabaseClient
            .from('subscription_plans')
            .select('*')
            .eq('slug', planSlug)
            .single();
          
          if (!plan) throw new Error("Plan not found for slug");
          
          // Use the found plan
          var resolvedPlan = plan;
        } else {
          const { data: plan } = await supabaseClient
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .single();
          
          if (!plan) throw new Error("Plan not found for ID");
          var resolvedPlan = plan;
        }

        // Create or update business subscription
        const { error: subError } = await supabaseClient
          .from('business_subscriptions')
          .upsert({
            business_id: business.id,
            plan_id: resolvedPlan.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            status: 'active',
            billing_cycle: subscription.items.data[0].price.recurring?.interval === 'year' ? 'annual' : 'monthly',
            current_period_start: safeTimestampToISO(subscription.current_period_start),
            current_period_end: safeTimestampToISO(subscription.current_period_end),
            monthly_budget_remaining_cents: resolvedPlan.event_boost_budget_cents,
            commission_free_offers_remaining: resolvedPlan.commission_free_offers_count
          });

        if (subError) throw subError;
        logStep("Subscription created/updated successfully");

      } else if (session.mode === "payment") {
        // Handle boost payment
        const metadata = session.metadata;
        logStep("Processing boost payment", { metadata });
        
        if (metadata?.type === "event_boost" && metadata?.boost_id) {
          const boostId = metadata.boost_id;
          logStep("Updating boost to scheduled", { boostId });
          
          // Update event_boost status from pending to scheduled
          const { error: boostError } = await supabaseClient
            .from('event_boosts')
            .update({
              status: 'scheduled',
              stripe_payment_intent_id: session.payment_intent as string
            })
            .eq('id', boostId)
            .eq('status', 'pending'); // Only update if still pending

          if (boostError) {
            logStep("Error updating boost", { error: boostError.message });
            throw boostError;
          }
          logStep("Boost status updated to scheduled successfully");
        } else {
          logStep("Payment completed but no boost_id in metadata - skipping boost update");
        }
      }
    }

    // Handle invoice.paid for subscription renewals
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Processing invoice.paid", { invoiceId: invoice.id });

      if (invoice.subscription) {
        const subscriptionId = invoice.subscription as string;
        
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Find business subscription
        const { data: businessSub } = await supabaseClient
          .from('business_subscriptions')
          .select('*, subscription_plans(*)')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (businessSub && businessSub.subscription_plans) {
          // Reset monthly budget and commission-free offers
          const { error: resetError } = await supabaseClient
            .from('business_subscriptions')
            .update({
              monthly_budget_remaining_cents: businessSub.subscription_plans.event_boost_budget_cents,
              commission_free_offers_remaining: businessSub.subscription_plans.commission_free_offers_count,
              current_period_start: safeTimestampToISO(subscription.current_period_start),
              current_period_end: safeTimestampToISO(subscription.current_period_end)
            })
            .eq('id', businessSub.id);

          if (resetError) throw resetError;
          logStep("Subscription budget and offers reset");
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
