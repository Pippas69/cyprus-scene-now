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

    const { eventId, tier, durationMode = "daily", startDate, endDate, durationHours, useSubscriptionBudget } = await req.json();
    logStep("Request data", { eventId, tier, durationMode, startDate, endDate, durationHours, useSubscriptionBudget });

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
    // targeting_quality is stored on a 1-5 scale in the database
    const boostTiers = {
      standard: { dailyRateCents: 4000, hourlyRateCents: 550, quality: 4 },  // €40/day, €5.50/hour
      premium: { dailyRateCents: 6000, hourlyRateCents: 850, quality: 5 },   // €60/day, €8.50/hour
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
      totalCostCents = tierData.hourlyRateCents * durationHours;
      logStep("Hourly cost calculated", { durationHours, hourlyRateCents: tierData.hourlyRateCents, totalCostCents });
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      totalCostCents = tierData.dailyRateCents * days;
      logStep("Daily cost calculated", { days, dailyRateCents: tierData.dailyRateCents, totalCostCents });
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

    // Deduct from budget
    const { error: updateError } = await supabaseClient
      .from("business_subscriptions")
      .update({
        monthly_budget_remaining_cents: remainingBudget - totalCostCents,
      })
      .eq("id", subscription.id);

    if (updateError) throw updateError;

    // Determine initial status based on start date
    const now = new Date();
    const start = new Date(startDate);
    const status = start <= now ? "active" : "scheduled";

    // Create boost record
    const { error: boostError } = await supabaseClient
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
      });

    if (boostError) throw boostError;

    logStep("Boost created from subscription budget", { durationMode, totalCostCents });

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
