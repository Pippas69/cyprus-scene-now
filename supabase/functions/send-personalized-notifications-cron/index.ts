import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-PERSONALIZED-NOTIFICATIONS] ${step}`, details ? JSON.stringify(details) : '');
};

interface BoostedItem {
  id: string;
  type: 'event' | 'offer';
  title: string;
  city: string;
  category: string;
  boost_tier: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Cron job started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Step 1: Find all users with personalized notifications enabled
    const { data: usersWithPrefs, error: prefsError } = await supabase
      .from("user_preferences")
      .select("user_id, default_city")
      .eq("notification_push_enabled", true)
      .eq("notification_fomo_recommendations", true);

    if (prefsError) {
      throw new Error(`Failed to fetch user preferences: ${prefsError.message}`);
    }

    logStep("Found users with notifications enabled", { count: usersWithPrefs?.length || 0 });

    // Step 2: Get user interests for each user
    const { data: userInterests, error: interestsError } = await supabase
      .from("user_interests")
      .select("user_id, interest_category");

    if (interestsError) {
      throw new Error(`Failed to fetch user interests: ${interestsError.message}`);
    }

    const interestsByUser = new Map<string, Set<string>>();
    (userInterests || []).forEach((ui) => {
      if (!interestsByUser.has(ui.user_id)) {
        interestsByUser.set(ui.user_id, new Set());
      }
      interestsByUser.get(ui.user_id)!.add(ui.interest_category);
    });

    // Step 3: Find Premium boosted items (events and offers) that are currently active
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get boosted events
    const { data: boostedEvents, error: eventsError } = await supabase
      .from("event_boosts")
      .select(`
        id,
        events (
          id,
          title,
          city,
          category,
          start_at
        )
      `)
      .eq("boost_tier", "premium")
      .eq("status", "active")
      .gte("created_at", twoWeeksAgo.toISOString())
      .lte("start_date", now.toISOString())
      .gte("end_date", now.toISOString());

    if (eventsError) {
      throw new Error(`Failed to fetch boosted events: ${eventsError.message}`);
    }

    // Get boosted offers
    const { data: boostedOffers, error: offersError } = await supabase
      .from("discount_boosts")
      .select(`
        id,
        discounts (
          id,
          title,
          business_id,
          businesses (
            city,
            category
          )
        )
      `)
      .eq("boost_tier", "premium")
      .eq("status", "active")
      .gte("created_at", twoWeeksAgo.toISOString())
      .lte("start_date", now.toISOString())
      .gte("end_date", now.toISOString());

    if (offersError) {
      throw new Error(`Failed to fetch boosted offers: ${offersError.message}`);
    }

    logStep("Found boosted items", {
      events: (boostedEvents || []).length,
      offers: (boostedOffers || []).length,
    });

    // Step 4: For each user, check if any boosted items match their city + interests
    let notificationsSent = 0;

    for (const userPref of usersWithPrefs || []) {
      const userCity = userPref.default_city;
      const userInterestSet = interestsByUser.get(userPref.user_id) || new Set();

      // Check boosted events
      for (const boostRecord of boostedEvents || []) {
        const event = (boostRecord as any).events;
        if (!event) continue;

        // Match city
        if (event.city?.toLowerCase() !== userCity?.toLowerCase()) continue;

        // Match interests (category must be in user's interests)
        if (event.category && !userInterestSet.has(event.category)) continue;

        // Check if already sent (using idempotency)
        const idempotencyKey = `personalized:event:${event.id}:${userPref.user_id}`;
        const { data: sentCheck } = await supabase
          .from("notification_idempotency")
          .select("id")
          .eq("unique_key", idempotencyKey)
          .single();

        if (sentCheck) {
          logStep("Skipping duplicate personalized event notification", { eventId: event.id, userId: userPref.user_id });
          continue;
        }

        // Send push notification
        await supabase.functions.invoke("send-user-notification", {
          body: {
            userId: userPref.user_id,
            title: `${event.title}`,
            message: `Αυτή η εκδήλωση ταιριάζει στα ενδιαφέροντά σου`,
            eventType: "personalized_event_suggestion",
            entityType: "event",
            entityId: event.id,
            deepLink: `/events/${event.id}`,
            skipEmail: true,
            skipInApp: false,
          },
        });

        // Mark as sent
        await supabase
          .from("notification_idempotency")
          .insert({
            unique_key: idempotencyKey,
            user_id: userPref.user_id,
            event_type: "personalized_event_suggestion",
            entity_type: "event",
            entity_id: event.id,
          });

        notificationsSent++;
      }

      // Check boosted offers (similar logic)
      for (const boostRecord of boostedOffers || []) {
        const discount = (boostRecord as any).discounts;
        if (!discount) continue;

        const businessData = (discount as any).businesses;
        const offerCity = businessData?.city;
        const offerCategories = businessData?.category || [];

        // Match city
        if (offerCity?.toLowerCase() !== userCity?.toLowerCase()) continue;

        // Match interests
        let categoryMatched = false;
        if (Array.isArray(offerCategories)) {
          categoryMatched = offerCategories.some(cat => userInterestSet.has(cat));
        } else if (offerCategories && userInterestSet.has(offerCategories)) {
          categoryMatched = true;
        }
        if (!categoryMatched) continue;

        // Check if already sent
        const idempotencyKey = `personalized:offer:${discount.id}:${userPref.user_id}`;
        const { data: sentCheck } = await supabase
          .from("notification_idempotency")
          .select("id")
          .eq("unique_key", idempotencyKey)
          .single();

        if (sentCheck) {
          logStep("Skipping duplicate personalized offer notification", { offerId: discount.id, userId: userPref.user_id });
          continue;
        }

        // Send push notification
        await supabase.functions.invoke("send-user-notification", {
          body: {
            userId: userPref.user_id,
            title: `${discount.title}`,
            message: `Αυτή η προσφορά ταιριάζει στα ενδιαφέροντά σου`,
            eventType: "personalized_offer_suggestion",
            entityType: "offer",
            entityId: discount.id,
            deepLink: `/offers/${discount.id}`,
            skipEmail: true,
            skipInApp: false,
          },
        });

        // Mark as sent
        await supabase
          .from("notification_idempotency")
          .insert({
            unique_key: idempotencyKey,
            user_id: userPref.user_id,
            event_type: "personalized_offer_suggestion",
            entity_type: "offer",
            entity_id: discount.id,
          });

        notificationsSent++;
      }
    }

    logStep("Cron job completed", { notificationsSent });

    return new Response(
      JSON.stringify({ success: true, notificationsSent }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
