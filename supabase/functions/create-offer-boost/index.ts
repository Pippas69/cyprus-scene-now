import { createClient } from "npm:@supabase/supabase-js@2";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-OFFER-BOOST] ${step}${detailsStr}`);
};

// 2-tier boost system with hourly and daily rates (in cents)
const BOOST_TIERS = {
  standard: { dailyRateCents: 2500, hourlyRateCents: 300, quality: 4 },
  premium: { dailyRateCents: 4000, hourlyRateCents: 600, quality: 5 },
};

const BodySchema = z.object({
  discountId: flexId,
  tier: boostTier,
  durationMode: durationMode,
  startDate: dateString,
  endDate: dateString.optional(),
  durationHours: positiveInt.optional(),
  useSubscriptionBudget: z.boolean().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitId = (req.headers.get("Authorization") || clientIP).substring(0, 40) + ":" + clientIP;
    const rateCheck = await checkRateLimit(rateLimitId, "create_offer_boost", 10, 5);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { discountId, tier, durationMode, startDate, endDate, durationHours, useSubscriptionBudget } = await parseBody(req, BodySchema);
    logStep("Request data", { discountId, tier, durationMode, startDate, endDate, durationHours, useSubscriptionBudget });

    // Validate tier
    if (!tier || !BOOST_TIERS[tier as keyof typeof BOOST_TIERS]) {
      throw new Error("Invalid boost tier");
    }

    const tierData = BOOST_TIERS[tier as keyof typeof BOOST_TIERS];

    // Get discount and verify ownership
    const { data: discountData, error: discountError } = await supabaseClient
      .from("discounts")
      .select("business_id, end_at")
      .eq("id", discountId)
      .single();

    if (discountError) throw discountError;
    const businessId = discountData.business_id;

    // Validate boost doesn't exceed offer FOMO end time
    const offerFomoEnd = discountData.end_at;
    if (offerFomoEnd) {
      const fomoEndTime = new Date(offerFomoEnd).getTime();
      const now = Date.now();
      if (fomoEndTime <= now) {
        throw new Error("Cannot boost: this offer has already expired on FOMO");
      }
      if (durationMode === "hourly" && durationHours) {
        const boostEndTime = now + durationHours * 60 * 60 * 1000;
        if (boostEndTime > fomoEndTime) {
          const maxHours = Math.floor((fomoEndTime - now) / (1000 * 60 * 60));
          throw new Error(`Boost duration exceeds offer FOMO end. Maximum allowed: ${maxHours} hours`);
        }
      }
      if (durationMode === "daily" && endDate) {
        const boostEnd = new Date(endDate);
        boostEnd.setHours(23, 59, 59, 999);
        if (boostEnd.getTime() > fomoEndTime) {
          throw new Error("Boost end date exceeds offer FOMO end date");
        }
      }
    }

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
      logStep("Hourly cost calculated", { durationHours, totalCostCents });
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      totalCostCents = tierData.dailyRateCents * days;
      logStep("Daily cost calculated", { days, totalCostCents });
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
        { headers: { ...securityHeaders, "Content-Type": "application/json" }, status: 200 }
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
      return new Response(
        JSON.stringify({
          needsPayment: true,
          totalCostCents,
          tier,
          durationMode,
          durationHours: calculatedDurationHours,
          reason: "no_active_subscription",
        }),
        { headers: { ...securityHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const remainingBudget = subscription.monthly_budget_remaining_cents ?? 0;

    // Check if budget is sufficient for full cost
    if (remainingBudget < totalCostCents) {
      logStep("Insufficient subscription budget", { remainingBudget, totalCostCents });
      return new Response(
        JSON.stringify({
          needsPayment: true,
          totalCostCents,
          tier,
          durationMode,
          durationHours: calculatedDurationHours,
          remainingBudgetCents: remainingBudget,
          reason: "insufficient_budget",
        }),
        { headers: { ...securityHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Determine initial status based on start date
    const now = new Date();
    const start = new Date(startDate);
    const status = start <= now ? "active" : "scheduled";

    // Deactivate any existing active boost for this discount (unique constraint: one active per discount)
    const { data: existingActive } = await supabaseClient
      .from("offer_boosts")
      .select("id")
      .eq("discount_id", discountId)
      .eq("active", true)
      .maybeSingle();

    if (existingActive) {
      await supabaseClient
        .from("offer_boosts")
        .update({ active: false, status: "deactivated" })
        .eq("id", existingActive.id);
      logStep("Deactivated existing active boost", { existingId: existingActive.id });
    }

    // Create new boost record
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

    // Deduct full cost from subscription budget AFTER successful boost creation
    const newBudget = remainingBudget - totalCostCents;
    const { error: budgetError } = await supabaseClient
      .from("business_subscriptions")
      .update({ monthly_budget_remaining_cents: newBudget })
      .eq("id", subscription.id);

    if (budgetError) {
      // Best-effort rollback
      await supabaseClient.from("offer_boosts").delete().eq("id", createdBoost.id);
      throw budgetError;
    }

    logStep("Budget deducted", { previousBudget: remainingBudget, deducted: totalCostCents, newBudget });

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
      { headers: { ...securityHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
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
      { headers: { ...securityHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
