import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BOOST-CHECKOUT] ${step}${detailsStr}`);
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

    const { eventId, tier, startDate, endDate } = await req.json();
    logStep("Request data", { eventId, tier, startDate, endDate });

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

    // Define boost tiers (daily rate in cents)
    const boostTiers: Record<string, number> = {
      basic: 1500, // €15/day
      standard: 5000, // €50/day
      premium: 15000, // €150/day
      elite: 40000, // €400/day
    };

    const dailyRateCents = boostTiers[tier];
    if (!dailyRateCents) throw new Error("Invalid tier");

    // Calculate total cost (minimum 1 day)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1); // Include both start and end day
    const totalCostCents = dailyRateCents * days;

    logStep("Cost calculated", { days, dailyRateCents, totalCostCents });

    // Create boost record FIRST with pending status
    const { data: boostData, error: boostError } = await supabaseClient
      .from("event_boosts")
      .insert({
        event_id: eventId,
        business_id: businessId,
        boost_tier: tier,
        start_date: startDate,
        end_date: endDate,
        daily_rate_cents: dailyRateCents,
        total_cost_cents: totalCostCents,
        source: "purchase",
        status: "scheduled",
        targeting_quality: tier === "elite" ? 5 : tier === "premium" ? 4 : tier === "standard" ? 3 : 2,
      })
      .select()
      .single();

    if (boostError) throw boostError;
    
    const boostId = boostData.id;
    logStep("Boost record created with pending status", { boostId });

    // Create Stripe checkout session
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: totalCostCents,
            product_data: {
              name: `Event Boost: ${eventData.title}`,
              description: `${tier.toUpperCase()} tier boost for ${days} day${days > 1 ? 's' : ''}`,
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
        boost_id: boostId, // Critical: This is used by webhook to find the boost
        event_id: eventId,
        business_id: businessId,
        tier,
        start_date: startDate,
        end_date: endDate,
        daily_rate_cents: dailyRateCents.toString(),
        days: days.toString(),
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
