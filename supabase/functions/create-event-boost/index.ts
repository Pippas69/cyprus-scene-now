import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-EVENT-BOOST] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { eventId, tier, durationMode = "daily", startDate, endDate, durationHours, useSubscriptionBudget, useFrozenTime = false, frozenHoursUsed = 0, frozenDaysUsed = 0 } = await req.json();
    logStep("Request data", { eventId, tier, durationMode, startDate, endDate, durationHours, useSubscriptionBudget, useFrozenTime, frozenHoursUsed, frozenDaysUsed });

    // Get business ID for this event
    const { data: eventData, error: eventError } = await supabaseClient
      .from("events")
      .select("business_id")
      .eq("id", eventId)
      .single();

    if (eventError) throw eventError;
    const businessId = eventData.business_id;

    // Verify user owns this business
    const { data: businessData, error: businessError } = await supabaseClient
      .from("businesses")
      .select("user_id")
      .eq("id", businessId)
      .single();

    if (businessError) throw businessError;
    if (businessData.user_id !== user.id) throw new Error("Not authorized");

    logStep("Business ownership verified", { businessId });

    // 2-tier boost system with hourly and daily rates (in cents)
    const boostTiers = {
      standard: { dailyRateCents: 4000, hourlyRateCents: 550, quality: 4 },
      premium: { dailyRateCents: 6000, hourlyRateCents: 850, quality: 5 },
    };

    const tierData = boostTiers[tier as keyof typeof boostTiers];
    if (!tierData) throw new Error("Invalid tier. Must be 'standard' or 'premium'");

    // Calculate total cost based on duration mode
    let totalCostCents: number;
    let calculatedDurationHours: number | null = null;

    if (durationMode === "hourly") {
      if (!durationHours || durationHours < 1) {
        throw new Error("Duration hours is required for hourly mode");
      }
      calculatedDurationHours = durationHours;
      const effectiveHours = useFrozenTime ? Math.max(0, durationHours - frozenHoursUsed) : durationHours;
      totalCostCents = tierData.hourlyRateCents * effectiveHours;
      logStep("Hourly cost calculated", { durationHours, effectiveHours, frozenHoursUsed, totalCostCents });
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const effectiveDays = useFrozenTime ? Math.max(0, days - frozenDaysUsed) : days;
      totalCostCents = tierData.dailyRateCents * effectiveDays;
      logStep("Daily cost calculated", { days, effectiveDays, frozenDaysUsed, totalCostCents });
    }

    // ONLY handle subscription budget payments here
    // For Stripe payments, the frontend calls create-boost-checkout directly
    if (!useSubscriptionBudget) {
      logStep("Non-subscription boost - returning needsPayment flag");
      return new Response(
        JSON.stringify({ 
          needsPayment: true, 
          totalCostCents,
          durationMode,
          durationHours: calculatedDurationHours,
          tier 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check subscription and budget
    const { data: subscription, error: subError } = await supabaseClient
      .from("business_subscriptions")
      .select("id, monthly_budget_remaining_cents, status")
      .eq("business_id", businessId)
      .single();

    const remainingBudget = subscription?.monthly_budget_remaining_cents || 0;
    const hasActiveSubscription = !subError && !!subscription && subscription.status === "active";

    // If user wants to use budget but there's no active subscription/budget, instruct frontend to fallback to Stripe
    if (!hasActiveSubscription) {
      logStep("No active subscription - returning needsPayment flag");
      return new Response(
        JSON.stringify({
          needsPayment: true,
          totalCostCents,
          durationMode,
          durationHours: calculatedDurationHours,
          tier,
          reason: "no_active_subscription",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (remainingBudget < totalCostCents) {
      logStep("Insufficient subscription budget - returning needsPayment flag", { remainingBudget, totalCostCents });
      return new Response(
        JSON.stringify({
          needsPayment: true,
          totalCostCents,
          durationMode,
          durationHours: calculatedDurationHours,
          tier,
          reason: "insufficient_budget",
          remainingBudgetCents: remainingBudget,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Determine initial status based on start date
    const now = new Date();
    const start = new Date(startDate);
    const status = start <= now ? "active" : "scheduled";

    // Create boost record FIRST (so we never deduct budget on a failed boost)
    const { data: createdBoost, error: boostError } = await supabaseClient
      .from("event_boosts")
      .insert({
        event_id: eventId,
        business_id: businessId,
        boost_tier: tier,
        start_date: startDate,
        end_date: endDate,
        daily_rate_cents: tierData.dailyRateCents,
        hourly_rate_cents: durationMode === "hourly" ? tierData.hourlyRateCents : null,
        duration_mode: durationMode,
        duration_hours: calculatedDurationHours,
        total_cost_cents: totalCostCents,
        source: "subscription",
        status,
        targeting_quality: tierData.quality,
      })
      .select("id")
      .single();

    if (boostError) throw boostError;

    // Deduct from budget AFTER successful boost creation
    const newBudget = remainingBudget - totalCostCents;
    const { error: updateError } = await supabaseClient
      .from("business_subscriptions")
      .update({ monthly_budget_remaining_cents: newBudget })
      .eq("id", subscription.id);

    if (updateError) {
      // Best-effort rollback to avoid a created boost without budget deduction
      await supabaseClient.from("event_boosts").delete().eq("id", createdBoost.id);
      throw updateError;
    }

    logStep("Boost created from subscription budget", { durationMode, totalCostCents, newBudget });

    // Consume frozen time from paused boosts if opted in
    if (useFrozenTime && (frozenHoursUsed > 0 || frozenDaysUsed > 0)) {
      await consumeFrozenTime(supabaseClient, businessId, frozenHoursUsed, frozenDaysUsed);
      logStep("Frozen time consumed", { frozenHoursUsed, frozenDaysUsed });
    }

    return new Response(
      JSON.stringify({ success: true, source: "subscription", durationMode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = "Unserializable error";
      }
    }
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
