// Edge function to send personalized notifications for boosted content & new events/offers
// matching user interests
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PERSONALIZED-NOTIFS] ${step}`, details ? JSON.stringify(details) : '');
};

// Branded email template
const emailHeader = `
  <div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 48px 24px 36px 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px;">ΦΟΜΟ</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Επιλεγμένα για Εσένα</p>
  </div>
`;

const emailFooter = `
  <div style="background: #102b4a; padding: 28px; text-align: center; border-radius: 0 0 12px 12px;">
    <p style="color: #3ec3b7; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px 0;">ΦΟΜΟ</p>
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 ΦΟΜΟ. Discover events in Cyprus.</p>
  </div>
`;

const wrapEmailContent = (content: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 20px; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      ${emailHeader}
      <div style="padding: 32px 24px;">
        ${content}
      </div>
      ${emailFooter}
    </div>
  </body>
  </html>
`;

interface NewContent {
  id: string;
  title: string;
  category: string[];
  business_name: string;
  type: 'event' | 'offer';
  is_boosted: boolean;
  image_url?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    // Get new events created in the last 6 hours (more frequent for real-time feel)
    const { data: newEvents } = await supabase
      .from('events')
      .select(`
        id, title, category, cover_image_url,
        businesses!inner(name)
      `)
      .gte('created_at', sixHoursAgo.toISOString())
      .gte('start_at', now.toISOString());

    // Get new offers created in the last 6 hours
    const { data: newOffers } = await supabase
      .from('discounts')
      .select(`
        id, title, category,
        businesses!inner(name)
      `)
      .gte('created_at', sixHoursAgo.toISOString())
      .eq('active', true)
      .gte('end_at', now.toISOString());

    // Get actively boosted events
    const { data: boostedEvents } = await supabase
      .from('event_boosts')
      .select(`
        event_id,
        events!inner(id, title, category, cover_image_url, businesses!inner(name))
      `)
      .eq('status', 'active')
      .lte('start_date', now.toISOString())
      .gte('end_date', now.toISOString());

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
        image_url: e.cover_image_url,
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
          image_url: b.events.cover_image_url,
        });
      }
    });

    if (newContent.length === 0) {
      logStep("No new content to notify about");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No new content' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep(`Found ${newContent.length} content items`);

    // Get users with preferences enabled for boosted content / suggestions
    // The UI toggle "Προτάσεις για Εσένα" uses notification_boosted_content
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('user_id, notification_personalized_events, notification_personalized_offers, notification_boosted_content, notification_fomo_recommendations, email_notifications_enabled, notification_push_enabled')
      .eq('notification_boosted_content', true);

    if (!userPrefs || userPrefs.length === 0) {
      logStep("No users with enabled preferences");
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
    let inAppCount = 0;

    for (const profile of profiles || []) {
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

      // Check notification log to avoid duplicates (6-hour window)
      const { data: existingLogs } = await supabase
        .from('notification_log')
        .select('reference_id')
        .eq('user_id', profile.id)
        .eq('notification_type', 'personalized_suggestion')
        .gte('sent_at', sixHoursAgo.toISOString());

      const alreadySent = new Set(existingLogs?.map(l => l.reference_id) || []);
      const newMatchingContent = matchingContent.filter(c => !alreadySent.has(c.id));

      if (newMatchingContent.length === 0) continue;

      // Create in-app notifications for each matching item (max 3 per cycle)
      const itemsToNotify = newMatchingContent.slice(0, 3);

      for (const item of itemsToNotify) {
        try {
          // Create in-app notification
          await supabase.from('notifications').insert({
            user_id: profile.id,
            title: item.is_boosted ? '⭐ Προτεινόμενο για Εσένα' : '🎯 Νέο για Εσένα',
            message: item.type === 'event' 
              ? `Νέα εκδήλωση: ${item.title} από ${item.business_name}`
              : `Νέα προσφορά: ${item.title} από ${item.business_name}`,
            type: 'info',
            event_type: 'personalized_suggestion',
            entity_type: item.type,
            entity_id: item.id,
            deep_link: item.type === 'event' ? `/event/${item.id}` : `/discount/${item.id}`,
            read: false,
          });

          // Send push notification if enabled
          if (pref.notification_push_enabled !== false) {
            const { data: subs } = await supabase
              .from('push_subscriptions')
              .select('*')
              .eq('user_id', profile.id);

            if (subs && subs.length > 0) {
              const payload = JSON.stringify({
                title: item.is_boosted ? '⭐ Προτεινόμενο για Εσένα' : '🎯 Νέο περιεχόμενο για εσένα!',
                body: `${item.title} από ${item.business_name}`,
                icon: '/fomo-logo-new.png',
                badge: '/fomo-logo-new.png',
                tag: `suggestion-${item.id}`,
                data: { url: item.type === 'event' ? `/event/${item.id}` : `/discount/${item.id}` },
              });

              for (const sub of subs) {
                try {
                  await fetch(sub.endpoint, {
                    method: 'POST',
                    headers: {
                      'TTL': '86400',
                      'Content-Type': 'application/json',
                    },
                    body: payload,
                  });
                } catch {}
              }
            }
          }

          // Log the notification
          await supabase.from('notification_log').insert({
            user_id: profile.id,
            notification_type: 'personalized_suggestion',
            reference_id: item.id,
            reference_type: item.type,
          });

          inAppCount++;
        } catch (err) {
          logStep('Error creating notification', { itemId: item.id, error: String(err) });
        }
      }

      // Send email digest if enabled and we have new items
      if (profile.email && pref.email_notifications_enabled !== false && newMatchingContent.length > 0) {
        // Check if we sent a digest email in the last 24 hours
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const { data: emailLog } = await supabase
          .from('notification_log')
          .select('id')
          .eq('user_id', profile.id)
          .eq('notification_type', 'personalized_digest')
          .gte('sent_at', oneDayAgo.toISOString())
          .limit(1);

        if (!emailLog || emailLog.length === 0) {
          const events = newMatchingContent.filter(c => c.type === 'event');
          const offers = newMatchingContent.filter(c => c.type === 'offer');
          const userName = profile.first_name || profile.name || 'User';

          try {
            const emailHtml = wrapEmailContent(`
              <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">🎯 Επιλεγμένα για Εσένα!</h2>
              <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
                Γεια σου <strong>${userName}</strong>!<br><br>
                Βρήκαμε νέο περιεχόμενο που ταιριάζει στα ενδιαφέροντά σου:
              </p>
              
              ${events.length > 0 ? `
                <div style="margin: 24px 0;">
                  <h3 style="color: #059669; margin: 0 0 12px 0; font-size: 18px;">🎉 Εκδηλώσεις</h3>
                  ${events.slice(0, 5).map(e => `
                    <div style="background: #f0fdfa; padding: 12px 16px; border-radius: 8px; margin: 8px 0; border-left: 4px solid ${e.is_boosted ? '#f59e0b' : '#4ecdc4'};">
                      <p style="color: #0d3b66; margin: 0; font-weight: 600;">${e.is_boosted ? '⭐ ' : ''}${e.title}</p>
                      <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">από ${e.business_name}</p>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              ${offers.length > 0 ? `
                <div style="margin: 24px 0;">
                  <h3 style="color: #f59e0b; margin: 0 0 12px 0; font-size: 18px;">🎁 Προσφορές</h3>
                  ${offers.slice(0, 5).map(o => `
                    <div style="background: #fef3c7; padding: 12px 16px; border-radius: 8px; margin: 8px 0; border-left: 4px solid ${o.is_boosted ? '#dc2626' : '#f59e0b'};">
                      <p style="color: #92400e; margin: 0; font-weight: 600;">${o.is_boosted ? '⭐ ' : ''}${o.title}</p>
                      <p style="color: #a16207; margin: 4px 0 0 0; font-size: 14px;">από ${o.business_name}</p>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              <div style="text-align: center; margin: 28px 0;">
                <a href="https://fomo.com.cy/feed" style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
                  Εξερεύνησε τώρα
                </a>
              </div>
              
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
                Μπορείς να διαχειριστείς τις ειδοποιήσεις σου στις <a href="https://fomo.com.cy/dashboard-user?tab=settings" style="color: #3ec3b7;">ρυθμίσεις</a> του λογαριασμού σου.
              </p>
            `);

            await resend.emails.send({
              from: "ΦΟΜΟ <suggestions@fomo.cy>",
              to: [profile.email],
              subject: "🎯 Νέο περιεχόμενο για εσένα στο ΦΟΜΟ!",
              html: emailHtml,
            });

            // Log digest email
            await supabase.from('notification_log').insert({
              user_id: profile.id,
              notification_type: 'personalized_digest',
              reference_type: 'digest',
            });

            sentCount++;
          } catch (emailError) {
            logStep(`Failed to send email to ${profile.email}`, emailError);
          }
        }
      }
    }

    logStep(`Completed: ${sentCount} emails, ${inAppCount} in-app notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emails_sent: sentCount,
        in_app_sent: inAppCount,
        content_count: newContent.length 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: any) {
    logStep("ERROR", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
