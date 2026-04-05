import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
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

// Price mapping for subscription plans (Basic/Pro/Elite)
const PRICE_MAPPING: Record<string, Record<string, string>> = {
  basic: {
    monthly: 'price_1SpwozHTQ1AOHDjnVuRc9Qna',
    annual: 'price_1Spwp1HTQ1AOHDjnQx155dfC',
  },
  pro: {
    monthly: 'price_1Spwp2HTQ1AOHDjnrxToaDoC',
    annual: 'price_1Spwp3HTQ1AOHDjnq9F1BnZh',
  },
  elite: {
    monthly: 'price_1Spwp5HTQ1AOHDjn8NpaDDj6',
    annual: 'price_1Spwp6HTQ1AOHDjn7yqgzaPN',
  },
  // Legacy mappings -> mapped to current live prices
  starter: {
    monthly: 'price_1SpwozHTQ1AOHDjnVuRc9Qna',
    annual: 'price_1Spwp1HTQ1AOHDjnQx155dfC',
  },
  growth: {
    monthly: 'price_1Spwp2HTQ1AOHDjnrxToaDoC',
    annual: 'price_1Spwp3HTQ1AOHDjnq9F1BnZh',
  },
  professional: {
    monthly: 'price_1Spwp5HTQ1AOHDjn8NpaDDj6',
    annual: 'price_1Spwp6HTQ1AOHDjn7yqgzaPN',
  },
};

// Plan hierarchy for determining upgrade vs downgrade
const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  basic: 1,
  starter: 1,
  pro: 2,
  growth: 2,
  elite: 3,
  professional: 3,
};

// Product ID to plan slug mapping
const PRODUCT_TO_PLAN: Record<string, string> = {
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

const BodySchema = z.object({
  plan_slug: safeString(50),
  billing_cycle: safeString(20),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: securityHeaders });
  }

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitId = (req.headers.get("Authorization") || clientIP).substring(0, 40) + ":" + clientIP;
    const rateCheck = await checkRateLimit(rateLimitId, "create_subscription_checkout", 10, 5);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    logStep('Function started');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated or email not available');
    logStep('User authenticated', { userId: user.id, email: user.email });

    const rawBody = await parseBody(req, BodySchema);
    let { plan_slug, billing_cycle } = rawBody as { plan_slug?: unknown; billing_cycle?: unknown };

    const normalizedPlan = String(plan_slug ?? '').trim().toLowerCase();
    const normalizedCycle = String(billing_cycle ?? '').trim().toLowerCase();

    if (!normalizedPlan || !normalizedCycle) {
      throw new Error('Missing required fields: plan_slug and billing_cycle');
    }

    const cycle = normalizedCycle === 'yearly' ? 'annual' : normalizedCycle;
    logStep('Request validated', { plan_slug: normalizedPlan, billing_cycle: cycle });

    const planMapping = PRICE_MAPPING[normalizedPlan];
    const priceId = planMapping?.[cycle];

    if (!priceId) {
      throw new Error(`Invalid plan or billing cycle: ${normalizedPlan} - ${cycle}`);
    }
    logStep('Price ID mapped', { priceId });

    // Get business ID
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) throw new Error('No business found for this user');
    logStep('Business found', { businessId: business.id });

    // Get plan details from database
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('id, event_boost_budget_cents, commission_free_offers_count')
      .eq('slug', normalizedPlan)
      .single();

    if (planError || !plan) throw new Error(`Plan not found: ${normalizedPlan}`);
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

    // Create checkout session (new subscription or non-upgrade scenario)
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
      headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in create-subscription-checkout', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
