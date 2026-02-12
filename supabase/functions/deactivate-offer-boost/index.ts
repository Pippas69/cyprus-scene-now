import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const { boostId } = await req.json();
    if (!boostId) throw new Error("boostId required");

    console.log("[DEACTIVATE-OFFER-BOOST] Starting", { boostId, userId: user.id });

    // Fetch boost
    const { data: boost, error: fetchError } = await supabaseClient
      .from("offer_boosts")
      .select("*")
      .eq("id", boostId)
      .single();

    if (fetchError || !boost) {
      console.error("[DEACTIVATE-OFFER-BOOST] Boost not found", { fetchError });
      throw new Error("Boost not found");
    }

    console.log("[DEACTIVATE-OFFER-BOOST] Boost found", {
      status: boost.status,
      duration_mode: boost.duration_mode,
      total_cost_cents: boost.total_cost_cents,
      duration_hours: boost.duration_hours,
      start_date: boost.start_date,
      end_date: boost.end_date,
      created_at: boost.created_at,
      daily_rate_cents: boost.daily_rate_cents,
      hourly_rate_cents: boost.hourly_rate_cents,
      business_id: boost.business_id,
    });

    // Calculate remaining value
    const createdAt = new Date(boost.created_at);
    const now = new Date();
    let remainingCents = 0;

    if (boost.duration_mode === "hourly") {
      const elapsedMs = now.getTime() - createdAt.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      const usedHours = Math.ceil(elapsedHours);
      const remainingHours = Math.max(0, (boost.duration_hours || 0) - usedHours);
      
      const hourlyRate = boost.hourly_rate_cents || (boost.total_cost_cents / (boost.duration_hours || 1));
      remainingCents = Math.round(remainingHours * hourlyRate);

      console.log("[DEACTIVATE-OFFER-BOOST] Hourly calc", {
        elapsedHours, usedHours, remainingHours, hourlyRate, remainingCents,
      });
    } else {
      const startDate = new Date(boost.start_date);
      const endDate = new Date(boost.end_date);
      const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const usedDays = Math.ceil(elapsedDays);
      
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const remainingDays = Math.max(0, totalDays - usedDays);
      
      const dailyRate = boost.daily_rate_cents || (boost.total_cost_cents / totalDays);
      remainingCents = Math.round(remainingDays * dailyRate);

      console.log("[DEACTIVATE-OFFER-BOOST] Daily calc", {
        startDate: startDate.toISOString(), endDate: endDate.toISOString(),
        elapsedDays, usedDays, totalDays, remainingDays, dailyRate, remainingCents,
      });
    }

    // Fetch business subscription to determine refund policy
    const { data: subscription, error: subError } = await supabaseClient
      .from("business_subscriptions")
      .select("*, subscription_plans(slug)")
      .eq("business_id", boost.business_id)
      .single();

    console.log("[DEACTIVATE-OFFER-BOOST] Subscription", {
      found: !!subscription,
      status: subscription?.status,
      plan_id: subscription?.plan_id,
      plan_slug: (subscription?.subscription_plans as any)?.slug,
      monthly_budget_remaining_cents: subscription?.monthly_budget_remaining_cents,
      subError,
    });

    // Determine if it's a Free, Paid, or Hybrid situation
    const isFreeUser = !subscription || subscription.status === "canceled" || !subscription.plan_id;
    
    console.log("[DEACTIVATE-OFFER-BOOST] Refund decision", {
      isFreeUser, remainingCents,
      willRefund: !isFreeUser && remainingCents > 0,
    });

    // For Free users: no refund
    // For Paid users: return remaining to budget
    if (!isFreeUser && remainingCents > 0) {
      const newBudget = (subscription?.monthly_budget_remaining_cents || 0) + remainingCents;
      const { error: updateError } = await supabaseClient
        .from("business_subscriptions")
        .update({
          monthly_budget_remaining_cents: newBudget,
        })
        .eq("business_id", boost.business_id);

      if (updateError) {
        console.error("[DEACTIVATE-OFFER-BOOST] Budget update error", updateError);
        throw updateError;
      }
      console.log("[DEACTIVATE-OFFER-BOOST] Budget updated", {
        oldBudget: subscription?.monthly_budget_remaining_cents,
        added: remainingCents,
        newBudget,
      });
    }

    // Update boost status to "deactivated" instead of deleting
    const { error: deactivateError } = await supabaseClient
      .from("offer_boosts")
      .update({
        status: "deactivated",
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", boostId);

    if (deactivateError) {
      console.error("[DEACTIVATE-OFFER-BOOST] Deactivate error", deactivateError);
      throw deactivateError;
    }

    const result = {
      success: true,
      remainingCents,
      refunded: !isFreeUser,
    };

    console.log("[DEACTIVATE-OFFER-BOOST] Done", result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error));
    console.error("deactivate-offer-boost error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
