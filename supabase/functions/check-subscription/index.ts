import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Safe timestamp conversion helper
const safeTimestampToISO = (timestamp: number | null | undefined): string => {
  if (timestamp === null || timestamp === undefined || isNaN(timestamp)) {
    return new Date().toISOString();
  }
  try {
    return new Date(timestamp * 1000).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

// Product ID to plan slug mapping - NEW (Basic/Pro/Elite)
const PRODUCT_TO_PLAN: Record<string, string> = {
  // NEW products
  'prod_TnXuZRPpopjiki': 'basic',       // Basic Monthly
  'prod_TnXujnMCC4egp8': 'basic',       // Basic Annual
  'prod_TnXuM6SsuuyScm': 'pro',         // Pro Monthly
  'prod_TnXu1Cjr9IvzhA': 'pro',         // Pro Annual
  'prod_TnXuOoALyrNdew': 'elite',       // Elite Monthly
  'prod_TnXuV3hkfa3wQJ': 'elite',       // Elite Annual
  // LEGACY products (map to new slugs for backwards compatibility)
  'prod_TjOhhBOl8h6KSY': 'basic',       // Old Starter Monthly
  'prod_TjOvLr9W7CmRrp': 'basic',       // Old Starter Annual
  'prod_TjOj8tEFcsmxHJ': 'pro',         // Old Growth Monthly
  'prod_TjOwPgvfysk22': 'pro',          // Old Growth Annual
  'prod_TjOlA1wCzel4BC': 'elite',       // Old Professional Monthly
  'prod_TjOwpvKhaDl3xS': 'elite',       // Old Professional Annual
};

Deno.serve(async (req) => {
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

    // First check database for existing subscription
    const { data: existingDbSub, error: dbSubError } = await supabaseClient
      .from('business_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .single();

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    // If no Stripe customer but has DB subscription, use that
    if (customers.data.length === 0) {
      if (existingDbSub && existingDbSub.subscription_plans) {
        logStep('No Stripe customer, but found DB subscription', { planSlug: existingDbSub.subscription_plans.slug });
        const plan = existingDbSub.subscription_plans;
        return new Response(JSON.stringify({
          subscribed: true,
          plan_slug: plan.slug,
          plan_name: plan.name,
          billing_cycle: existingDbSub.billing_cycle || 'monthly',
          status: 'active',
          subscription_end: existingDbSub.current_period_end,
          monthly_budget_remaining_cents: existingDbSub.monthly_budget_remaining_cents || plan.event_boost_budget_cents,
          commission_free_offers_remaining: existingDbSub.commission_free_offers_remaining || 0,
          event_boost_budget_cents: plan.event_boost_budget_cents,
          commission_free_offers_count: plan.commission_free_offers_count || 0,
          commission_percent: plan.commission_percent || 12,
          analytics_level: plan.analytics_level || 'overview',
          downgrade_pending: !!existingDbSub.downgraded_to_free_at,
          downgrade_effective_date: existingDbSub.downgraded_to_free_at ? existingDbSub.current_period_end : null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      logStep('No Stripe customer found');
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep('Found Stripe customer', { customerId });

    // Don't use expand - Stripe limits nested expansion depth
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;

    // If no Stripe subscription, but has DB subscription, use that
    if (!hasActiveSub) {
      if (existingDbSub && existingDbSub.subscription_plans) {
        logStep('No active Stripe subscription, but found DB subscription', { planSlug: existingDbSub.subscription_plans.slug });
        const plan = existingDbSub.subscription_plans;
        return new Response(JSON.stringify({
          subscribed: true,
          plan_slug: plan.slug,
          plan_name: plan.name,
          billing_cycle: existingDbSub.billing_cycle || 'monthly',
          status: 'active',
          subscription_end: existingDbSub.current_period_end,
          monthly_budget_remaining_cents: existingDbSub.monthly_budget_remaining_cents || plan.event_boost_budget_cents,
          commission_free_offers_remaining: existingDbSub.commission_free_offers_remaining || 0,
          event_boost_budget_cents: plan.event_boost_budget_cents,
          commission_free_offers_count: plan.commission_free_offers_count || 0,
          commission_percent: plan.commission_percent || 12,
          analytics_level: plan.analytics_level || 'overview',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      logStep('No active subscription found');
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const subscriptionEnd = safeTimestampToISO(subscription.current_period_end);
    const subscriptionStart = safeTimestampToISO(subscription.current_period_start);
    
    const priceItem = subscription.items.data[0];
    
    // Get product ID from price - product is always a string ID when not expanded
    const priceId = priceItem.price.id;
    const productId = typeof priceItem.price.product === 'string' 
      ? priceItem.price.product 
      : priceItem.price.product?.id || '';
    
    const planSlug = PRODUCT_TO_PLAN[productId] || 'basic';
    logStep('Determined subscription details', { 
      subscriptionId: subscription.id, 
      priceId,
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
    let commissionFreeOffersRemaining = plan.commission_free_offers_count || 0;

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
      commission_free_offers_count: plan.commission_free_offers_count || 0,
      commission_percent: plan.commission_percent || 12,
      analytics_level: plan.analytics_level || 'overview',
      downgrade_pending: !!existingSub?.downgraded_to_free_at,
      downgrade_effective_date: existingSub?.downgraded_to_free_at ? subscriptionEnd : null,
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
