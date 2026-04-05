import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-CONNECT-LOGIN-LINK] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitId = (req.headers.get("Authorization") || clientIP).substring(0, 40) + ":" + clientIP;
    const rateCheck = await checkRateLimit(rateLimitId, "create_connect_login_link", 10, 5);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

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
      .select("id, stripe_account_id, stripe_onboarding_completed")
      .eq("user_id", user.id)
      .single();

    if (businessError || !business) {
      throw new Error("Business not found for this user");
    }

    if (!business.stripe_account_id) {
      throw new Error("Business has not connected a Stripe account yet");
    }

    logStep("Business found", { businessId: business.id, stripeAccountId: business.stripe_account_id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create a login link to the Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(business.stripe_account_id);

    logStep("Login link created", { url: loginLink.url });

    return new Response(JSON.stringify({ 
      url: loginLink.url
    }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
