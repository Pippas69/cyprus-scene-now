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

// Safe timestamp to ISO helper
const safeTimestampToISO = (val: any): string => {
  if (!val) return new Date().toISOString();
  if (typeof val === 'number') return new Date(val * 1000).toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
};

// Plan hierarchy for validation
const PLAN_HIERARCHY: Record<string, number> = { free: 0, basic: 1, pro: 2, elite: 3 };

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  elite: 'Elite',
};

// Monthly price IDs for each paid plan (used for subscription schedule)
const MONTHLY_PRICE_IDS: Record<string, string> = {
  basic: 'price_1SyYDBHwXCvHV7ZwWIPuJHzf',
  pro: 'price_1SyYDEHwXCvHV7ZwBy72motr',
  elite: 'price_1SyYDGHwXCvHV7Zwg9IDT9jt',
};

const ANNUAL_PRICE_IDS: Record<string, string> = {
  basic: 'price_1SyYDCHwXCvHV7ZwAw3fngIN',
  pro: 'price_1SyYDFHwXCvHV7ZwE1uQ0H1c',
  elite: 'price_1SyYDHHwXCvHV7ZwDVK9HHIU',
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
        
        // In Stripe API 2025-08-27.basil, current_period_end/start moved to items level
        const subItem = stripeSub.items?.data?.[0];
        const periodEnd = (subItem as any)?.current_period_end;
        const periodStart = (subItem as any)?.current_period_start;
        
        logStep('Stripe sub period', { periodEnd, periodStart, status: stripeSub.status });
        
        effectiveDate = safeTimestampToISO(periodEnd);
        
        if (targetPlan === 'free') {
          // ===== DOWNGRADE TO FREE: Cancel at period end =====
          await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
          });
          logStep('Stripe subscription set to cancel at period end');
        } else {
          // ===== DOWNGRADE TO PAID PLAN: Schedule price change at period end =====
          const currentPriceId = subItem?.price?.id;
          const currentInterval = subItem?.price?.recurring?.interval;
          const isAnnual = currentInterval === 'year';
          
          const targetPriceId = isAnnual
            ? ANNUAL_PRICE_IDS[targetPlan]
            : MONTHLY_PRICE_IDS[targetPlan];

          if (!targetPriceId) {
            throw new Error(`No price ID found for target plan: ${targetPlan}`);
          }

          logStep('Scheduling plan change', { currentPriceId, targetPriceId, isAnnual, periodEnd });

          // Release any existing schedule first
          const existingSchedules = await stripe.subscriptionSchedules.list({
            customer: stripeSub.customer as string,
            limit: 5,
          });
          
          for (const sched of existingSchedules.data) {
            if (sched.status === 'active' || sched.status === 'not_started') {
              try {
                await stripe.subscriptionSchedules.release(sched.id);
                logStep('Released existing schedule', { scheduleId: sched.id });
              } catch (e) {
                logStep('Could not release schedule', { scheduleId: sched.id, error: String(e) });
              }
            }
          }

          // Create a subscription schedule from the existing subscription
          const schedule = await stripe.subscriptionSchedules.create({
            from_subscription: subscription.stripe_subscription_id,
          });

          logStep('Created schedule from subscription', { scheduleId: schedule.id });

          const currentPhase = schedule.phases[0];
          if (!currentPhase) {
            throw new Error('No current phase found in subscription schedule');
          }
          
          const currentPhaseStart = currentPhase.start_date;
          // Use the item-level period end as the phase boundary
          const currentPhaseEnd = periodEnd;
          
          // Extract price ID string
          const currentItemPrice = currentPhase.items[0]?.price;
          const currentPriceStr = typeof currentItemPrice === 'string' 
            ? currentItemPrice 
            : (currentItemPrice as any)?.id || currentPriceId;

          logStep('Schedule phases', { currentPhaseStart, currentPhaseEnd, currentPriceStr, targetPriceId });

          await stripe.subscriptionSchedules.update(schedule.id, {
            end_behavior: 'release',
            phases: [
              {
                start_date: currentPhaseStart,
                end_date: currentPhaseEnd,
                items: [{ price: currentPriceStr }],
                proration_behavior: 'none',
              },
              {
                start_date: currentPhaseEnd,
                items: [{ price: targetPriceId }],
                iterations: 1,
                proration_behavior: 'none',
              },
            ],
          });

          logStep('Downgrade scheduled in Stripe', { scheduleId: schedule.id, effectiveAt: safeTimestampToISO(currentPhaseEnd) });
        }

        // Update DB with real Stripe dates
        await supabaseClient
          .from('business_subscriptions')
          .update({
            current_period_start: safeTimestampToISO(periodStart),
            current_period_end: effectiveDate,
          })
          .eq('id', subscription.id);
      } catch (stripeErr) {
        logStep('Stripe error during downgrade', { error: String(stripeErr) });
        throw new Error(`Stripe error: ${stripeErr instanceof Error ? stripeErr.message : String(stripeErr)}`);
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
