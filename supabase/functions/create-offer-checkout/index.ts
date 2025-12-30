import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CREATE-OFFER-CHECKOUT] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Create client with anon key for user auth
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { discountId } = await req.json();
    if (!discountId) throw new Error("Discount ID is required");

    // Fetch the discount/offer details WITH business Stripe account info
    const { data: discount, error: discountError } = await supabaseAdmin
      .from("discounts")
      .select(`
        *,
        businesses!inner(id, name, user_id, stripe_account_id, stripe_payouts_enabled)
      `)
      .eq("id", discountId)
      .single();

    if (discountError || !discount) {
      throw new Error("Offer not found");
    }
    logStep("Discount fetched", { discountId, title: discount.title });

    // Validate business has completed Stripe Connect onboarding
    if (!discount.businesses.stripe_account_id) {
      throw new Error("This business has not completed payment setup. Please try again later.");
    }
    if (!discount.businesses.stripe_payouts_enabled) {
      throw new Error("This business's payment account is not yet verified. Please try again later.");
    }
    logStep("Business Stripe account verified", { 
      stripeAccountId: discount.businesses.stripe_account_id,
      payoutsEnabled: discount.businesses.stripe_payouts_enabled
    });

    // Validate offer is active and within date range
    if (!discount.active) {
      throw new Error("This offer is not currently active");
    }

    const now = new Date();
    const startDate = new Date(discount.start_at);
    const endDate = new Date(discount.end_at);

    if (now < startDate) {
      throw new Error("This offer has not started yet");
    }

    if (now > endDate) {
      throw new Error("This offer has expired");
    }

    // Check if max_purchases limit reached
    if (discount.max_purchases && discount.total_purchased >= discount.max_purchases) {
      throw new Error("This offer has sold out");
    }

    // Check user's purchase count for this offer
    const { count: userPurchaseCount } = await supabaseAdmin
      .from("offer_purchases")
      .select("*", { count: "exact", head: true })
      .eq("discount_id", discountId)
      .eq("user_id", user.id)
      .in("status", ["paid", "redeemed"]);

    const maxPerUser = discount.max_per_user || 1;
    if (userPurchaseCount && userPurchaseCount >= maxPerUser) {
      throw new Error(`You can only purchase this offer ${maxPerUser} time(s)`);
    }
    logStep("Validation passed", { userPurchaseCount, maxPerUser });

    // Calculate pricing
    const originalPriceCents = discount.original_price_cents || 0;
    const discountPercent = discount.percent_off || 0;
    const finalPriceCents = Math.round(originalPriceCents * (100 - discountPercent) / 100);

    // Check for commission from offer boost
    let commissionPercent = 0;
    const { data: boostData } = await supabaseAdmin
      .from("offer_boosts")
      .select("commission_percent")
      .eq("discount_id", discountId)
      .eq("active", true)
      .single();

    if (boostData) {
      commissionPercent = boostData.commission_percent;
    }

    // Commission is based on original price (as per business logic)
    const commissionAmountCents = Math.round((originalPriceCents * commissionPercent) / 100);
    const businessPayoutCents = finalPriceCents - commissionAmountCents;

    logStep("Pricing calculated", {
      originalPriceCents,
      discountPercent,
      finalPriceCents,
      commissionPercent,
      commissionAmountCents,
      businessPayoutCents
    });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Stripe customer check", { customerId: customerId || "new customer" });

    // Create pending purchase record
    const expiresAt = new Date(discount.end_at).toISOString();
    const { data: purchaseRecord, error: purchaseError } = await supabaseAdmin
      .from("offer_purchases")
      .insert({
        discount_id: discountId,
        user_id: user.id,
        business_id: discount.business_id,
        original_price_cents: originalPriceCents,
        discount_percent: discountPercent,
        final_price_cents: finalPriceCents,
        commission_percent: commissionPercent,
        commission_amount_cents: commissionAmountCents,
        business_payout_cents: businessPayoutCents,
        status: "pending",
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (purchaseError) {
      throw new Error(`Failed to create purchase record: ${purchaseError.message}`);
    }
    logStep("Purchase record created", { purchaseId: purchaseRecord.id });

    // Create Stripe checkout session with DESTINATION CHARGE (split payment)
    const origin = req.headers.get("origin") || "https://fomo.lovable.app";
    
    // Build checkout session config
    const checkoutConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: discount.title,
              description: `${discountPercent}% off - ${discount.businesses.name}`,
            },
            unit_amount: finalPriceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/offer-purchase-success?purchase_id=${purchaseRecord.id}`,
      cancel_url: `${origin}/feed`,
      metadata: {
        type: "offer_purchase",
        purchase_id: purchaseRecord.id,
        discount_id: discountId,
        user_id: user.id,
        business_id: discount.business_id,
      },
    };

    // Add destination charge with application fee (split payment)
    // Platform keeps the commission, business gets the rest automatically
    checkoutConfig.payment_intent_data = {
      application_fee_amount: commissionAmountCents, // Platform commission
      transfer_data: {
        destination: discount.businesses.stripe_account_id, // Business receives the rest
      },
    };

    logStep("Creating checkout with destination charge", {
      applicationFee: commissionAmountCents,
      destination: discount.businesses.stripe_account_id,
      totalCharge: finalPriceCents,
      businessReceives: finalPriceCents - commissionAmountCents,
    });

    const session = await stripe.checkout.sessions.create(checkoutConfig);

    // Update purchase record with checkout session ID
    await supabaseAdmin
      .from("offer_purchases")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", purchaseRecord.id);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, purchaseId: purchaseRecord.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
