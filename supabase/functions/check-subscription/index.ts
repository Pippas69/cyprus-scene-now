import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product ID to plan slug mapping
const PRODUCT_TO_PLAN: Record<string, string> = {
  'prod_RqVXjkK9fzPxX9': 'starter',
  'prod_RqVXc5lAqKL1oo': 'growth',
  'prod_RqVXz0YYzYLjDE': 'professional',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    logStep('Function started');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set');
    logStep('Stripe key verified');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    logStep('Authorization header found');

    const token = authHeader.replace('Bearer ', '');
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated or email not available');
    logStep('User authenticated', { userId: user.id, email: user.email });

    // Get business ID for this user
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      logStep('No business found for user');
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    logStep('Business found', { businessId: business.id });

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep('No Stripe customer found');
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep('Found Stripe customer', { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
      expand: ['data.items.data.price.product'],
    });

    const hasActiveSub = subscriptions.data.length > 0;

    if (!hasActiveSub) {
      logStep('No active subscription found');
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    const subscriptionStart = new Date(subscription.current_period_start * 1000).toISOString();
    
    const priceItem = subscription.items.data[0];
    const productId = typeof priceItem.price.product === 'string' 
      ? priceItem.price.product 
      : priceItem.price.product.id;
    
    const planSlug = PRODUCT_TO_PLAN[productId];
    logStep('Determined subscription details', { 
      subscriptionId: subscription.id, 
      productId, 
      planSlug,
      periodEnd: subscriptionEnd 
    });

    // Get plan details from database
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .single();

    if (planError || !plan) {
      logStep('ERROR: Plan not found in database', { planSlug });
      throw new Error(`Plan not found: ${planSlug}`);
    }
    logStep('Plan found in database', { planId: plan.id, planName: plan.name });

    // Check existing business subscription
    const { data: existingSub } = await supabaseClient
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', business.id)
      .single();

    // Determine billing cycle
    const billingCycle = priceItem.price.recurring?.interval === 'year' ? 'annual' : 'monthly';

    // Check if we need to reset monthly budgets (new billing period)
    let monthlyBudgetRemaining = plan.event_boost_budget_cents;
    let commissionFreeOffersRemaining = plan.commission_free_offers_count;

    if (existingSub && existingSub.current_period_start === subscriptionStart) {
      // Same billing period, keep existing values
      monthlyBudgetRemaining = existingSub.monthly_budget_remaining_cents || 0;
      commissionFreeOffersRemaining = existingSub.commission_free_offers_remaining || 0;
      logStep('Same billing period, keeping existing budget values');
    } else {
      logStep('New billing period, resetting budgets');
    }

    // Upsert business_subscriptions record
    const { error: upsertError } = await supabaseClient
      .from('business_subscriptions')
      .upsert({
        business_id: business.id,
        plan_id: plan.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: 'active',
        billing_cycle: billingCycle,
        current_period_start: subscriptionStart,
        current_period_end: subscriptionEnd,
        monthly_budget_remaining_cents: monthlyBudgetRemaining,
        commission_free_offers_remaining: commissionFreeOffersRemaining,
      }, {
        onConflict: 'business_id',
      });

    if (upsertError) {
      logStep('ERROR upserting business subscription', { error: upsertError });
      throw upsertError;
    }
    logStep('Business subscription record updated');

    return new Response(JSON.stringify({
      subscribed: true,
      plan_slug: planSlug,
      plan_name: plan.name,
      billing_cycle: billingCycle,
      status: 'active',
      subscription_end: subscriptionEnd,
      monthly_budget_remaining_cents: monthlyBudgetRemaining,
      commission_free_offers_remaining: commissionFreeOffersRemaining,
      event_boost_budget_cents: plan.event_boost_budget_cents,
      commission_free_offers_count: plan.commission_free_offers_count,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in check-subscription', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
