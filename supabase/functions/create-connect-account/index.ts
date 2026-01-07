import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-CONNECT-ACCOUNT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
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
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Fetch the user's business
    const { data: business, error: businessError } = await supabaseClient
      .from("businesses")
      .select("id, name, user_id, stripe_account_id")
      .eq("user_id", user.id)
      .single();

    if (businessError || !business) {
      throw new Error("Business not found for this user");
    }
    logStep("Business found", { businessId: business.id, name: business.name });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if business already has a Stripe Connect account
    if (business.stripe_account_id) {
      logStep("Business has existing Connect account, validating it", { accountId: business.stripe_account_id });
      
      try {
        // Validate the account exists in current mode (test vs live)
        await stripe.accounts.retrieve(business.stripe_account_id);
        
        // Account exists, create onboarding link
        const origin = req.headers.get("origin") || "https://lovable.dev";
        const accountLink = await stripe.accountLinks.create({
          account: business.stripe_account_id,
          refresh_url: `${origin}/dashboard-business/settings?stripe_refresh=true`,
          return_url: `${origin}/dashboard-business/settings?stripe_onboarding=complete`,
          type: "account_onboarding",
        });

        return new Response(JSON.stringify({ 
          url: accountLink.url,
          accountId: business.stripe_account_id,
          isExisting: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (stripeError: unknown) {
        // Account doesn't exist in current mode (test vs live mismatch)
        const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
        logStep("Existing account not found in current Stripe mode, will create new", { 
          error: errorMessage,
          oldAccountId: business.stripe_account_id 
        });
        
        // Clear the old account ID so we can create a new one
        await supabaseClient
          .from("businesses")
          .update({ 
            stripe_account_id: null,
            stripe_onboarding_completed: false,
            stripe_payouts_enabled: false
          })
          .eq("id", business.id);
          
        // Fall through to create new account below
      }
    }

    // Create a new Stripe Connect Express account
    logStep("Creating new Stripe Connect Express account");
    const account = await stripe.accounts.create({
      type: "express",
      country: "GR", // Greece
      email: user.email!,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "company",
      metadata: {
        business_id: business.id,
        user_id: user.id,
      },
    });

    logStep("Stripe account created", { accountId: account.id });

    // Save the account ID to the database
    const { error: updateError } = await supabaseClient
      .from("businesses")
      .update({ 
        stripe_account_id: account.id,
        stripe_onboarding_completed: false,
        stripe_payouts_enabled: false
      })
      .eq("id", business.id);

    if (updateError) {
      logStep("Failed to update business with stripe account", { error: updateError });
      throw new Error("Failed to save Stripe account ID");
    }

    // Create an account link for onboarding
    const origin = req.headers.get("origin") || "https://lovable.dev";
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/dashboard-business/settings?stripe_refresh=true`,
      return_url: `${origin}/dashboard-business/settings?stripe_onboarding=complete`,
      type: "account_onboarding",
    });

    logStep("Account link created", { url: accountLink.url });

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      accountId: account.id,
      isExisting: false
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
