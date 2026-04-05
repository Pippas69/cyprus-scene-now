import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";

const ALLOWED_ADMIN_EMAILS = ["ramikakati@gmail.com"]; // admin-only test utility

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitId = (req.headers.get("Authorization") || clientIP).substring(0, 40) + ":" + clientIP;
    const rateCheck = await checkRateLimit(rateLimitId, "admin_force_free", 5, 10);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    if (!ALLOWED_ADMIN_EMAILS.includes(user.email)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { data: business, error: businessError } = await supabaseClient
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (businessError || !business) throw new Error("No business found for user");

    const { data: subscription, error: subError } = await supabaseClient
      .from("business_subscriptions")
      .select("*")
      .eq("business_id", business.id)
      .single();

    if (subError || !subscription) throw new Error("No subscription record found");

    // Cancel any active Stripe subscriptions for this customer (immediate)
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      const activeSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });

      for (const s of activeSubs.data) {
        await stripe.subscriptions.cancel(s.id);
      }
    }

    // Switch DB to Free
    const { data: freePlan, error: freePlanError } = await supabaseClient
      .from("subscription_plans")
      .select("id")
      .eq("slug", "free")
      .single();

    if (freePlanError || !freePlan) throw new Error("Free plan not found");

    const now = new Date().toISOString();

    const { error: updateError } = await supabaseClient
      .from("business_subscriptions")
      .update({
        plan_id: freePlan.id,
        status: "active",
        stripe_subscription_id: null,
        billing_cycle: "monthly",
        monthly_budget_remaining_cents: 0,
        commission_free_offers_remaining: 0,
        downgraded_to_free_at: null,
        downgrade_target_plan: null,
        current_period_start: now,
        current_period_end: now,
      })
      .eq("id", subscription.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
