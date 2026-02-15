import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXPIRE-BOOSTS] ${step}${detailsStr}`);
};

/**
 * Calculate the exact expiration timestamp for a boost.
 * 
 * - Hourly boosts: created_at + duration_hours
 * - Daily boosts: The end_date is exclusive. The boost expires at
 *   the same time-of-day it was created, on the end_date.
 *   E.g. created 14/02 13:10, end_date 15/02 → expires 15/02 13:10
 */
function getExpirationTimestamp(boost: {
  duration_mode: string | null;
  duration_hours: number | null;
  created_at: string;
  start_date: string;
  end_date: string;
}): Date {
  const createdAt = new Date(boost.created_at);

  if (boost.duration_mode === "hourly" && boost.duration_hours) {
    // Hourly: created_at + duration_hours
    return new Date(createdAt.getTime() + boost.duration_hours * 60 * 60 * 1000);
  }

  // Daily: end_date at the same time-of-day as created_at
  // end_date is stored as 'YYYY-MM-DD', so we parse it and apply the time from created_at
  const endDateStr = boost.end_date; // e.g. "2026-02-15"
  const createdTime = createdAt.toISOString().split("T")[1]; // e.g. "11:10:49.919Z"
  return new Date(`${endDateStr}T${createdTime}`);
}

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
    const now = new Date();
    logStep("Starting boost expiration check", { now: now.toISOString() });

    let totalExpired = 0;

    // ── Event Boosts ──
    const { data: activeEventBoosts, error: eventError } = await supabaseClient
      .from("event_boosts")
      .select("id, business_id, event_id, duration_mode, duration_hours, created_at, start_date, end_date, boost_tier")
      .eq("status", "active");

    if (eventError) throw eventError;

    logStep("Active event boosts found", { count: activeEventBoosts?.length || 0 });

    for (const boost of activeEventBoosts || []) {
      const expiresAt = getExpirationTimestamp(boost);

      if (now >= expiresAt) {
        logStep("Expiring event boost", {
          boostId: boost.id,
          eventId: boost.event_id,
          createdAt: boost.created_at,
          endDate: boost.end_date,
          expiresAt: expiresAt.toISOString(),
        });

        const { error: updateError } = await supabaseClient
          .from("event_boosts")
          .update({
            status: "completed",
            updated_at: now.toISOString(),
          })
          .eq("id", boost.id);

        if (updateError) {
          logStep("Error expiring event boost", { boostId: boost.id, error: updateError.message });
          continue;
        }

        // Send notification to business owner
        try {
          const { data: event } = await supabaseClient
            .from("events")
            .select("title")
            .eq("id", boost.event_id)
            .single();

          const { data: business } = await supabaseClient
            .from("businesses")
            .select("user_id, name")
            .eq("id", boost.business_id)
            .single();

          if (business?.user_id) {
            await supabaseClient.functions.invoke("send-business-ops-notification", {
              body: {
                businessUserId: business.user_id,
                businessName: business.name,
                type: "BOOST_ENDED",
                objectTitle: event?.title || "Event",
                boostTier: boost.boost_tier,
              },
            });
          }
        } catch (notifError) {
          logStep("Notification error (non-critical)", { boostId: boost.id, error: String(notifError) });
        }

        totalExpired++;
      }
    }

    // ── Offer Boosts ──
    const { data: activeOfferBoosts, error: offerError } = await supabaseClient
      .from("offer_boosts")
      .select("id, business_id, discount_id, duration_mode, duration_hours, created_at, start_date, end_date, boost_tier")
      .eq("status", "active");

    if (offerError) throw offerError;

    logStep("Active offer boosts found", { count: activeOfferBoosts?.length || 0 });

    for (const boost of activeOfferBoosts || []) {
      const expiresAt = getExpirationTimestamp(boost);

      if (now >= expiresAt) {
        logStep("Expiring offer boost", {
          boostId: boost.id,
          discountId: boost.discount_id,
          createdAt: boost.created_at,
          endDate: boost.end_date,
          expiresAt: expiresAt.toISOString(),
        });

        const { error: updateError } = await supabaseClient
          .from("offer_boosts")
          .update({
            status: "completed",
            updated_at: now.toISOString(),
          })
          .eq("id", boost.id);

        if (updateError) {
          logStep("Error expiring offer boost", { boostId: boost.id, error: updateError.message });
          continue;
        }

        // Send notification
        try {
          const { data: discount } = await supabaseClient
            .from("discounts")
            .select("title")
            .eq("id", boost.discount_id)
            .single();

          const { data: business } = await supabaseClient
            .from("businesses")
            .select("user_id, name")
            .eq("id", boost.business_id)
            .single();

          if (business?.user_id) {
            await supabaseClient.functions.invoke("send-business-ops-notification", {
              body: {
                businessUserId: business.user_id,
                businessName: business.name,
                type: "BOOST_ENDED",
                objectTitle: discount?.title || "Offer",
                boostTier: boost.boost_tier,
              },
            });
          }
        } catch (notifError) {
          logStep("Notification error (non-critical)", { boostId: boost.id, error: String(notifError) });
        }

        totalExpired++;
      }
    }

    logStep("Expiration check complete", { totalExpired });

    return new Response(
      JSON.stringify({ success: true, totalExpired }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[EXPIRE-BOOSTS] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
