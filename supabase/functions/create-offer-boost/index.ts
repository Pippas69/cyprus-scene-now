import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-OFFER-BOOST] ${step}${detailsStr}`);
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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { discountId, commissionPercent, useCommissionFreeSlot } = await req.json();
    logStep("Request data", { discountId, commissionPercent, useCommissionFreeSlot });

    // Get discount and verify ownership
    const { data: discountData, error: discountError } = await supabaseClient
      .from("discounts")
      .select("business_id")
      .eq("id", discountId)
      .single();

    if (discountError) throw discountError;
    const businessId = discountData.business_id;

    // Verify user owns this business
    const { data: businessData, error: businessError } = await supabaseClient
      .from("businesses")
      .select("user_id")
      .eq("id", businessId)
      .single();

    if (businessError) throw businessError;
    if (businessData.user_id !== user.id) throw new Error("Not authorized");

    logStep("Business ownership verified", { businessId });

    // Validate commission percentage
    const validPercentages = [5, 10, 15, 20, 25];
    if (!validPercentages.includes(commissionPercent)) {
      throw new Error("Invalid commission percentage");
    }

    // Map commission to targeting quality
    const targetingQuality = commissionPercent; // 5% = 5, 10% = 10, etc.

    let finalCommissionPercent = commissionPercent;

    if (useCommissionFreeSlot) {
      // Check subscription for available commission-free offers
      const { data: subscription, error: subError } = await supabaseClient
        .from("business_subscriptions")
        .select("commission_free_offers_remaining, status")
        .eq("business_id", businessId)
        .single();

      if (subError || !subscription || subscription.status !== "active") {
        throw new Error("No active subscription found");
      }

      if ((subscription.commission_free_offers_remaining || 0) <= 0) {
        throw new Error("No commission-free offers remaining");
      }

      // Deduct commission-free slot
      const { error: updateError } = await supabaseClient
        .from("business_subscriptions")
        .update({
          commission_free_offers_remaining: (subscription.commission_free_offers_remaining || 0) - 1,
        })
        .eq("business_id", businessId);

      if (updateError) throw updateError;

      finalCommissionPercent = 0; // Commission-free
      logStep("Used commission-free slot");
    }

    // Create offer boost record
    const { error: boostError } = await supabaseClient
      .from("offer_boosts")
      .insert({
        discount_id: discountId,
        business_id: businessId,
        commission_percent: finalCommissionPercent,
        targeting_quality: targetingQuality,
        active: true,
      });

    if (boostError) throw boostError;

    logStep("Offer boost created");

    return new Response(
      JSON.stringify({
        success: true,
        commission_percent: finalCommissionPercent,
        targeting_quality: targetingQuality,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
