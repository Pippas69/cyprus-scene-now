import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BOOST-CHECKOUT] ${step}${detailsStr}`);
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

    const { eventId, tier, durationMode = "daily", startDate, endDate, durationHours, partialBudgetCents = 0 } = await req.json();
    logStep("Request data", { eventId, tier, durationMode, startDate, endDate, durationHours, partialBudgetCents });

    // Get business ID for this event
    const { data: eventData, error: eventError } = await supabaseClient
      .from("events")
      .select("business_id, title")
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
    // targeting_quality must be stored on a 1-5 integer scale in the database
    const boostTiers = {
      standard: { dailyRateCents: 4000, hourlyRateCents: 550, quality: 4 },  // €40/day, €5.50/hour
      premium: { dailyRateCents: 6000, hourlyRateCents: 850, quality: 5 },     // €60/day, €8.50/hour
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
      days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1); // Include both start and end day
      totalCostCents = tierData.dailyRateCents * days;
      durationDescription = `${days} day${days > 1 ? 's' : ''}`;
      logStep("Daily cost calculated", { days, dailyRateCents: tierData.dailyRateCents, totalCostCents });
    }

    // Calculate amount to charge via Stripe (after partial budget deduction)
    const stripeChargeCents = Math.max(0, totalCostCents - partialBudgetCents);
    logStep("Stripe charge calculated", { totalCostCents, partialBudgetCents, stripeChargeCents });

    if (stripeChargeCents <= 0) {
      throw new Error("No payment needed - use subscription budget instead");
    }

    // Determine initial status based on start date
    const now = new Date();
    const boostStart = new Date(startDate);
    const initialStatus = boostStart <= now ? "active" : "scheduled";

    // Create boost record with active status (payment is about to happen)
    const { data: boostData, error: boostError } = await supabaseClient
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
        source: "purchase",
        status: initialStatus,
        targeting_quality: tierData.quality,
      })
      .select()
      .single();

    if (boostError) throw boostError;
    
    const boostId = boostData.id;
    logStep("Boost record created", { boostId, status: initialStatus, durationMode });

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
      ? `${tier.toUpperCase()} tier boost for ${durationDescription} (€${partialBudgetCents/100} from budget)`
      : `${tier.toUpperCase()} tier boost for ${durationDescription}`;

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
              name: `Event Boost: ${eventData.title}`,
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
        type: "event_boost",
        boost_id: boostId,
        event_id: eventId,
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

    logStep("Checkout session created", { sessionId: session.id, boostId, url: session.url });

    return new Response(
      JSON.stringify({ url: session.url, boostId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    // Handle different error types properly
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
        errorMessage = String(error);
      }
    }
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
