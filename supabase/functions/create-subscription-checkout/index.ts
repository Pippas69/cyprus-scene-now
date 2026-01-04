import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

// Price mapping for subscription plans (LIVE)
const PRICE_MAPPING: Record<string, Record<string, string>> = {
  starter: {
    monthly: 'price_1SlvtfHTQ1AOHDjnDcsxUMtQ',
    annual: 'price_1Slw7rHTQ1AOHDjnihgMkZmh',
  },
  growth: {
    monthly: 'price_1Slvw5HTQ1AOHDjnnCrH3wcW',
    annual: 'price_1Slw8WHTQ1AOHDjnE06GFJu2',
  },
  professional: {
    monthly: 'price_1SlvxaHTQ1AOHDjnmQviVoXk',
    annual: 'price_1Slw8zHTQ1AOHDjnFCOk69r6',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set');
    logStep('Stripe key verified');

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
    const { plan_slug, billing_cycle } = await req.json();
    if (!plan_slug || !billing_cycle) {
      throw new Error('Missing required fields: plan_slug and billing_cycle');
    }
    logStep('Request validated', { plan_slug, billing_cycle });

    // Validate plan and billing cycle
    if (!PRICE_MAPPING[plan_slug] || !PRICE_MAPPING[plan_slug][billing_cycle]) {
      throw new Error(`Invalid plan or billing cycle: ${plan_slug} - ${billing_cycle}`);
    }
    const priceId = PRICE_MAPPING[plan_slug][billing_cycle];
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
