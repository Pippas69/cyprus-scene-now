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
  // CURRENT products (from price_1SyYD* prices)
  'prod_TwR5CuBhxobuaB': 'basic',       // Basic Monthly
  'prod_TwR5dSukCnRhmV': 'basic',       // Basic Annual
  'prod_TwR5lPqVQDQwdM': 'pro',         // Pro Monthly
  'prod_TwR5KM1dqUMxPJ': 'pro',         // Pro Annual
  'prod_TwR5XZb3OfOGxA': 'elite',       // Elite Monthly
  'prod_TwR5uz1rCytowj': 'elite',       // Elite Annual
  // NEW products (prod_TnXu*)
  'prod_TnXuZRPpopjiki': 'basic',
  'prod_TnXujnMCC4egp8': 'basic',
  'prod_TnXuM6SsuuyScm': 'pro',
  'prod_TnXu1Cjr9IvzhA': 'pro',
  'prod_TnXuOoALyrNdew': 'elite',
  'prod_TnXuV3hkfa3wQJ': 'elite',
  // LEGACY products
  'prod_TjOhhBOl8h6KSY': 'basic',
  'prod_TjOvLr9W7CmRrp': 'basic',
  'prod_TjOj8tEFcsmxHJ': 'pro',
  'prod_TjOwPgvfysk22': 'pro',
  'prod_TjOlA1wCzel4BC': 'elite',
  'prod_TjOwpvKhaDl3xS': 'elite',
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

  // Anon-key client for JWT verification (getClaims requires anon key)
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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
    
    // Use getClaims for signing-keys compatibility
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error(`Authentication error: ${claimsError?.message || 'invalid claims'}`);
    
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    if (!userId || !userEmail) throw new Error('User not authenticated or email not available');
    logStep('User authenticated', { userId, email: userEmail });

    // Get business ID for this user
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('id')
      .eq('user_id', userId)
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
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
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
          downgrade_requested_at: existingDbSub.downgraded_to_free_at || null,
          downgrade_target_plan: existingDbSub.downgrade_target_plan || 'free',
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

    // Fetch all active subscriptions (handle potential duplicates)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 10,
    });

    const hasActiveSub = subscriptions.data.length > 0;

    // If multiple active subscriptions exist, pick the highest-tier one
    let bestSubscription: Stripe.Subscription | null = null;
    let bestPlanSlug = 'free';
    let bestLevel = -1;

    const PLAN_HIERARCHY: Record<string, number> = {
      free: 0, basic: 1, starter: 1, pro: 2, growth: 2, elite: 3, professional: 3,
    };

    if (hasActiveSub) {
      for (const sub of subscriptions.data) {
        const prodId = typeof sub.items.data[0].price.product === 'string'
          ? sub.items.data[0].price.product
          : sub.items.data[0].price.product?.id || '';
        const slug = PRODUCT_TO_PLAN[prodId] || 'basic';
        const level = PLAN_HIERARCHY[slug] ?? 0;
        if (level > bestLevel) {
          bestLevel = level;
          bestPlanSlug = slug;
          bestSubscription = sub;
        }
      }

      // Cancel lower-tier duplicate subscriptions
      if (subscriptions.data.length > 1 && bestSubscription) {
        for (const sub of subscriptions.data) {
          if (sub.id !== bestSubscription.id) {
            try {
              await stripe.subscriptions.cancel(sub.id);
              logStep('Auto-cancelled duplicate lower-tier subscription', { id: sub.id });
            } catch (e) {
              logStep('Failed to cancel duplicate', { id: sub.id, error: String(e) });
            }
          }
        }
      }
    }

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
          downgrade_pending: !!existingDbSub.downgraded_to_free_at,
          downgrade_effective_date: existingDbSub.downgraded_to_free_at ? existingDbSub.current_period_end : null,
          downgrade_requested_at: existingDbSub.downgraded_to_free_at || null,
          downgrade_target_plan: existingDbSub.downgrade_target_plan || 'free',
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

    const subscription = bestSubscription!;
    const subscriptionEnd = safeTimestampToISO(subscription.current_period_end);
    const subscriptionStart = safeTimestampToISO(subscription.current_period_start);
    
    const priceItem = subscription.items.data[0];
    
    // Get product ID from price - product is always a string ID when not expanded
    const priceId = priceItem.price.id;
    const productId = typeof priceItem.price.product === 'string' 
      ? priceItem.price.product 
      : priceItem.price.product?.id || '';
    
    const planSlug = bestPlanSlug;
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

    if (existingSub) {
      // Compare billing period starts using epoch seconds
      // Treat as same period if difference is less than 24 hours (handles Stripe timestamp drift)
      const existingStartEpoch = Math.floor(new Date(existingSub.current_period_start).getTime() / 1000);
      const stripeStartEpoch = Math.floor(new Date(subscriptionStart).getTime() / 1000);
      const diffSeconds = Math.abs(stripeStartEpoch - existingStartEpoch);
      const ONE_DAY = 86400;
      
      if (diffSeconds < ONE_DAY) {
        // Same billing period, keep existing values (preserves boost deductions)
        monthlyBudgetRemaining = existingSub.monthly_budget_remaining_cents ?? 0;
        commissionFreeOffersRemaining = existingSub.commission_free_offers_remaining ?? 0;
        logStep('Same billing period, keeping existing budget values', { 
          monthlyBudgetRemaining, commissionFreeOffersRemaining, diffSeconds
        });
      } else {
        logStep('New billing period detected, resetting budgets', { 
          dbStart: existingSub.current_period_start, stripeStart: subscriptionStart,
          diffSeconds
        });
      }
    } else {
      logStep('No existing subscription record, using plan defaults');
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
      downgrade_requested_at: existingSub?.downgraded_to_free_at || null,
      downgrade_target_plan: existingSub?.downgrade_target_plan || 'free',
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
