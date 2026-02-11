import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACTIVATE-PENDING-BOOST] ${step}${detailsStr}`);
};

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
    if (userError) throw userError;
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
    const { data: pendingEventBoost } = await supabaseClient
      .from("event_boosts")
      .select("id, start_date, end_date")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .eq("source", "purchase")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingEventBoost) {
      const startDate = new Date(pendingEventBoost.start_date);
      const newStatus = startDate <= now ? "active" : "scheduled";

      const { error: updateError } = await supabaseClient
        .from("event_boosts")
        .update({ status: newStatus })
        .eq("id", pendingEventBoost.id);

      if (updateError) throw updateError;
      activated = true;
      logStep("Event boost activated", { boostId: pendingEventBoost.id, status: newStatus });
    }

    // Check for pending offer boosts
    const { data: pendingOfferBoost } = await supabaseClient
      .from("offer_boosts")
      .select("id, start_date, end_date")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .eq("source", "purchase")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingOfferBoost) {
      const startDate = new Date(pendingOfferBoost.start_date);
      const newStatus = startDate <= now ? "active" : "scheduled";

      const { error: updateError } = await supabaseClient
        .from("offer_boosts")
        .update({ 
          status: newStatus,
          active: newStatus === "active",
        })
        .eq("id", pendingOfferBoost.id);

      if (updateError) throw updateError;
      activated = true;
      logStep("Offer boost activated", { boostId: pendingOfferBoost.id, status: newStatus });
    }

    // Check for pending profile boosts
    const { data: pendingProfileBoost } = await supabaseClient
      .from("profile_boosts")
      .select("id, start_date, end_date")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .eq("source", "purchase")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingProfileBoost) {
      const startDate = new Date(pendingProfileBoost.start_date);
      const newStatus = startDate <= now ? "active" : "scheduled";

      const { error: updateError } = await supabaseClient
        .from("profile_boosts")
        .update({ status: newStatus })
        .eq("id", pendingProfileBoost.id);

      if (updateError) throw updateError;
      activated = true;
      logStep("Profile boost activated", { boostId: pendingProfileBoost.id, status: newStatus });
    }

    if (!activated) {
      logStep("No pending boosts found");
    }

    return new Response(
      JSON.stringify({ success: true, activated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
