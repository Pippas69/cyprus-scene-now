import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.info(`[STRIPE-HEALTHCHECK] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    // Log safe fingerprint (never full key)
    const keyFingerprint = stripeKey
      ? {
          prefix: stripeKey.substring(0, 7), // "sk_live" or "sk_test"
          suffix: stripeKey.slice(-4),
          length: stripeKey.length,
        }
      : null;

    if (keyFingerprint) {
      logStep("Key fingerprint", keyFingerprint);
    } else {
      logStep("Key fingerprint: null");
    }

    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not set");
      return new Response(
        JSON.stringify({ ok: false, error: "STRIPE_SECRET_KEY is not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Validate key format
    if (!stripeKey.startsWith("sk_live_") && !stripeKey.startsWith("sk_test_")) {
      logStep("ERROR: Invalid key format");
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Invalid key format. Expected sk_live_ or sk_test_, got prefix: ${stripeKey.substring(0, 7)}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Test the key by retrieving balance (minimal API call)
    logStep("Testing Stripe connection...");
    const balance = await stripe.balance.retrieve();

    logStep("Stripe connection successful", {
      livemode: balance.livemode,
      available: balance.available?.length,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        livemode: balance.livemode,
        keyPrefix: stripeKey.substring(0, 7),
        keySuffix: stripeKey.slice(-4),
        keyLength: stripeKey.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
