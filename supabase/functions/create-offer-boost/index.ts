import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-OFFER-BOOST] ${step}${detailsStr}`);
};

// 2-tier boost system with hourly and daily rates (in cents)
// targeting_quality is stored on a 1-5 scale in the database
const BOOST_TIERS = {
  standard: { dailyRateCents: 4000, hourlyRateCents: 550, quality: 4 }, // €40/day, €5.50/hour
  premium: { dailyRateCents: 6000, hourlyRateCents: 850, quality: 5 },  // €60/day, €8.50/hour
};

// Consume frozen time from paused boosts (FIFO - oldest first)
async function consumeFrozenTime(client: any, businessId: string, hoursToConsume: number, daysToConsume: number) {
  const tables = ["event_boosts", "offer_boosts"] as const;
  let remainingHours = hoursToConsume;
  let remainingDays = daysToConsume;

  for (const table of tables) {
    if (remainingHours <= 0 && remainingDays <= 0) break;
    const { data: pausedBoosts } = await client
      .from(table)
      .select("id, frozen_hours, frozen_days")
      .eq("business_id", businessId)
      .eq("status", "paused")
      .order("created_at", { ascending: true });

    for (const boost of (pausedBoosts || [])) {
      if (remainingHours <= 0 && remainingDays <= 0) break;
      const updates: any = {};
      if (remainingHours > 0 && (boost.frozen_hours || 0) > 0) {
        const consume = Math.min(remainingHours, boost.frozen_hours);
        updates.frozen_hours = boost.frozen_hours - consume;
        remainingHours -= consume;
      }
      if (remainingDays > 0 && (boost.frozen_days || 0) > 0) {
        const consume = Math.min(remainingDays, boost.frozen_days);
        updates.frozen_days = boost.frozen_days - consume;
        remainingDays -= consume;
      }
      if (Object.keys(updates).length > 0) {
        await client.from(table).update(updates).eq("id", boost.id);
      }
    }
  }
}

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

    const { discountId, tier, durationMode = "daily", startDate, endDate, durationHours, useSubscriptionBudget, useFrozenTime = false, frozenHoursUsed = 0, frozenDaysUsed = 0 } = await req.json();
    logStep("Request data", { discountId, tier, durationMode, startDate, endDate, durationHours, useSubscriptionBudget, useFrozenTime, frozenHoursUsed, frozenDaysUsed });

    // Validate tier
    if (!tier || !BOOST_TIERS[tier as keyof typeof BOOST_TIERS]) {
      throw new Error("Invalid boost tier");
    }

    const tierData = BOOST_TIERS[tier as keyof typeof BOOST_TIERS];

    // Get discount and verify ownership
    const { data: discountData, error: discountError } = await supabaseClient
      .from("discounts")
      .select("business_id")
      .eq("id", discountId)
      .single();

    if (discountError) throw discountError;
    const businessId = discountData.business_id;

    // Verify user owns this business
    const { data: businessData, error: businessError } = await supabaseClient
      .from("businesses")
      .select("user_id")
      .eq("id", businessId)
      .single();

    if (businessError) throw businessError;
    if (businessData.user_id !== user.id) throw new Error("Not authorized");

    logStep("Business ownership verified", { businessId });

    // Calculate duration and cost based on mode
    let totalCostCents: number;
    let calculatedDurationHours: number | null = null;

    if (durationMode === "hourly") {
      if (!durationHours || durationHours < 1) {
        throw new Error("Duration hours is required for hourly mode");
      }
      calculatedDurationHours = durationHours;
      totalCostCents = tierData.hourlyRateCents * (useFrozenTime ? Math.max(0, durationHours - frozenHoursUsed) : durationHours);
      logStep("Hourly cost calculated", { durationHours, frozenHoursUsed, totalCostCents });
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      totalCostCents = tierData.dailyRateCents * (useFrozenTime ? Math.max(0, days - frozenDaysUsed) : days);
      logStep("Daily cost calculated", { days, frozenDaysUsed, totalCostCents });
    }

    // If not using subscription budget, return that payment is needed
    if (!useSubscriptionBudget) {
      return new Response(
        JSON.stringify({
          needsPayment: true,
          totalCostCents,
          tier,
          durationMode,
          durationHours: calculatedDurationHours,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check subscription budget
    const { data: subscription, error: subError } = await supabaseClient
      .from("business_subscriptions")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "active")
      .single();

    if (subError || !subscription) {
      // No active subscription/budget -> fallback to Stripe
      return new Response(
        JSON.stringify({
          needsPayment: true,
          totalCostCents,
          tier,
          durationMode,
          durationHours: calculatedDurationHours,
          reason: "no_active_subscription",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const remainingBudget = subscription.monthly_budget_remaining_cents || 0;

    // Determine initial status based on start date
    const now = new Date();
    const start = new Date(startDate);
    const status = start <= now ? "active" : "scheduled";

    // If there's already an active boost for this offer, UPDATE it instead of creating a second active record
    const { data: existingActive } = await supabaseClient
      .from("offer_boosts")
      .select("id,total_cost_cents")
      .eq("discount_id", discountId)
      .eq("active", true)
      .maybeSingle();

    const existingCost = Number(existingActive?.total_cost_cents ?? 0);
    const deltaCents = totalCostCents - existingCost;

    // If delta is positive, ensure we have enough budget for the incremental difference
    if (deltaCents > 0 && remainingBudget < deltaCents) {
      return new Response(
        JSON.stringify({
          needsPayment: true,
          totalCostCents: deltaCents,
          tier,
          durationMode,
          durationHours: calculatedDurationHours,
          remainingBudgetCents: remainingBudget,
          reason: "insufficient_budget",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (existingActive?.id) {
      // Update existing boost
      const { error: updateBoostError } = await supabaseClient
        .from("offer_boosts")
        .update({
          boost_tier: tier,
          targeting_quality: tierData.quality,
          daily_rate_cents: tierData.dailyRateCents,
          hourly_rate_cents: durationMode === "hourly" ? tierData.hourlyRateCents : null,
          duration_mode: durationMode,
          duration_hours: calculatedDurationHours,
          total_cost_cents: totalCostCents,
          start_date: startDate,
          end_date: endDate,
          status,
          source: "subscription",
          commission_percent: 0,
          active: status === "active",
        })
        .eq("id", existingActive.id);

      if (updateBoostError) throw updateBoostError;

      // Apply budget delta (can be negative => refund)
      const newBudget = remainingBudget - deltaCents;
      const { error: budgetError } = await supabaseClient
        .from("business_subscriptions")
        .update({ monthly_budget_remaining_cents: newBudget })
        .eq("id", subscription.id);

      if (budgetError) throw budgetError;

      logStep("Existing offer boost updated", { existingId: existingActive.id, existingCost, newCost: totalCostCents, deltaCents, newBudget });
    } else {
      // Create new boost record FIRST
      const { data: createdBoost, error: boostError } = await supabaseClient
        .from("offer_boosts")
        .insert({
          discount_id: discountId,
          business_id: businessId,
          boost_tier: tier,
          targeting_quality: tierData.quality,
          daily_rate_cents: tierData.dailyRateCents,
          hourly_rate_cents: durationMode === "hourly" ? tierData.hourlyRateCents : null,
          duration_mode: durationMode,
          duration_hours: calculatedDurationHours,
          total_cost_cents: totalCostCents,
          start_date: startDate,
          end_date: endDate,
          status,
          source: "subscription",
          commission_percent: 0,
          active: status === "active",
        })
        .select("id")
        .single();

      if (boostError) throw boostError;

      // Deduct from subscription budget AFTER successful boost creation
      const newBudget = remainingBudget - totalCostCents;
      const { error: budgetError } = await supabaseClient
        .from("business_subscriptions")
        .update({ monthly_budget_remaining_cents: newBudget })
        .eq("id", subscription.id);

      if (budgetError) {
        // Best-effort rollback to avoid a created boost without budget deduction
        await supabaseClient.from("offer_boosts").delete().eq("id", createdBoost.id);
        throw budgetError;
      }

      logStep("Budget deducted", { previousBudget: remainingBudget, deducted: totalCostCents, newBudget });
    }

    logStep("Offer boost created", { tier, targetingQuality: tierData.quality, status, durationMode });

    return new Response(
      JSON.stringify({
        success: true,
        tier,
        targeting_quality: tierData.quality,
        total_cost_cents: totalCostCents,
        duration_mode: durationMode,
        status,
        message: "Offer boost activated",
      }),
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
    logStep("ERROR", { message: errorMessage, raw: error });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
