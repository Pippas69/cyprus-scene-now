import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-OFFER-BOOST] ${step}${detailsStr}`);
};

// 2-tier boost system with hourly and daily rates
const BOOST_TIERS = {
  standard: { dailyRateCents: 4000, hourlyRateCents: 550, quality: 70 },  // €40/day, €5.50/hour
  premium: { dailyRateCents: 6000, hourlyRateCents: 850, quality: 100 },  // €60/day, €8.50/hour
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

    const { discountId, tier, durationMode = "daily", startDate, endDate, durationHours, useSubscriptionBudget } = await req.json();
    logStep("Request data", { discountId, tier, durationMode, startDate, endDate, durationHours, useSubscriptionBudget });

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
      totalCostCents = tierData.hourlyRateCents * durationHours;
      logStep("Hourly cost calculated", { durationHours, hourlyRateCents: tierData.hourlyRateCents, totalCostCents });
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      totalCostCents = tierData.dailyRateCents * days;
      logStep("Daily cost calculated", { days, dailyRateCents: tierData.dailyRateCents, totalCostCents });
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
      throw new Error("No active subscription found");
    }

    const remainingBudget = subscription.monthly_budget_remaining_cents || 0;
    if (remainingBudget < totalCostCents) {
      throw new Error("Insufficient subscription budget");
    }

    // Deduct from subscription budget
    const { error: updateError } = await supabaseClient
      .from("business_subscriptions")
      .update({
        monthly_budget_remaining_cents: remainingBudget - totalCostCents,
      })
      .eq("id", subscription.id);

    if (updateError) throw updateError;

    logStep("Budget deducted", { 
      previousBudget: remainingBudget, 
      deducted: totalCostCents, 
      newBudget: remainingBudget - totalCostCents 
    });

    // Determine initial status based on start date
    const now = new Date();
    const start = new Date(startDate);
    const status = start <= now ? "active" : "scheduled";

    // Create offer boost record
    const { error: boostError } = await supabaseClient
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
        commission_percent: 0, // Not used anymore, kept for backward compatibility
        active: status === "active",
      });

    if (boostError) throw boostError;

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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
