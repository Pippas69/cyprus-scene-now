import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      throw new Error('No business found for user');
    }

    const businessId = business.id;

    // Get existing events and discounts
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('business_id', businessId);

    const { data: discounts } = await supabase
      .from('discounts')
      .select('id')
      .eq('business_id', businessId);

    // Fetch random users for diverse analytics
    const { data: users } = await supabase
      .from('profiles')
      .select('id, age, city')
      .limit(100);

    const actualUsers = users && users.length > 0 ? users : [{ id: user.id, age: null, city: null }];

    console.log(`Found ${events?.length || 0} events and ${discounts?.length || 0} discounts`);
    console.log(`Found ${actualUsers.length} users for diversity`);

    // Generate data for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Helper functions
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomDate = (start: Date, end: Date) => {
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    };
    const randomUser = () => actualUsers[randomInt(0, actualUsers.length - 1)];

    // Separate source arrays for validation
    const eventSources = ['feed', 'map', 'search', 'direct', 'profile'];
    const discountSources = ['feed', 'event', 'profile', 'direct'];
    const followerSources = ['profile', 'event', 'feed', 'search', 'direct'];
    const devices = ['mobile', 'desktop', 'tablet'];
    const sessionIds = Array.from({ length: 100 }, (_, i) => `session_${i}`);

    // Seed event views
    if (events && events.length > 0) {
      const eventViews = [];
      for (let i = 0; i < 800; i++) {
        const event = events[randomInt(0, events.length - 1)];
        const selectedUser = randomUser();
        eventViews.push({
          event_id: event.id,
          user_id: selectedUser.id,
          source: eventSources[randomInt(0, eventSources.length - 1)],
          device_type: devices[randomInt(0, devices.length - 1)],
          session_id: sessionIds[randomInt(0, sessionIds.length - 1)],
          viewed_at: randomDate(thirtyDaysAgo, now).toISOString(),
        });
      }

      const { error: viewsError } = await supabase
        .from('event_views')
        .insert(eventViews);

      if (viewsError) {
        console.error('Error inserting event views:', {
          error: viewsError,
          sampleData: eventViews[0],
          allowedSources: eventSources
        });
      } else {
        console.log(`Inserted ${eventViews.length} event views`);
      }
    }

    // Seed discount views
    if (discounts && discounts.length > 0) {
      const discountViews = [];
      for (let i = 0; i < 300; i++) {
        const discount = discounts[randomInt(0, discounts.length - 1)];
        const selectedUser = randomUser();
        discountViews.push({
          discount_id: discount.id,
          user_id: selectedUser.id,
          source: discountSources[randomInt(0, discountSources.length - 1)],
          device_type: devices[randomInt(0, devices.length - 1)],
          session_id: sessionIds[randomInt(0, sessionIds.length - 1)],
          viewed_at: randomDate(thirtyDaysAgo, now).toISOString(),
        });
      }

      const { error: discountViewsError } = await supabase
        .from('discount_views')
        .insert(discountViews);

      if (discountViewsError) {
        console.error('Error inserting discount views:', {
          error: discountViewsError,
          sampleData: discountViews[0],
          allowedSources: discountSources
        });
      } else {
        console.log(`Inserted ${discountViews.length} discount views`);
      }
    }

    // Seed engagement events
    const engagementEvents = [];
    const engagementTypes = ['profile_view', 'website_click', 'phone_click', 'share', 'favorite'];
    
    for (let i = 0; i < 400; i++) {
      const eventType = engagementTypes[randomInt(0, engagementTypes.length - 1)];
      const entityType = randomInt(0, 1) === 0 ? 'event' : 'business';
      const selectedUser = randomUser();
      
      engagementEvents.push({
        business_id: businessId,
        user_id: selectedUser.id,
        event_type: eventType,
        entity_type: entityType,
        entity_id: businessId,
        session_id: sessionIds[randomInt(0, sessionIds.length - 1)],
        created_at: randomDate(thirtyDaysAgo, now).toISOString(),
      });
    }

    const { error: engagementError } = await supabase
      .from('engagement_events')
      .insert(engagementEvents);

    if (engagementError) {
      console.error('Error inserting engagement events:', engagementError);
    } else {
      console.log(`Inserted ${engagementEvents.length} engagement events`);
    }

    // Seed business followers with diverse users
    const followers = [];
    const uniqueFollowers = new Set();
    for (let i = 0; i < randomInt(50, 150); i++) {
      const selectedUser = randomUser();
      const key = `${businessId}-${selectedUser.id}`;
      if (!uniqueFollowers.has(key)) {
        uniqueFollowers.add(key);
        followers.push({
          business_id: businessId,
          user_id: selectedUser.id,
          source: followerSources[randomInt(0, followerSources.length - 1)],
          created_at: randomDate(thirtyDaysAgo, now).toISOString(),
        });
      }
    }

    const { error: followersError } = await supabase
      .from('business_followers')
      .insert(followers);

    if (followersError && followersError.code !== '23505') {
      console.error('Error inserting followers:', {
        error: followersError,
        sampleData: followers[0],
        allowedSources: followerSources
      });
    } else {
      console.log(`Attempted to insert ${followers.length} followers`);
    }

    // Seed daily analytics
    const dailyAnalytics = [];
    for (let d = 0; d < 30; d++) {
      const date = new Date(thirtyDaysAgo.getTime() + d * 24 * 60 * 60 * 1000);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const multiplier = isWeekend ? 1.5 : 1;

      dailyAnalytics.push({
        business_id: businessId,
        date: date.toISOString().split('T')[0],
        total_event_views: Math.floor(randomInt(20, 50) * multiplier),
        unique_event_viewers: Math.floor(randomInt(10, 30) * multiplier),
        total_discount_views: Math.floor(randomInt(5, 20) * multiplier),
        unique_discount_viewers: Math.floor(randomInt(3, 15) * multiplier),
        new_followers: randomInt(0, 5),
        unfollows: randomInt(0, 2),
        new_rsvps_interested: randomInt(5, 15),
        new_rsvps_going: randomInt(2, 10),
        new_reservations: randomInt(1, 5),
        discount_redemptions: randomInt(0, 3),
        engagement_rate: (Math.random() * 0.15 + 0.05).toFixed(3),
      });
    }

    const { error: analyticsError } = await supabase
      .from('daily_analytics')
      .insert(dailyAnalytics);

    if (analyticsError && analyticsError.code !== '23505') {
      console.error('Error inserting daily analytics:', analyticsError);
    } else {
      console.log(`Inserted ${dailyAnalytics.length} daily analytics records`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test data generated successfully',
        stats: {
          eventViews: events?.length ? 800 : 0,
          discountViews: discounts?.length ? 300 : 0,
          engagementEvents: 400,
          followers: followers.length,
          dailyAnalytics: dailyAnalytics.length,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
