import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-EVENT-BOOST] ${step}${detailsStr}`);
};

serve(async (req) => {
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

    const { eventId, tier, startDate, endDate, useSubscriptionBudget } = await req.json();
    logStep("Request data", { eventId, tier, startDate, endDate, useSubscriptionBudget });

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

    // 2-tier boost system (daily rate in cents)
    const boostTiers = {
      standard: 3000, // €30/day
      premium: 8000,  // €80/day
    };

    const dailyRateCents = boostTiers[tier as keyof typeof boostTiers];
    if (!dailyRateCents) throw new Error("Invalid tier. Must be 'standard' or 'premium'");

    // Calculate total cost
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalCostCents = dailyRateCents * days;

    logStep("Cost calculated", { days, dailyRateCents, totalCostCents });

    // ONLY handle subscription budget payments here
    // For Stripe payments, the frontend calls create-boost-checkout directly
    if (!useSubscriptionBudget) {
      logStep("Non-subscription boost - returning needsPayment flag");
      return new Response(
        JSON.stringify({ 
          needsPayment: true, 
          totalCostCents,
          days,
          tier 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check subscription and budget
    const { data: subscription, error: subError } = await supabaseClient
      .from("business_subscriptions")
      .select("monthly_budget_remaining_cents, status")
      .eq("business_id", businessId)
      .single();

    if (subError || !subscription || subscription.status !== "active") {
      throw new Error("No active subscription found");
    }

    if ((subscription.monthly_budget_remaining_cents || 0) < totalCostCents) {
      throw new Error("Insufficient budget. Please add more or choose a shorter duration.");
    }

    // Deduct from budget
    const { error: updateError } = await supabaseClient
      .from("business_subscriptions")
      .update({
        monthly_budget_remaining_cents: (subscription.monthly_budget_remaining_cents || 0) - totalCostCents,
      })
      .eq("business_id", businessId);

    if (updateError) throw updateError;

    // Create boost record
    const { error: boostError } = await supabaseClient
      .from("event_boosts")
      .insert({
        event_id: eventId,
        business_id: businessId,
        boost_tier: tier,
        start_date: startDate,
        end_date: endDate,
        daily_rate_cents: dailyRateCents,
        total_cost_cents: totalCostCents,
        source: "subscription_budget",
        status: "scheduled",
        targeting_quality: tier === "premium" ? 5 : 3.5,
      });

    if (boostError) throw boostError;

    logStep("Boost created from subscription budget");

    return new Response(
      JSON.stringify({ success: true, source: "subscription" }),
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
