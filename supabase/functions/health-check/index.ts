import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};
  const startTotal = Date.now();

  // 1. Database connectivity
  try {
    const dbStart = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error } = await supabase.from("app_settings").select("id").limit(1);
    checks.database = {
      status: error ? "degraded" : "healthy",
      latency_ms: Date.now() - dbStart,
      ...(error && { error: error.message }),
    };
  } catch (e) {
    checks.database = { status: "down", error: e instanceof Error ? e.message : String(e) };
  }

  // 2. Stripe connectivity
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripeStart = Date.now();
      const res = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      checks.stripe = {
        status: res.ok ? "healthy" : "degraded",
        latency_ms: Date.now() - stripeStart,
        ...(!res.ok && { error: `HTTP ${res.status}` }),
      };
      await res.text(); // consume body
    } else {
      checks.stripe = { status: "not_configured" };
    }
  } catch (e) {
    checks.stripe = { status: "down", error: e instanceof Error ? e.message : String(e) };
  }

  // 3. Edge function runtime
  checks.runtime = { status: "healthy", latency_ms: 0 };

  // Overall status
  const allHealthy = Object.values(checks).every(c => c.status === "healthy" || c.status === "not_configured");
  const anyDown = Object.values(checks).some(c => c.status === "down");

  const overallStatus = anyDown ? "down" : allHealthy ? "healthy" : "degraded";

  return new Response(JSON.stringify({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    total_latency_ms: Date.now() - startTotal,
    checks,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: overallStatus === "down" ? 503 : 200,
  });
});
