import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SYNC-CONNECT-STATUS] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Fetch the user's business
    const { data: business, error: businessError } = await supabaseClient
      .from("businesses")
      .select("id, name, stripe_account_id, stripe_onboarding_completed, stripe_payouts_enabled")
      .eq("user_id", user.id)
      .single();

    if (businessError || !business) {
      throw new Error("Business not found for this user");
    }

    if (!business.stripe_account_id) {
      logStep("No Stripe account linked");
      return new Response(JSON.stringify({ 
        success: false,
        message: "No Stripe account linked",
        onboarding_completed: false,
        payouts_enabled: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Business found", { 
      businessId: business.id, 
      stripeAccountId: business.stripe_account_id,
      currentOnboardingCompleted: business.stripe_onboarding_completed,
      currentPayoutsEnabled: business.stripe_payouts_enabled
    });

    // Initialize Stripe and fetch account status
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const account = await stripe.accounts.retrieve(business.stripe_account_id);
    
    logStep("Stripe account fetched", {
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });

    // Check if status has changed
    const newOnboardingCompleted = account.details_submitted ?? false;
    const newPayoutsEnabled = account.payouts_enabled ?? false;
    
    const statusChanged = 
      business.stripe_onboarding_completed !== newOnboardingCompleted ||
      business.stripe_payouts_enabled !== newPayoutsEnabled;

    if (statusChanged) {
      logStep("Status changed, updating database", {
        oldOnboarding: business.stripe_onboarding_completed,
        newOnboarding: newOnboardingCompleted,
        oldPayouts: business.stripe_payouts_enabled,
        newPayouts: newPayoutsEnabled
      });

      const { error: updateError } = await supabaseClient
        .from("businesses")
        .update({
          stripe_onboarding_completed: newOnboardingCompleted,
          stripe_payouts_enabled: newPayoutsEnabled,
        })
        .eq("id", business.id);

      if (updateError) {
        logStep("Failed to update business", { error: updateError });
        throw new Error("Failed to update business status");
      }

      logStep("Business status updated successfully");
    } else {
      logStep("Status unchanged, no update needed");
    }

    return new Response(JSON.stringify({ 
      success: true,
      onboarding_completed: newOnboardingCompleted,
      payouts_enabled: newPayoutsEnabled,
      charges_enabled: account.charges_enabled,
      status_changed: statusChanged
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
