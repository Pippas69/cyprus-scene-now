import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ACTIVATE-PENDING-BOOST] ${step}${detailsStr}`);
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Unknown error");
  }
  return String(error);
};

async function deductPartialBudget(
  supabaseClient: any,
  businessId: string,
  partialBudgetCents: number,
  boostType: string,
  boostId: string
): Promise<boolean> {
  if (partialBudgetCents <= 0) return true;

  logStep("Deducting partial budget", { businessId, partialBudgetCents, boostType, boostId });

  const { data: subscription, error: subError } = await supabaseClient
    .from("business_subscriptions")
    .select("id, monthly_budget_remaining_cents")
    .eq("business_id", businessId)
    .single();

  if (subError || !subscription) {
    logStep("WARNING: No subscription found for budget deduction", { businessId, error: subError?.message });
    return false;
  }

  const currentBudget = subscription.monthly_budget_remaining_cents ?? 0;
  const newBudget = Math.max(0, currentBudget - partialBudgetCents);

  const { error: updateError } = await supabaseClient
    .from("business_subscriptions")
    .update({ monthly_budget_remaining_cents: newBudget })
    .eq("id", subscription.id);

  if (updateError) {
    logStep("ERROR: Failed to deduct budget", { error: updateError.message });
    return false;
  }

  logStep("Budget deducted successfully", { previousBudget: currentBudget, deducted: partialBudgetCents, newBudget });
  return true;
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
    if (userError) throw new Error(userError.message);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id });

    // Find user's business
    const { data: business, error: bizError } = await supabaseClient
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (bizError || !business) throw new Error("Business not found");
    const businessId = business.id;
    logStep("Business found", { businessId });

    const now = new Date();
    let activated = false;

    // Check for pending event boosts
    const { data: pendingEventBoost, error: pendingEventError } = await supabaseClient
      .from("event_boosts")
      .select("id, start_date, end_date, partial_budget_cents")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .eq("source", "purchase")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingEventError) {
      throw new Error(`Failed to fetch pending event boost: ${pendingEventError.message}`);
    }

    if (pendingEventBoost) {
      const startDate = new Date(pendingEventBoost.start_date);
      const newStatus = startDate <= now ? "active" : "scheduled";

      const partialBudget = pendingEventBoost.partial_budget_cents || 0;

      // Deduct partial budget first
      if (partialBudget > 0) {
        const deducted = await deductPartialBudget(supabaseClient, businessId, partialBudget, "event_boost", pendingEventBoost.id);
        if (!deducted) {
          logStep("Failed to deduct budget for event boost, keeping pending", { boostId: pendingEventBoost.id });
          // Don't activate - keep pending
        } else {
          const { error: updateError } = await supabaseClient
            .from("event_boosts")
            .update({ status: newStatus })
            .eq("id", pendingEventBoost.id)
            .eq("status", "pending");
          if (updateError) throw new Error(updateError.message);
          activated = true;
          logStep("Event boost activated", { boostId: pendingEventBoost.id, status: newStatus, budgetDeducted: partialBudget });
        }
      } else {
        const { error: updateError } = await supabaseClient
          .from("event_boosts")
          .update({ status: newStatus })
          .eq("id", pendingEventBoost.id)
          .eq("status", "pending");
        if (updateError) throw new Error(updateError.message);
        activated = true;
        logStep("Event boost activated (no budget deduction needed)", { boostId: pendingEventBoost.id, status: newStatus });
      }
    }

    // Check for pending offer boosts
    const { data: pendingOfferBoost, error: pendingOfferError } = await supabaseClient
      .from("offer_boosts")
      .select("id, discount_id, start_date, end_date, partial_budget_cents")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .eq("source", "purchase")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingOfferError) {
      throw new Error(`Failed to fetch pending offer boost: ${pendingOfferError.message}`);
    }

    if (pendingOfferBoost) {
      const startDate = new Date(pendingOfferBoost.start_date);
      const newStatus = startDate <= now ? "active" : "scheduled";

      // Cleanup bad historical state: completed/deactivated rows that still have active=true
      const { error: cleanupStaleActiveError } = await supabaseClient
        .from("offer_boosts")
        .update({ active: false, updated_at: now.toISOString() })
        .eq("discount_id", pendingOfferBoost.discount_id)
        .neq("id", pendingOfferBoost.id)
        .eq("active", true)
        .neq("status", "active");

      if (cleanupStaleActiveError) {
        throw new Error(`Failed stale-active cleanup: ${cleanupStaleActiveError.message}`);
      }

      const partialBudget = pendingOfferBoost.partial_budget_cents || 0;

      if (partialBudget > 0) {
        const deducted = await deductPartialBudget(supabaseClient, businessId, partialBudget, "offer_boost", pendingOfferBoost.id);
        if (!deducted) {
          logStep("Failed to deduct budget for offer boost, keeping pending", { boostId: pendingOfferBoost.id });
        } else {
          const { error: updateError } = await supabaseClient
            .from("offer_boosts")
            .update({ status: newStatus, active: newStatus === "active", updated_at: now.toISOString() })
            .eq("id", pendingOfferBoost.id)
            .eq("status", "pending");
          if (updateError) throw new Error(updateError.message);
          activated = true;
          logStep("Offer boost activated", { boostId: pendingOfferBoost.id, status: newStatus, budgetDeducted: partialBudget });
        }
      } else {
        const { error: updateError } = await supabaseClient
          .from("offer_boosts")
          .update({ status: newStatus, active: newStatus === "active", updated_at: now.toISOString() })
          .eq("id", pendingOfferBoost.id)
          .eq("status", "pending");
        if (updateError) throw new Error(updateError.message);
        activated = true;
        logStep("Offer boost activated (no budget deduction needed)", { boostId: pendingOfferBoost.id, status: newStatus });
      }

      // Clean up older duplicate pending attempts for this same offer
      const { error: cleanupPendingError } = await supabaseClient
        .from("offer_boosts")
        .update({ status: "deactivated", active: false, updated_at: now.toISOString() })
        .eq("discount_id", pendingOfferBoost.discount_id)
        .eq("status", "pending")
        .neq("id", pendingOfferBoost.id);

      if (cleanupPendingError) {
        logStep("WARNING: Failed to cleanup older pending offer boosts", { boostId: pendingOfferBoost.id, error: cleanupPendingError.message });
      }
    }

    // Check for pending profile boosts
    const { data: pendingProfileBoost, error: pendingProfileError } = await supabaseClient
      .from("profile_boosts")
      .select("id, start_date, end_date, partial_budget_cents")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .eq("source", "purchase")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingProfileError) {
      throw new Error(`Failed to fetch pending profile boost: ${pendingProfileError.message}`);
    }

    if (pendingProfileBoost) {
      const startDate = new Date(pendingProfileBoost.start_date);
      const newStatus = startDate <= now ? "active" : "scheduled";

      const partialBudget = pendingProfileBoost.partial_budget_cents || 0;

      if (partialBudget > 0) {
        const deducted = await deductPartialBudget(supabaseClient, businessId, partialBudget, "profile_boost", pendingProfileBoost.id);
        if (!deducted) {
          logStep("Failed to deduct budget for profile boost, keeping pending", { boostId: pendingProfileBoost.id });
        } else {
          const { error: updateError } = await supabaseClient
            .from("profile_boosts")
            .update({ status: newStatus })
            .eq("id", pendingProfileBoost.id)
            .eq("status", "pending");
          if (updateError) throw new Error(updateError.message);
          activated = true;
          logStep("Profile boost activated", { boostId: pendingProfileBoost.id, status: newStatus, budgetDeducted: partialBudget });
        }
      } else {
        const { error: updateError } = await supabaseClient
          .from("profile_boosts")
          .update({ status: newStatus })
          .eq("id", pendingProfileBoost.id)
          .eq("status", "pending");
        if (updateError) throw new Error(updateError.message);
        activated = true;
        logStep("Profile boost activated (no budget deduction needed)", { boostId: pendingProfileBoost.id, status: newStatus });
      }
    }

    if (!activated) {
      logStep("No pending boosts found");
    }

    return new Response(
      JSON.stringify({ success: true, activated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    const errorMessage = toErrorMessage(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
