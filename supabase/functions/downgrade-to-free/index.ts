import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DOWNGRADE] ${step}${detailsStr}`);
};

// Plan hierarchy for validation
const PLAN_HIERARCHY: Record<string, number> = { free: 0, basic: 1, pro: 2, elite: 3 };

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  elite: 'Elite',
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

    // Parse target plan from body (defaults to 'free')
    let targetPlan = 'free';
    try {
      const body = await req.json();
      if (body?.target_plan && typeof body.target_plan === 'string') {
        targetPlan = body.target_plan.toLowerCase();
      }
    } catch {
      // No body or invalid JSON, default to 'free'
    }

    if (!PLAN_HIERARCHY.hasOwnProperty(targetPlan)) {
      throw new Error(`Invalid target plan: ${targetPlan}`);
    }
    logStep('Target plan', { targetPlan });

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
      .select('*, subscription_plans(slug, name)')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .single();

    if (!subscription) throw new Error('No active subscription found');

    const currentPlanSlug = (subscription.subscription_plans as any)?.slug;
    const currentPlanLevel = PLAN_HIERARCHY[currentPlanSlug] ?? 0;
    const targetPlanLevel = PLAN_HIERARCHY[targetPlan];

    logStep('Plan levels', { currentPlan: currentPlanSlug, currentLevel: currentPlanLevel, targetPlan, targetLevel: targetPlanLevel });

    // Validate it's actually a downgrade
    if (targetPlanLevel >= currentPlanLevel) {
      throw new Error(`Cannot downgrade: ${currentPlanSlug} → ${targetPlan} is not a downgrade`);
    }

    // If already has a pending downgrade
    if (subscription.downgraded_to_free_at) {
      throw new Error('Already scheduled for downgrade');
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Get real period end from Stripe
    let effectiveDate = subscription.current_period_end;
    if (subscription.stripe_subscription_id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        effectiveDate = new Date(stripeSub.current_period_end * 1000).toISOString();

        // If target is free, cancel at period end
        if (targetPlan === 'free') {
          await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
          });
          logStep('Stripe subscription set to cancel at period end');
        }
        // For downgrades to paid plans (e.g. Elite→Pro), we schedule the change
        // The actual plan switch will happen via webhook or cron at period end

        // Update DB with real Stripe dates
        await supabaseClient
          .from('business_subscriptions')
          .update({
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: effectiveDate,
          })
          .eq('id', subscription.id);
      } catch (stripeErr) {
        logStep('Warning: Could not retrieve Stripe subscription, using DB dates', { error: String(stripeErr) });
      }
    }

    // Mark downgrade in our database
    const { error: updateError } = await supabaseClient
      .from('business_subscriptions')
      .update({
        downgraded_to_free_at: new Date().toISOString(),
        downgrade_target_plan: targetPlan,
      })
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    // Log plan history
    await supabaseClient.from('business_subscription_plan_history').insert({
      business_id: business.id,
      plan_slug: targetPlan,
      source: 'downgrade_scheduled',
      valid_from: effectiveDate,
    });

    logStep('Downgrade scheduled successfully', {
      currentPlan: currentPlanSlug,
      targetPlan,
      effectiveDate,
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Downgrade scheduled',
      effective_date: effectiveDate,
      current_plan: currentPlanSlug,
      target_plan: targetPlan,
      target_plan_name: PLAN_NAMES[targetPlan] || targetPlan,
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
