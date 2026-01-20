import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewContent {
  id: string;
  title: string;
  category: string[];
  business_name: string;
  type: 'event' | 'offer';
  is_boosted: boolean;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get new events created in the last 24 hours
    const { data: newEvents } = await supabase
      .from('events')
      .select(`
        id, title, category,
        businesses!inner(name)
      `)
      .gte('created_at', oneDayAgo.toISOString())
      .gte('start_at', now.toISOString());

    // Get new offers created in the last 24 hours
    const { data: newOffers } = await supabase
      .from('discounts')
      .select(`
        id, title, category,
        businesses!inner(name)
      `)
      .gte('created_at', oneDayAgo.toISOString())
      .eq('active', true)
      .gte('end_at', now.toISOString());

    // Get boosted events
    const { data: boostedEvents } = await supabase
      .from('event_boosts')
      .select(`
        event_id,
        events!inner(id, title, category, businesses!inner(name))
      `)
      .gte('created_at', oneDayAgo.toISOString())
      .gte('end_at', now.toISOString())
      .gt('total_cost_cents', 0);

    // Get boosted offers
    const { data: boostedOffers } = await supabase
      .from('offer_boosts')
      .select(`
        discount_id,
        discounts!inner(id, title, category, businesses!inner(name))
      `)
      .gte('created_at', oneDayAgo.toISOString())
      .gte('end_at', now.toISOString())
      .gt('total_cost_cents', 0);

    // Build content list
    const newContent: NewContent[] = [];
    
    newEvents?.forEach((e: any) => {
      newContent.push({
        id: e.id,
        title: e.title,
        category: e.category || [],
        business_name: e.businesses?.name,
        type: 'event',
        is_boosted: false,
      });
    });

    newOffers?.forEach((o: any) => {
      newContent.push({
        id: o.id,
        title: o.title,
        category: o.category ? [o.category] : [],
        business_name: o.businesses?.name,
        type: 'offer',
        is_boosted: false,
      });
    });

    boostedEvents?.forEach((b: any) => {
      const existing = newContent.find(c => c.id === b.events.id);
      if (existing) {
        existing.is_boosted = true;
      } else {
        newContent.push({
          id: b.events.id,
          title: b.events.title,
          category: b.events.category || [],
          business_name: b.events.businesses?.name,
          type: 'event',
          is_boosted: true,
        });
      }
    });

    boostedOffers?.forEach((b: any) => {
      const existing = newContent.find(c => c.id === b.discounts.id);
      if (existing) {
        existing.is_boosted = true;
      } else {
        newContent.push({
          id: b.discounts.id,
          title: b.discounts.title,
          category: b.discounts.category ? [b.discounts.category] : [],
          business_name: b.discounts.businesses?.name,
          type: 'offer',
          is_boosted: true,
        });
      }
    });

    if (newContent.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No new content' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get users with preferences enabled
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('user_id, notification_personalized_events, notification_personalized_offers, notification_boosted_content, notification_fomo_recommendations, email_notifications_enabled')
      .eq('email_notifications_enabled', true)
      .eq('notification_fomo_recommendations', true);

    if (!userPrefs || userPrefs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No users with enabled preferences' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user profiles with interests
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, name, preferences')
      .in('id', userPrefs.map(p => p.user_id));

    const prefMap = new Map(userPrefs.map(p => [p.user_id, p]));
    let sentCount = 0;

    for (const profile of profiles || []) {
      if (!profile.email) continue;

      const pref = prefMap.get(profile.id);
      if (!pref) continue;

      const userInterests = profile.preferences || [];
      if (userInterests.length === 0) continue;

      // Find matching content based on user interests
      const matchingContent = newContent.filter(content => {
        // Check if any content category matches user interests
        const hasMatchingCategory = content.category.some(cat => 
          userInterests.includes(cat)
        );
        
        if (!hasMatchingCategory) return false;

        // Check notification preferences
        if (content.is_boosted && !pref.notification_boosted_content) return false;
        if (content.type === 'event' && !content.is_boosted && !pref.notification_personalized_events) return false;
        if (content.type === 'offer' && !content.is_boosted && !pref.notification_personalized_offers) return false;

        return true;
      });

      if (matchingContent.length === 0) continue;

      // Check notification log to avoid duplicates (daily digest)
      const today = new Date().toISOString().split('T')[0];
      const { data: existingLog } = await supabase
        .from('notification_log')
        .select('id')
        .eq('user_id', profile.id)
        .eq('notification_type', 'personalized_digest')
        .gte('sent_at', `${today}T00:00:00Z`)
        .limit(1);

      if (existingLog && existingLog.length > 0) continue;

      // Group content by type
      const events = matchingContent.filter(c => c.type === 'event');
      const offers = matchingContent.filter(c => c.type === 'offer');

      const userName = profile.first_name || profile.name || 'User';

      try {
        await resend.emails.send({
          from: "FOMO Cyprus <notifications@fomo.cy>",
          to: [profile.email],
          subject: `🎯 Νέο περιεχόμενο για εσένα στο FOMO!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6366f1;">Γεια σου ${userName}! 👋</h1>
              <p>Βρήκαμε νέο περιεχόμενο που ταιριάζει στα ενδιαφέροντά σου:</p>
              
              ${events.length > 0 ? `
                <h2 style="color: #10b981;">🎉 Νέες Εκδηλώσεις</h2>
                <ul>
                  ${events.slice(0, 5).map(e => `
                    <li style="margin: 8px 0;">
                      <strong>${e.title}</strong> ${e.is_boosted ? '⭐' : ''}
                      <br><span style="color: #6b7280; font-size: 14px;">από ${e.business_name}</span>
                    </li>
                  `).join('')}
                </ul>
              ` : ''}
              
              ${offers.length > 0 ? `
                <h2 style="color: #f59e0b;">🎁 Νέες Προσφορές</h2>
                <ul>
                  ${offers.slice(0, 5).map(o => `
                    <li style="margin: 8px 0;">
                      <strong>${o.title}</strong> ${o.is_boosted ? '⭐' : ''}
                      <br><span style="color: #6b7280; font-size: 14px;">από ${o.business_name}</span>
                    </li>
                  `).join('')}
                </ul>
              ` : ''}
              
              <a href="https://fomocy.lovable.app/feed" 
                 style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
                Δες τα όλα στο FOMO
              </a>
              
              <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
                FOMO Cyprus - Μην χάσεις τίποτα!<br>
                Μπορείς να διαχειριστείς τις ειδοποιήσεις στις ρυθμίσεις του λογαριασμού σου.
              </p>
            </div>
          `,
        });

        // Log the notification
        await supabase.from('notification_log').insert({
          user_id: profile.id,
          notification_type: 'personalized_digest',
          reference_type: 'digest',
        });

        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
      }
    }

    console.log(`Personalized notifications: Sent ${sentCount} digests`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount,
        content_count: newContent.length 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: any) {
    console.error("Error in send-personalized-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
