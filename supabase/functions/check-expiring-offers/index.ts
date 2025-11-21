import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for expiring offers...');

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
      console.error('Error fetching expiring offers:', offersError);
      throw offersError;
    }

    console.log(`Found ${expiringOffers?.length || 0} expiring offers`);

    if (!expiringOffers || expiringOffers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expiring offers found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let notificationCount = 0;

    // For each expiring offer, find users who have favorited it
    for (const offer of expiringOffers) {
      const { data: favoriteUsers, error: favError } = await supabase
        .from('favorite_discounts')
        .select('user_id')
        .eq('discount_id', offer.id);

      if (favError) {
        console.error(`Error fetching favorites for offer ${offer.id}:`, favError);
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

      // Create notifications for each user
      for (const favorite of favoriteUsers) {
        // Check if notification already exists for this user and offer
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', favorite.user_id)
          .eq('entity_id', offer.id)
          .eq('entity_type', 'discount')
          .eq('type', 'expiring_offer')
          .single();

        if (existingNotification) {
          console.log(`Notification already exists for user ${favorite.user_id} and offer ${offer.id}`);
          continue;
        }

        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: favorite.user_id,
            title: 'Offer Expiring Soon!',
            message: `"${offer.title}" from ${businessName} expires in ${hoursUntilExpiry} hours. Don't miss out!`,
            type: 'expiring_offer',
            entity_type: 'discount',
            entity_id: offer.id,
          });

        if (notifError) {
          console.error(`Error creating notification for user ${favorite.user_id}:`, notifError);
        } else {
          notificationCount++;
          console.log(`Created notification for user ${favorite.user_id} about offer "${offer.title}"`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Successfully checked expiring offers',
        offersChecked: expiringOffers.length,
        notificationsCreated: notificationCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-expiring-offers function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
