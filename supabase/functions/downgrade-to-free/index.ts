import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DOWNGRADE-TO-FREE] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated');
    logStep('User authenticated', { userId: user.id });

    // Get business
    const { data: business } = await supabaseClient
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!business) throw new Error('No business found');

    // Get current subscription
    const { data: subscription } = await supabaseClient
      .from('business_subscriptions')
      .select('*, subscription_plans(slug)')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .single();

    if (!subscription) throw new Error('No active subscription found');

    const planSlug = (subscription.subscription_plans as any)?.slug;
    if (planSlug === 'free') throw new Error('Already on free plan');

    // If already marked for downgrade
    if (subscription.downgraded_to_free_at) {
      throw new Error('Already scheduled for downgrade');
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Cancel Stripe subscription at period end (user keeps benefits until end)
    if (subscription.stripe_subscription_id) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      logStep('Stripe subscription set to cancel at period end', {
        stripeSubId: subscription.stripe_subscription_id,
        periodEnd: subscription.current_period_end,
      });
    }

    // Mark downgrade in our database
    const { error: updateError } = await supabaseClient
      .from('business_subscriptions')
      .update({
        downgraded_to_free_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    // Log plan history
    await supabaseClient.from('business_subscription_plan_history').insert({
      business_id: business.id,
      plan_slug: 'free',
      source: 'downgrade_scheduled',
      valid_from: subscription.current_period_end, // takes effect at period end
    });

    logStep('Downgrade scheduled successfully', {
      currentPlan: planSlug,
      effectiveDate: subscription.current_period_end,
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Downgrade scheduled',
      effective_date: subscription.current_period_end,
      current_plan: planSlug,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
