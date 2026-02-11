import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-PENDING-BOOST] ${step}${detailsStr}`);
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

    let deleted = 0;

    // Delete pending event boosts (unpaid)
    const { data: pendingEventBoosts } = await supabaseClient
      .from("event_boosts")
      .select("id")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .eq("source", "purchase");

    if (pendingEventBoosts?.length) {
      const ids = pendingEventBoosts.map(b => b.id);
      await supabaseClient.from("event_boosts").delete().in("id", ids);
      deleted += ids.length;
      logStep("Deleted pending event boosts", { count: ids.length });
    }

    // Delete pending offer boosts (unpaid)
    const { data: pendingOfferBoosts } = await supabaseClient
      .from("offer_boosts")
      .select("id")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .eq("source", "purchase");

    if (pendingOfferBoosts?.length) {
      const ids = pendingOfferBoosts.map(b => b.id);
      await supabaseClient.from("offer_boosts").delete().in("id", ids);
      deleted += ids.length;
      logStep("Deleted pending offer boosts", { count: ids.length });
    }

    // Delete pending profile boosts (unpaid)
    const { data: pendingProfileBoosts } = await supabaseClient
      .from("profile_boosts")
      .select("id")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .eq("source", "purchase");

    if (pendingProfileBoosts?.length) {
      const ids = pendingProfileBoosts.map(b => b.id);
      await supabaseClient.from("profile_boosts").delete().in("id", ids);
      deleted += ids.length;
      logStep("Deleted pending profile boosts", { count: ids.length });
    }

    logStep("Cleanup complete", { totalDeleted: deleted });

    return new Response(
      JSON.stringify({ success: true, deleted }),
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
