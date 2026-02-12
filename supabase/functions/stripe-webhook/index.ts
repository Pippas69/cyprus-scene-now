import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
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
      console.error("[STRIPE-WEBHOOK] Signature verification FAILED:", errorMsg);
      console.error("[STRIPE-WEBHOOK] Received signature:", signature?.substring(0, 20) + "...");
      console.error("[STRIPE-WEBHOOK] Webhook secret configured:", webhookSecret ? "Yes (starts with " + webhookSecret.substring(0, 10) + "...)" : "No");
      return new Response(JSON.stringify({ error: "Invalid signature", details: errorMsg }), {
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
            'prod_TjOhhBOl8h6KSY': 'starter',       // Starter Monthly
            'prod_TjOvLr9W7CmRrp': 'starter',       // Starter Annual
            'prod_TjOj8tEFcsmxHJ': 'growth',        // Growth Monthly
            'prod_TjOwPgvfysk22': 'growth',         // Growth Annual
            'prod_TjOlA1wCzel4BC': 'professional',  // Professional Monthly
            'prod_TjOwpvKhaDl3xS': 'professional',  // Professional Annual
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
            current_period_start: safeTimestampToISO((subscription.items.data[0] as any).current_period_end ? (subscription.items.data[0] as any).current_period_start : subscription.current_period_start),
            current_period_end: safeTimestampToISO((subscription.items.data[0] as any).current_period_end ?? subscription.current_period_end),
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
          const partialBudgetCents = parseInt(metadata?.partial_budget_cents || "0", 10);
          const businessId = metadata?.business_id;
          logStep("Updating event boost after payment", { boostId, partialBudgetCents, businessId });
          
          // Deduct partial budget if applicable
          if (partialBudgetCents > 0 && businessId) {
            const { data: sub } = await supabaseClient
              .from('business_subscriptions')
              .select('id, monthly_budget_remaining_cents')
              .eq('business_id', businessId)
              .eq('status', 'active')
              .single();
            
            if (sub) {
              const newBudget = Math.max(0, (sub.monthly_budget_remaining_cents || 0) - partialBudgetCents);
              await supabaseClient
                .from('business_subscriptions')
                .update({ monthly_budget_remaining_cents: newBudget })
                .eq('id', sub.id);
              logStep("Partial budget deducted", { partialBudgetCents, newBudget });
            }
          }
          
          // Get the boost to check start_date
          const { data: boostData, error: fetchError } = await supabaseClient
            .from('event_boosts')
            .select('start_date')
            .eq('id', boostId)
            .single();
          
          if (fetchError) {
            logStep("Error fetching boost", { error: fetchError.message });
            throw fetchError;
          }
          
          // Determine status: active if start_date is today or past, otherwise scheduled
          const startDate = new Date(boostData.start_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          startDate.setHours(0, 0, 0, 0);
          
          const newStatus = startDate <= today ? 'active' : 'scheduled';
          logStep("Determined boost status", { startDate: boostData.start_date, newStatus });
          
          // Update event_boost status from pending
          const { error: boostError } = await supabaseClient
            .from('event_boosts')
            .update({
              status: newStatus,
              stripe_payment_intent_id: session.payment_intent as string
            })
            .eq('id', boostId)
            .eq('status', 'pending'); // Only update if still pending

          if (boostError) {
            logStep("Error updating boost", { error: boostError.message });
            throw boostError;
          }
          logStep(`Event boost status updated to ${newStatus} successfully`);
        } else if (metadata?.type === "offer_boost" && metadata?.boost_id) {
          const boostId = metadata.boost_id;
          const partialBudgetCents = parseInt(metadata?.partial_budget_cents || "0", 10);
          const businessId = metadata?.business_id;
          logStep("Updating offer boost after payment", { boostId, partialBudgetCents, businessId });
          
          // Deduct partial budget if applicable
          if (partialBudgetCents > 0 && businessId) {
            const { data: sub } = await supabaseClient
              .from('business_subscriptions')
              .select('id, monthly_budget_remaining_cents')
              .eq('business_id', businessId)
              .eq('status', 'active')
              .single();
            
            if (sub) {
              const newBudget = Math.max(0, (sub.monthly_budget_remaining_cents || 0) - partialBudgetCents);
              await supabaseClient
                .from('business_subscriptions')
                .update({ monthly_budget_remaining_cents: newBudget })
                .eq('id', sub.id);
              logStep("Partial budget deducted for offer boost", { partialBudgetCents, newBudget });
            }
          }
          
          // Get the boost to check start_date
          const { data: boostData, error: fetchError } = await supabaseClient
            .from('offer_boosts')
            .select('start_date')
            .eq('id', boostId)
            .single();
          
          if (fetchError) {
            logStep("Error fetching offer boost", { error: fetchError.message });
            throw fetchError;
          }
          
          const startDate = new Date(boostData.start_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          startDate.setHours(0, 0, 0, 0);
          
          const newStatus = startDate <= today ? 'active' : 'scheduled';
          
          const { error: boostError } = await supabaseClient
            .from('offer_boosts')
            .update({
              status: newStatus,
              active: newStatus === 'active',
              stripe_payment_intent_id: session.payment_intent as string
            })
            .eq('id', boostId)
            .eq('status', 'pending');

          if (boostError) throw boostError;
          logStep(`Offer boost status updated to ${newStatus} successfully`);
        } else if (metadata?.type === "profile_boost" && metadata?.boost_id) {
          const boostId = metadata.boost_id;
          logStep("Updating profile boost after payment", { boostId });
          
          // Get the boost to check start_date
          const { data: boostData, error: fetchError } = await supabaseClient
            .from('profile_boosts')
            .select('start_date')
            .eq('id', boostId)
            .single();
          
          if (fetchError) {
            logStep("Error fetching profile boost", { error: fetchError.message });
            throw fetchError;
          }
          
          // Determine status: active if start_date is today or past, otherwise scheduled
          const startDate = new Date(boostData.start_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          startDate.setHours(0, 0, 0, 0);
          
          const newStatus = startDate <= today ? 'active' : 'scheduled';
          logStep("Determined profile boost status", { startDate: boostData.start_date, newStatus });
          
          // Update profile_boost status from pending
          const { error: boostError } = await supabaseClient
            .from('profile_boosts')
            .update({
              status: newStatus,
              stripe_payment_intent_id: session.payment_intent as string
            })
            .eq('id', boostId)
            .eq('status', 'pending'); // Only update if still pending

          if (boostError) {
            logStep("Error updating profile boost", { error: boostError.message });
            throw boostError;
          }
          logStep(`Profile boost status updated to ${newStatus} successfully`);
        } else {
          logStep("Payment completed but no recognized boost type in metadata - skipping boost update");
        }
      }
    }

    // Handle subscription updates (plan changes via proration)
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Processing customer.subscription.updated", { subscriptionId: subscription.id, status: subscription.status });

      if (subscription.status === "active") {
        // Find business subscription by stripe_subscription_id
        const { data: businessSub } = await supabaseClient
          .from('business_subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (businessSub) {
          const productId = typeof subscription.items.data[0].price.product === 'string'
            ? subscription.items.data[0].price.product
            : subscription.items.data[0].price.product?.id || '';

          const PRODUCT_TO_PLAN_NEW: Record<string, string> = {
            // CURRENT products
            'prod_TwR5CuBhxobuaB': 'basic',
            'prod_TwR5dSukCnRhmV': 'basic',
            'prod_TwR5lPqVQDQwdM': 'pro',
            'prod_TwR5KM1dqUMxPJ': 'pro',
            'prod_TwR5XZb3OfOGxA': 'elite',
            'prod_TwR5uz1rCytowj': 'elite',
            // Older products
            'prod_TnXuZRPpopjiki': 'basic',
            'prod_TnXujnMCC4egp8': 'basic',
            'prod_TnXuM6SsuuyScm': 'pro',
            'prod_TnXu1Cjr9IvzhA': 'pro',
            'prod_TnXuOoALyrNdew': 'elite',
            'prod_TnXuV3hkfa3wQJ': 'elite',
            'prod_TjOhhBOl8h6KSY': 'basic',
            'prod_TjOvLr9W7CmRrp': 'basic',
            'prod_TjOj8tEFcsmxHJ': 'pro',
            'prod_TjOwPgvfysk22': 'pro',
            'prod_TjOlA1wCzel4BC': 'elite',
            'prod_TjOwpvKhaDl3xS': 'elite',
          };

          const newPlanSlug = PRODUCT_TO_PLAN_NEW[productId];
          if (newPlanSlug) {
            const { data: newPlan } = await supabaseClient
              .from('subscription_plans')
              .select('*')
              .eq('slug', newPlanSlug)
              .single();

            if (newPlan) {
              const billingCycle = subscription.items.data[0].price.recurring?.interval === 'year' ? 'annual' : 'monthly';
              
              // For upgrades, immediately give new plan benefits
              const { error: updateError } = await supabaseClient
                .from('business_subscriptions')
                .update({
                  plan_id: newPlan.id,
                  billing_cycle: billingCycle,
                  current_period_start: safeTimestampToISO((subscription.items.data[0] as any).current_period_start ?? subscription.current_period_start),
                  current_period_end: safeTimestampToISO((subscription.items.data[0] as any).current_period_end ?? subscription.current_period_end),
                  monthly_budget_remaining_cents: newPlan.event_boost_budget_cents,
                  commission_free_offers_remaining: newPlan.commission_free_offers_count || 0,
                  downgraded_to_free_at: null, // Clear any pending downgrade
                })
                .eq('id', businessSub.id);

              if (updateError) throw updateError;
              logStep("Subscription plan updated via webhook", { newPlanSlug, newPlanId: newPlan.id });

              // Log plan history
              await supabaseClient.from('business_subscription_plan_history').insert({
                business_id: businessSub.business_id,
                plan_slug: newPlanSlug,
                source: 'stripe_subscription_updated',
                valid_from: safeTimestampToISO((subscription.items.data[0] as any).current_period_start ?? subscription.current_period_start),
              });
            }
          }
        }
      }
    }

    // Handle subscription deleted (cancelled at period end)
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Processing customer.subscription.deleted", { subscriptionId: subscription.id });

      const { data: businessSub } = await supabaseClient
        .from('business_subscriptions')
        .select('*')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (businessSub) {
        // Get free plan
        const { data: freePlan } = await supabaseClient
          .from('subscription_plans')
          .select('*')
          .eq('slug', 'free')
          .single();

        if (freePlan) {
          const now = new Date().toISOString();
          const periodEnd = new Date();
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          const { error: updateError } = await supabaseClient
            .from('business_subscriptions')
            .update({
              plan_id: freePlan.id,
              status: 'active',
              stripe_subscription_id: null,
              billing_cycle: 'monthly',
              current_period_start: now,
              current_period_end: periodEnd.toISOString(),
              monthly_budget_remaining_cents: 0,
              commission_free_offers_remaining: 0,
              downgraded_to_free_at: null,
              canceled_at: null,
            })
            .eq('id', businessSub.id);

          if (updateError) throw updateError;
          logStep("Business downgraded to free plan", { businessId: businessSub.business_id });

          // Log plan history
          await supabaseClient.from('business_subscription_plan_history').insert({
            business_id: businessSub.business_id,
            plan_slug: 'free',
            source: 'stripe_subscription_deleted',
            valid_from: now,
          });
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
              current_period_start: safeTimestampToISO((subscription.items.data[0] as any).current_period_start ?? subscription.current_period_start),
              current_period_end: safeTimestampToISO((subscription.items.data[0] as any).current_period_end ?? subscription.current_period_end)
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
