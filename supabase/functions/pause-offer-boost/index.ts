import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const { boostId } = await req.json();
    if (!boostId) throw new Error("boostId required");

    // Fetch boost to calculate frozen time
    const { data: boost, error: fetchError } = await supabaseClient
      .from("offer_boosts")
      .select("*")
      .eq("id", boostId)
      .single();

    if (fetchError || !boost) throw new Error("Boost not found");

    // Calculate elapsed time
    const createdAt = new Date(boost.created_at);
    const now = new Date();
    
    let frozenHours = 0;
    let frozenDays = 0;

    if (boost.duration_mode === "hourly") {
      // Hourly boost: round up elapsed hours
      const elapsedMs = now.getTime() - createdAt.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      const usedHours = Math.ceil(elapsedHours);
      frozenHours = (boost.duration_hours || 0) - usedHours;
      if (frozenHours < 0) frozenHours = 0;
    } else {
      // Daily boost: round up elapsed days
      const startDate = new Date(boost.start_date);
      const endDate = new Date(boost.end_date);
      const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const usedDays = Math.ceil(elapsedDays);
      
      // Total days in boost
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      frozenDays = totalDays - usedDays;
      if (frozenDays < 0) frozenDays = 0;
    }

    // Update boost: set status to "paused" and store frozen time
    const { error: updateError } = await supabaseClient
      .from("offer_boosts")
      .update({
        active: false,
        status: "paused",
        frozen_hours: frozenHours,
        frozen_days: frozenDays,
        updated_at: new Date().toISOString(),
      })
      .eq("id", boostId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        frozenHours,
        frozenDays,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error));
    console.error("pause-offer-boost error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
