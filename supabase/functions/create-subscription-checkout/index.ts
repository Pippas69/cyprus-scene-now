import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

// Price mapping for subscription plans (Basic/Pro/Elite)
// Monthly prices: Basic €59.99, Pro €119.99, Elite €239.99
// Annual prices: Monthly price × 12 (2 months free included in the per-month display)
const PRICE_MAPPING: Record<string, Record<string, string>> = {
  basic: {
    monthly: 'price_1SyYDBHwXCvHV7ZwWIPuJHzf',  // €59.99/month
    annual: 'price_1SyYDCHwXCvHV7ZwAw3fngIN',   // €599.88/year (€49.99/month)
  },
  pro: {
    monthly: 'price_1SyYDEHwXCvHV7ZwBy72motr',  // €119.99/month
    annual: 'price_1SyYDFHwXCvHV7ZwE1uQ0H1c',   // €1,199.88/year (€99.99/month)
  },
  elite: {
    monthly: 'price_1SyYDGHwXCvHV7Zwg9IDT9jt',  // €239.99/month
    annual: 'price_1SyYDHHwXCvHV7ZwDVK9HHIU',   // €2,399.88/year (€199.99/month)
  },
  // Legacy mappings for backwards compatibility
  starter: {
    monthly: 'price_1SyYDBHwXCvHV7ZwWIPuJHzf',
    annual: 'price_1SyYDCHwXCvHV7ZwAw3fngIN',
  },
  growth: {
    monthly: 'price_1SyYDEHwXCvHV7ZwBy72motr',
    annual: 'price_1SyYDFHwXCvHV7ZwE1uQ0H1c',
  },
  professional: {
    monthly: 'price_1SyYDGHwXCvHV7Zwg9IDT9jt',
    annual: 'price_1SyYDHHwXCvHV7ZwDVK9HHIU',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set');
    
    // Log safe key fingerprint for debugging
    const keyFingerprint = {
      prefix: stripeKey.substring(0, 7),
      suffix: stripeKey.slice(-4),
      length: stripeKey.length,
    };
    logStep('Stripe key fingerprint', keyFingerprint);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    logStep('Authorization header found');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated or email not available');
    logStep('User authenticated', { userId: user.id, email: user.email });

    // Get request body
    const rawBody = await req.json().catch(() => ({}));
    let { plan_slug, billing_cycle } = rawBody as { plan_slug?: unknown; billing_cycle?: unknown };

    // Normalize inputs defensively (prevents hidden whitespace / casing issues)
    const normalizedPlan = String(plan_slug ?? '').trim().toLowerCase();
    const normalizedCycle = String(billing_cycle ?? '').trim().toLowerCase();

    if (!normalizedPlan || !normalizedCycle) {
      throw new Error('Missing required fields: plan_slug and billing_cycle');
    }

    // Accept common aliases
    const cycle = normalizedCycle === 'yearly' ? 'annual' : normalizedCycle;

    logStep('Request validated', { plan_slug: normalizedPlan, billing_cycle: cycle });

    // Validate plan and billing cycle
    const planMapping = PRICE_MAPPING[normalizedPlan];
    const priceId = planMapping?.[cycle];

    if (!priceId) {
      logStep('Invalid plan/cycle received', {
        received: { plan_slug: normalizedPlan, billing_cycle: cycle },
        available_plans: Object.keys(PRICE_MAPPING),
        available_cycles_for_plan: planMapping ? Object.keys(planMapping) : null,
      });
      throw new Error(`Invalid plan or billing cycle: ${normalizedPlan} - ${cycle}`);
    }

    logStep('Price ID mapped', { priceId });

    // Get business ID for this user
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      throw new Error('No business found for this user');
    }
    logStep('Business found', { businessId: business.id });

    // Get plan details from database
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('id')
      .eq('slug', plan_slug)
      .single();

    if (planError || !plan) {
      throw new Error(`Plan not found: ${plan_slug}`);
    }
    logStep('Plan found in database', { planId: plan.id });

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep('Existing Stripe customer found', { customerId });
    } else {
      logStep('No existing customer, will create during checkout');
    }

    // Create checkout session
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard-business/subscription?subscription=success`,
      cancel_url: `${origin}/dashboard-business/subscription?subscription=canceled`,
      metadata: {
        business_id: business.id,
        plan_id: plan.id,
        user_id: user.id,
      },
    });

    logStep('Checkout session created', { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in create-subscription-checkout', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});