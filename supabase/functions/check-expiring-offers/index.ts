import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CHECK-EXPIRING-OFFERS] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logStep('Checking for expiring offers...');

    // Calculate the time 24 hours from now
    const twentyFourHoursFromNow = new Date();
    twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);

    // Get all active offers expiring within the next 24 hours
    const { data: expiringOffers, error: offersError } = await supabase
      .from('discounts')
      .select(`
        id,
        title,
        end_at,
        business_id,
        businesses!inner(name)
      `)
      .eq('active', true)
      .lte('end_at', twentyFourHoursFromNow.toISOString())
      .gte('end_at', new Date().toISOString());

    if (offersError) {
      logStep('Error fetching expiring offers', { error: offersError });
      throw offersError;
    }

    logStep(`Found ${expiringOffers?.length || 0} expiring offers`);

    if (!expiringOffers || expiringOffers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expiring offers found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let notificationCount = 0;
    let pushCount = 0;

    // For each expiring offer, find users who have favorited it
    for (const offer of expiringOffers) {
      const { data: favoriteUsers, error: favError } = await supabase
        .from('favorite_discounts')
        .select('user_id')
        .eq('discount_id', offer.id);

      if (favError) {
        logStep(`Error fetching favorites for offer ${offer.id}`, { error: favError });
        continue;
      }

      if (!favoriteUsers || favoriteUsers.length === 0) {
        continue;
      }

      // Calculate hours until expiration
      const hoursUntilExpiry = Math.floor(
        (new Date(offer.end_at).getTime() - new Date().getTime()) / (1000 * 60 * 60)
      );

      const businessName = (offer.businesses as any)?.name || 'A business';
      const notifTitle = '⏰ Η προσφορά λήγει σύντομα!';
      const notifMessage = `"${offer.title}" από ${businessName} λήγει σε ${hoursUntilExpiry} ώρες. Μην τη χάσεις!`;

      // Create notifications for each user
      for (const favorite of favoriteUsers) {
        // Check if notification already exists for this user and offer (idempotency)
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', favorite.user_id)
          .eq('entity_id', offer.id)
          .eq('entity_type', 'discount')
          .eq('type', 'expiring_offer')
          .single();

        if (existingNotification) {
          logStep(`Notification already exists for user ${favorite.user_id} and offer ${offer.id}`);
          continue;
        }

        // Create in-app notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: favorite.user_id,
            title: notifTitle,
            message: notifMessage,
            type: 'expiring_offer',
            entity_type: 'discount',
            entity_id: offer.id,
          });

        if (notifError) {
          logStep(`Error creating notification for user ${favorite.user_id}`, { error: notifError });
        } else {
          notificationCount++;
          logStep(`Created notification for user ${favorite.user_id} about offer "${offer.title}"`);
        }

        // Send push notification
        try {
          const pushResult = await sendPushIfEnabled(favorite.user_id, {
            title: notifTitle,
            body: notifMessage,
            tag: `expiring-offer-${offer.id}`,
            data: {
              url: `/offer/${offer.id}`,
              type: 'expiring_offer',
              entityType: 'discount',
              entityId: offer.id,
            },
          }, supabase);

          if (pushResult.sent > 0) {
            pushCount++;
            logStep(`Push sent for user ${favorite.user_id}`, { sent: pushResult.sent });
          }
        } catch (pushError) {
          logStep(`Push error for user ${favorite.user_id} (non-fatal)`, { error: pushError instanceof Error ? pushError.message : String(pushError) });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Successfully checked expiring offers',
        offersChecked: expiringOffers.length,
        notificationsCreated: notificationCount,
        pushNotificationsSent: pushCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('Error in check-expiring-offers function', { error: error instanceof Error ? error.message : 'Unknown error' });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
