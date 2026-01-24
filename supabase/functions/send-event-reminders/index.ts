// Edge function to send event reminders 1 day & 2 hours before events
// For: reservations, tickets, RSVPs (going + interested)
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[EVENT-REMINDERS] ${step}`, details ? JSON.stringify(details) : '');
};

// Branded email template
const emailHeader = `
  <div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 48px 24px 36px 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px;">ΦΟΜΟ</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Cyprus Events</p>
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

interface UserEvent {
  user_id: string;
  event_id: string;
  event_title: string;
  event_start: string;
  event_location: string;
  user_email: string;
  user_name: string;
  reminder_type: '1_day' | '2_hours';
  interaction_type: 'rsvp_going' | 'rsvp_interested' | 'ticket' | 'reservation';
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
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // Time windows (30 min buffer for cron timing)
    const oneDayStart = new Date(oneDayFromNow.getTime() - 15 * 60 * 1000);
    const oneDayEnd = new Date(oneDayFromNow.getTime() + 15 * 60 * 1000);
    const twoHoursStart = new Date(twoHoursFromNow.getTime() - 15 * 60 * 1000);
    const twoHoursEnd = new Date(twoHoursFromNow.getTime() + 15 * 60 * 1000);

    const usersToNotify: UserEvent[] = [];

    // 1. Get RSVPs (going AND interested) for events starting in 1 day or 2 hours
    const { data: rsvpsGoing } = await supabase
      .from('rsvps')
      .select(`
        user_id, status,
        events!inner(id, title, start_at, location)
      `)
      .eq('status', 'going')
      .or(`start_at.gte.${oneDayStart.toISOString()}.and.start_at.lte.${oneDayEnd.toISOString()},start_at.gte.${twoHoursStart.toISOString()}.and.start_at.lte.${twoHoursEnd.toISOString()}`, { foreignTable: 'events' });

    const { data: rsvpsInterested } = await supabase
      .from('rsvps')
      .select(`
        user_id, status,
        events!inner(id, title, start_at, location)
      `)
      .eq('status', 'interested')
      .or(`start_at.gte.${oneDayStart.toISOString()}.and.start_at.lte.${oneDayEnd.toISOString()},start_at.gte.${twoHoursStart.toISOString()}.and.start_at.lte.${twoHoursEnd.toISOString()}`, { foreignTable: 'events' });

    // 2. Get ticket holders for events starting in 1 day or 2 hours
    const { data: tickets } = await supabase
      .from('ticket_orders')
      .select(`
        user_id,
        events!inner(id, title, start_at, location)
      `)
      .eq('payment_status', 'completed')
      .or(`start_at.gte.${oneDayStart.toISOString()}.and.start_at.lte.${oneDayEnd.toISOString()},start_at.gte.${twoHoursStart.toISOString()}.and.start_at.lte.${twoHoursEnd.toISOString()}`, { foreignTable: 'events' });

    // 3. Get reservations for events starting in 1 day or 2 hours
    const { data: reservations } = await supabase
      .from('reservations')
      .select(`
        user_id,
        events!inner(id, title, start_at, location)
      `)
      .eq('status', 'accepted')
      .or(`start_at.gte.${oneDayStart.toISOString()}.and.start_at.lte.${oneDayEnd.toISOString()},start_at.gte.${twoHoursStart.toISOString()}.and.start_at.lte.${twoHoursEnd.toISOString()}`, { foreignTable: 'events' });

    // Collect all user IDs
    const allUserIds = new Set<string>();
    rsvpsGoing?.forEach((r: any) => allUserIds.add(r.user_id));
    rsvpsInterested?.forEach((r: any) => allUserIds.add(r.user_id));
    tickets?.forEach((t: any) => allUserIds.add(t.user_id));
    reservations?.forEach((r: any) => allUserIds.add(r.user_id));

    if (allUserIds.size === 0) {
      logStep("No users to notify");
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profiles and preferences
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, name')
      .in('id', Array.from(allUserIds));

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('user_id, notification_event_reminders, email_notifications_enabled, notification_push_enabled')
      .in('user_id', Array.from(allUserIds));

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const prefMap = new Map(prefs?.map(p => [p.user_id, p]) || []);

    // Helper to determine reminder type
    const getReminderType = (eventStart: string): '1_day' | '2_hours' | null => {
      const start = new Date(eventStart);
      if (start >= oneDayStart && start <= oneDayEnd) return '1_day';
      if (start >= twoHoursStart && start <= twoHoursEnd) return '2_hours';
      return null;
    };

    // Process RSVPs (going)
    rsvpsGoing?.forEach((r: any) => {
      const reminderType = getReminderType(r.events.start_at);
      if (!reminderType) return;
      
      const pref = prefMap.get(r.user_id);
      if (!pref?.notification_event_reminders) return;

      const profile = profileMap.get(r.user_id);
      if (!profile?.email) return;

      usersToNotify.push({
        user_id: r.user_id,
        event_id: r.events.id,
        event_title: r.events.title,
        event_start: r.events.start_at,
        event_location: r.events.location,
        user_email: profile.email,
        user_name: profile.first_name || profile.name || 'User',
        reminder_type: reminderType,
        interaction_type: 'rsvp_going',
      });
    });

    // Process RSVPs (interested)
    rsvpsInterested?.forEach((r: any) => {
      const reminderType = getReminderType(r.events.start_at);
      if (!reminderType) return;
      
      const pref = prefMap.get(r.user_id);
      if (!pref?.notification_event_reminders) return;

      const profile = profileMap.get(r.user_id);
      if (!profile?.email) return;

      usersToNotify.push({
        user_id: r.user_id,
        event_id: r.events.id,
        event_title: r.events.title,
        event_start: r.events.start_at,
        event_location: r.events.location,
        user_email: profile.email,
        user_name: profile.first_name || profile.name || 'User',
        reminder_type: reminderType,
        interaction_type: 'rsvp_interested',
      });
    });

    // Process tickets
    tickets?.forEach((t: any) => {
      const reminderType = getReminderType(t.events.start_at);
      if (!reminderType) return;

      const pref = prefMap.get(t.user_id);
      if (!pref?.notification_event_reminders) return;

      const profile = profileMap.get(t.user_id);
      if (!profile?.email) return;

      usersToNotify.push({
        user_id: t.user_id,
        event_id: t.events.id,
        event_title: t.events.title,
        event_start: t.events.start_at,
        event_location: t.events.location,
        user_email: profile.email,
        user_name: profile.first_name || profile.name || 'User',
        reminder_type: reminderType,
        interaction_type: 'ticket',
      });
    });

    // Process reservations
    reservations?.forEach((r: any) => {
      const reminderType = getReminderType(r.events.start_at);
      if (!reminderType) return;

      const pref = prefMap.get(r.user_id);
      if (!pref?.notification_event_reminders) return;

      const profile = profileMap.get(r.user_id);
      if (!profile?.email) return;

      usersToNotify.push({
        user_id: r.user_id,
        event_id: r.events.id,
        event_title: r.events.title,
        event_start: r.events.start_at,
        event_location: r.events.location,
        user_email: profile.email,
        user_name: profile.first_name || profile.name || 'User',
        reminder_type: reminderType,
        interaction_type: 'reservation',
      });
    });

    // Dedupe by user + event + reminder_type (only keep first interaction type per user-event combo)
    const seen = new Set<string>();
    const uniqueNotifications = usersToNotify.filter(n => {
      const key = `${n.user_id}-${n.event_id}-${n.reminder_type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Check notification log to avoid duplicates
    const notificationKeys = uniqueNotifications.map(n => 
      `event_reminder_${n.reminder_type}_${n.event_id}`
    );
    
    const { data: existingLogs } = await supabase
      .from('notification_log')
      .select('user_id, notification_type, reference_id')
      .in('user_id', uniqueNotifications.map(n => n.user_id));

    const loggedSet = new Set(
      existingLogs?.map(l => `${l.user_id}-${l.notification_type}-${l.reference_id}`) || []
    );

    let sentCount = 0;

    for (const notification of uniqueNotifications) {
      const logKey = `${notification.user_id}-event_reminder_${notification.reminder_type}-${notification.event_id}`;
      if (loggedSet.has(logKey)) continue;

      const eventDate = new Date(notification.event_start);
      const timeText = notification.reminder_type === '1_day' 
        ? 'αύριο' 
        : 'σε 2 ώρες';

      const interactionText = {
        rsvp_going: 'που δήλωσες ότι θα πας',
        rsvp_interested: 'που σε ενδιαφέρει',
        ticket: 'για την οποία έχεις εισιτήριο',
        reservation: 'για την οποία έχεις κράτηση',
      }[notification.interaction_type];

      const formattedDate = eventDate.toLocaleString('el-GR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      const pref = prefMap.get(notification.user_id);
      const emailEnabled = pref?.email_notifications_enabled !== false;
      const pushEnabled = pref?.notification_push_enabled !== false;

      try {
        // Send email if enabled
        if (emailEnabled) {
          const emailHtml = wrapEmailContent(`
            <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">
              ${notification.reminder_type === '1_day' ? '📅 Υπενθύμιση - Αύριο!' : '⏰ Υπενθύμιση - Σε 2 ώρες!'}
            </h2>
            <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
              Γεια σου <strong>${notification.user_name}</strong>!<br><br>
              Η εκδήλωση ${interactionText} ξεκινάει <strong>${timeText}</strong>!
            </p>
            
            <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-left: 4px solid #4ecdc4; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <h3 style="color: #0d3b66; margin: 0 0 12px 0; font-size: 20px;">${notification.event_title}</h3>
              <p style="color: #475569; margin: 4px 0;">📍 ${notification.event_location}</p>
              <p style="color: #475569; margin: 4px 0;">🕐 ${formattedDate}</p>
            </div>

            <p style="color: #059669; font-weight: 600; text-align: center; font-size: 16px;">
              🎉 Μην αργήσεις!
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="https://fomo.com.cy/event/${notification.event_id}" style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
                Δες την Εκδήλωση
              </a>
            </div>
          `);

          await resend.emails.send({
            from: "ΦΟΜΟ <reminders@fomo.cy>",
            to: [notification.user_email],
            subject: `${notification.reminder_type === '1_day' ? '📅' : '⏰'} ${notification.event_title} - ${timeText}!`,
            html: emailHtml,
          });
        }

        // Create in-app notification
        await supabase.from('notifications').insert({
          user_id: notification.user_id,
          title: notification.reminder_type === '1_day' ? '📅 Υπενθύμιση - Αύριο!' : '⏰ Υπενθύμιση - Σε 2 ώρες!',
          message: `Η εκδήλωση "${notification.event_title}" ${interactionText} ξεκινάει ${timeText}!`,
          type: 'info',
          event_type: 'event_reminder',
          entity_type: 'event',
          entity_id: notification.event_id,
          deep_link: `/event/${notification.event_id}`,
          read: false,
        });

        // Send push notification if enabled
        if (pushEnabled) {
          const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', notification.user_id);

          if (subs && subs.length > 0) {
            const payload = JSON.stringify({
              title: notification.reminder_type === '1_day' ? '📅 Υπενθύμιση Εκδήλωσης' : '⏰ Η εκδήλωση ξεκινάει σύντομα!',
              body: `${notification.event_title} - ${timeText}!`,
              icon: '/fomo-logo-new.png',
              badge: '/fomo-logo-new.png',
              tag: `event-reminder-${notification.event_id}`,
              data: { url: `/event/${notification.event_id}` },
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
          user_id: notification.user_id,
          notification_type: `event_reminder_${notification.reminder_type}`,
          reference_id: notification.event_id,
          reference_type: 'event',
        });

        sentCount++;
      } catch (err) {
        logStep('Error sending reminder', { eventId: notification.event_id, error: String(err) });
      }
    }

    logStep(`Sent ${sentCount} event reminders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount,
        checked: uniqueNotifications.length 
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
