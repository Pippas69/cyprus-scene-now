// Send Follower Notifications - Notify users when businesses they follow post new content
// Runs on a cron schedule every 30 minutes

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-FOLLOWER-NOTIFICATIONS] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let newEventsNotified = 0;
    let newOffersNotified = 0;
    let expiringOffersNotified = 0;
    let lowTicketsNotified = 0;

    // 1. Find new events created in the last 2 hours
    const { data: newEvents, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        start_at,
        business_id,
        businesses!inner(id, name)
      `)
      .gte('created_at', twoHoursAgo.toISOString())
      .gte('start_at', now.toISOString());

    if (eventsError) {
      logStep("Error fetching new events", { error: eventsError });
    } else {
      logStep(`Found ${newEvents?.length || 0} new events`);

      for (const event of newEvents || []) {
        // Get followers of this business who want event notifications
        const { data: followers } = await supabase
          .from('business_followers')
          .select('user_id')
          .eq('business_id', event.business_id)
          .is('unfollowed_at', null);

        if (!followers || followers.length === 0) continue;

        for (const follower of followers) {
          // Check user preferences
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('notification_new_events, notification_followed_business_events')
            .eq('user_id', follower.user_id)
            .single();

          // Skip if user disabled this notification type
          if (prefs?.notification_new_events === false || prefs?.notification_followed_business_events === false) {
            continue;
          }

          // Check idempotency - don't send duplicate notifications
          const { data: existingNotif } = await supabase
            .from('notification_log')
            .select('id')
            .eq('user_id', follower.user_id)
            .eq('notification_type', 'followed_business_new_event')
            .eq('reference_id', event.id)
            .single();

          if (existingNotif) continue;

          const businessName = (event.businesses as any)?.name || 'A business';
          const notifTitle = '🎉 Νέο event!';
          const notifMessage = `${businessName} δημιούργησε νέο event: "${event.title}"`;

          // Create in-app notification
          await supabase.from('notifications').insert({
            user_id: follower.user_id,
            title: notifTitle,
            message: notifMessage,
            type: 'followed_business_new_event',
            entity_type: 'event',
            entity_id: event.id,
          });

          // Send push
          await sendPushIfEnabled(follower.user_id, {
            title: notifTitle,
            body: notifMessage,
            tag: `new-event-${event.id}`,
            data: {
              url: `/event/${event.id}`,
              type: 'followed_business_new_event',
              entityType: 'event',
              entityId: event.id,
            },
          }, supabase);

          // Log for idempotency
          await supabase.from('notification_log').insert({
            user_id: follower.user_id,
            notification_type: 'followed_business_new_event',
            reference_type: 'event',
            reference_id: event.id,
          });

          newEventsNotified++;
        }
      }
    }

    // 2. Find new offers created in the last 2 hours
    const { data: newOffers, error: offersError } = await supabase
      .from('discounts')
      .select(`
        id,
        title,
        end_at,
        business_id,
        businesses!inner(id, name)
      `)
      .eq('active', true)
      .gte('created_at', twoHoursAgo.toISOString())
      .gte('end_at', now.toISOString());

    if (offersError) {
      logStep("Error fetching new offers", { error: offersError });
    } else {
      logStep(`Found ${newOffers?.length || 0} new offers`);

      for (const offer of newOffers || []) {
        const { data: followers } = await supabase
          .from('business_followers')
          .select('user_id')
          .eq('business_id', offer.business_id)
          .is('unfollowed_at', null);

        if (!followers || followers.length === 0) continue;

        for (const follower of followers) {
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('notification_business_updates, notification_followed_business_offers')
            .eq('user_id', follower.user_id)
            .single();

          if (prefs?.notification_business_updates === false || prefs?.notification_followed_business_offers === false) {
            continue;
          }

          const { data: existingNotif } = await supabase
            .from('notification_log')
            .select('id')
            .eq('user_id', follower.user_id)
            .eq('notification_type', 'followed_business_new_offer')
            .eq('reference_id', offer.id)
            .single();

          if (existingNotif) continue;

          const businessName = (offer.businesses as any)?.name || 'A business';
          const notifTitle = '🏷️ Νέα προσφορά!';
          const notifMessage = `${businessName} δημοσίευσε νέα προσφορά: "${offer.title}"`;

          await supabase.from('notifications').insert({
            user_id: follower.user_id,
            title: notifTitle,
            message: notifMessage,
            type: 'followed_business_new_offer',
            entity_type: 'discount',
            entity_id: offer.id,
          });

          await sendPushIfEnabled(follower.user_id, {
            title: notifTitle,
            body: notifMessage,
            tag: `new-offer-${offer.id}`,
            data: {
              url: `/offer/${offer.id}`,
              type: 'followed_business_new_offer',
              entityType: 'discount',
              entityId: offer.id,
            },
          }, supabase);

          await supabase.from('notification_log').insert({
            user_id: follower.user_id,
            notification_type: 'followed_business_new_offer',
            reference_type: 'discount',
            reference_id: offer.id,
          });

          newOffersNotified++;
        }
      }
    }

    // 3. Find followed business offers expiring in 24 hours
    const { data: expiringOffers, error: expiringError } = await supabase
      .from('discounts')
      .select(`
        id,
        title,
        end_at,
        business_id,
        businesses!inner(id, name)
      `)
      .eq('active', true)
      .lte('end_at', twentyFourHoursFromNow.toISOString())
      .gte('end_at', now.toISOString());

    if (expiringError) {
      logStep("Error fetching expiring offers", { error: expiringError });
    } else {
      logStep(`Found ${expiringOffers?.length || 0} expiring offers`);

      for (const offer of expiringOffers || []) {
        const { data: followers } = await supabase
          .from('business_followers')
          .select('user_id')
          .eq('business_id', offer.business_id)
          .is('unfollowed_at', null);

        if (!followers || followers.length === 0) continue;

        const hoursUntilExpiry = Math.floor(
          (new Date(offer.end_at).getTime() - now.getTime()) / (1000 * 60 * 60)
        );

        for (const follower of followers) {
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('notification_expiring_offers')
            .eq('user_id', follower.user_id)
            .single();

          if (prefs?.notification_expiring_offers === false) continue;

          const { data: existingNotif } = await supabase
            .from('notification_log')
            .select('id')
            .eq('user_id', follower.user_id)
            .eq('notification_type', 'followed_offer_expiring')
            .eq('reference_id', offer.id)
            .single();

          if (existingNotif) continue;

          const businessName = (offer.businesses as any)?.name || 'A business';
          const notifTitle = '⏰ Προσφορά λήγει!';
          const notifMessage = `"${offer.title}" από ${businessName} λήγει σε ${hoursUntilExpiry} ώρες`;

          await supabase.from('notifications').insert({
            user_id: follower.user_id,
            title: notifTitle,
            message: notifMessage,
            type: 'followed_offer_expiring',
            entity_type: 'discount',
            entity_id: offer.id,
          });

          await sendPushIfEnabled(follower.user_id, {
            title: notifTitle,
            body: notifMessage,
            tag: `expiring-followed-offer-${offer.id}`,
            data: {
              url: `/offer/${offer.id}`,
              type: 'followed_offer_expiring',
              entityType: 'discount',
              entityId: offer.id,
            },
          }, supabase);

          await supabase.from('notification_log').insert({
            user_id: follower.user_id,
            notification_type: 'followed_offer_expiring',
            reference_type: 'discount',
            reference_id: offer.id,
          });

          expiringOffersNotified++;
        }
      }
    }

    // 4. Find events with tickets almost sold out (≤5 remaining)
    const { data: eventsWithTiers, error: tiersError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        business_id,
        businesses!inner(id, name),
        ticket_tiers(id, quantity_available, quantity_sold)
      `)
      .gte('start_at', now.toISOString());

    if (tiersError) {
      logStep("Error fetching events with tiers", { error: tiersError });
    } else {
      for (const event of eventsWithTiers || []) {
        const tiers = (event.ticket_tiers as any[]) || [];
        const totalAvailable = tiers.reduce((sum, t) => sum + (t.quantity_available || 0), 0);
        const totalSold = tiers.reduce((sum, t) => sum + (t.quantity_sold || 0), 0);
        const remaining = totalAvailable - totalSold;

        // Only notify if remaining is 5 or less and there were tickets to begin with
        if (remaining > 5 || totalAvailable === 0) continue;

        const { data: followers } = await supabase
          .from('business_followers')
          .select('user_id')
          .eq('business_id', event.business_id)
          .is('unfollowed_at', null);

        if (!followers || followers.length === 0) continue;

        for (const follower of followers) {
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('notification_tickets_selling_out')
            .eq('user_id', follower.user_id)
            .single();

          if (prefs?.notification_tickets_selling_out === false) continue;

          const { data: existingNotif } = await supabase
            .from('notification_log')
            .select('id')
            .eq('user_id', follower.user_id)
            .eq('notification_type', 'tickets_almost_sold_out')
            .eq('reference_id', event.id)
            .single();

          if (existingNotif) continue;

          const businessName = (event.businesses as any)?.name || 'A business';
          const notifTitle = '🔥 Τα εισιτήρια τελειώνουν!';
          const notifMessage = remaining === 0 
            ? `Τα εισιτήρια για "${event.title}" εξαντλήθηκαν!` 
            : `Μόνο ${remaining} εισιτήρια για "${event.title}" από ${businessName}!`;

          await supabase.from('notifications').insert({
            user_id: follower.user_id,
            title: notifTitle,
            message: notifMessage,
            type: 'tickets_almost_sold_out',
            entity_type: 'event',
            entity_id: event.id,
          });

          await sendPushIfEnabled(follower.user_id, {
            title: notifTitle,
            body: notifMessage,
            tag: `low-tickets-${event.id}`,
            data: {
              url: `/event/${event.id}`,
              type: 'tickets_almost_sold_out',
              entityType: 'event',
              entityId: event.id,
            },
          }, supabase);

          await supabase.from('notification_log').insert({
            user_id: follower.user_id,
            notification_type: 'tickets_almost_sold_out',
            reference_type: 'event',
            reference_id: event.id,
          });

          lowTicketsNotified++;
        }
      }
    }

    const summary = {
      newEventsNotified,
      newOffersNotified,
      expiringOffersNotified,
      lowTicketsNotified,
      total: newEventsNotified + newOffersNotified + expiringOffersNotified + lowTicketsNotified,
    };

    logStep("Completed", summary);

    return new Response(JSON.stringify({ 
      success: true,
      ...summary,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
