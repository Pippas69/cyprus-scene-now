import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PROFILE-BOOST-CHECKOUT] ${step}${detailsStr}`);
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

    const { businessId, tier, durationMode = "daily", startDate, endDate, durationHours, partialBudgetCents = 0, useSubscriptionBudget = false } = await req.json();
    logStep("Request data", { businessId, tier, durationMode, startDate, endDate, durationHours, partialBudgetCents, useSubscriptionBudget });

    // Verify user owns this business
    const { data: businessData, error: businessError } = await supabaseClient
      .from("businesses")
      .select("id, name, user_id")
      .eq("id", businessId)
      .single();

    if (businessError) throw businessError;
    if (businessData.user_id !== user.id) throw new Error("Not authorized");

    logStep("Business ownership verified", { businessId });

    // 2-tier boost system with hourly and daily rates (in cents)
    const boostTiers = {
      standard: { dailyRateCents: 4000, hourlyRateCents: 550, quality: 4 },   // €40/day, €5.50/hour
      premium: { dailyRateCents: 6000, hourlyRateCents: 850, quality: 5 },   // €60/day, €8.50/hour
    };

    const tierData = boostTiers[tier as keyof typeof boostTiers];
    if (!tierData) throw new Error("Invalid tier. Must be 'standard' or 'premium'");

    // Calculate total cost based on duration mode
    let totalCostCents: number;
    let durationDescription: string;
    let calculatedDurationHours: number | null = null;
    let days = 1;

    if (durationMode === "hourly") {
      if (!durationHours || durationHours < 1) {
        throw new Error("Duration hours is required for hourly mode");
      }
      calculatedDurationHours = durationHours;
      totalCostCents = tierData.hourlyRateCents * durationHours;
      durationDescription = `${durationHours} hour${durationHours > 1 ? 's' : ''}`;
      logStep("Hourly cost calculated", { durationHours, hourlyRateCents: tierData.hourlyRateCents, totalCostCents });
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      totalCostCents = tierData.dailyRateCents * days;
      durationDescription = `${days} day${days > 1 ? 's' : ''}`;
      logStep("Daily cost calculated", { days, dailyRateCents: tierData.dailyRateCents, totalCostCents });
    }

    // If using subscription budget, check and deduct from it
    if (useSubscriptionBudget) {
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

      // Determine initial status based on start date
      const now = new Date();
      const start = new Date(startDate);
      const status = start <= now ? "active" : "scheduled";

      // Create boost record
      const { data: createdBoost, error: boostError } = await supabaseClient
        .from("profile_boosts")
        .insert({
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

      // Deduct from budget
      const newBudget = remainingBudget - totalCostCents;
      const { error: budgetError } = await supabaseClient
        .from("business_subscriptions")
        .update({ monthly_budget_remaining_cents: newBudget })
        .eq("id", subscription.id);

      if (budgetError) {
        await supabaseClient.from("profile_boosts").delete().eq("id", createdBoost.id);
        throw budgetError;
      }

      logStep("Profile boost created from subscription budget", { totalCostCents, newBudget });

      return new Response(
        JSON.stringify({ success: true, source: "subscription" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Calculate amount to charge via Stripe (after partial budget deduction)
    const stripeChargeCents = Math.max(0, totalCostCents - partialBudgetCents);
    logStep("Stripe charge calculated", { totalCostCents, partialBudgetCents, stripeChargeCents });

    if (stripeChargeCents <= 0) {
      throw new Error("No payment needed - use subscription budget instead");
    }

    // Create boost record with pending status
    const { data: boostData, error: boostError } = await supabaseClient
      .from("profile_boosts")
      .insert({
        business_id: businessId,
        boost_tier: tier,
        start_date: startDate,
        end_date: endDate,
        daily_rate_cents: tierData.dailyRateCents,
        hourly_rate_cents: durationMode === "hourly" ? tierData.hourlyRateCents : null,
        duration_mode: durationMode,
        duration_hours: calculatedDurationHours,
        total_cost_cents: totalCostCents,
        source: "purchase",
        status: "pending",
        targeting_quality: tierData.quality,
      })
      .select()
      .single();

    if (boostError) throw boostError;
    
    const boostId = boostData.id;
    logStep("Boost record created with pending status", { boostId, durationMode });

    // Create Stripe checkout session
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Create checkout description showing partial budget usage if applicable
    const description = partialBudgetCents > 0 
      ? `${tier.toUpperCase()} tier profile boost for ${durationDescription} (€${partialBudgetCents/100} from budget)`
      : `${tier.toUpperCase()} tier profile boost for ${durationDescription}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: stripeChargeCents,
            product_data: {
              name: `Profile Boost: ${businessData.name}`,
              description,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard-business?boost=success`,
      cancel_url: `${origin}/dashboard-business?boost=canceled`,
      metadata: {
        type: "profile_boost",
        boost_id: boostId,
        business_id: businessId,
        tier,
        duration_mode: durationMode,
        duration_hours: calculatedDurationHours?.toString() || "",
        start_date: startDate,
        end_date: endDate,
        daily_rate_cents: tierData.dailyRateCents.toString(),
        days: days.toString(),
        total_cost_cents: totalCostCents.toString(),
        partial_budget_cents: partialBudgetCents.toString(),
        stripe_charge_cents: stripeChargeCents.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, boostId, stripeChargeCents, url: session.url });

    return new Response(
      JSON.stringify({ url: session.url, boostId }),
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
    }
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
