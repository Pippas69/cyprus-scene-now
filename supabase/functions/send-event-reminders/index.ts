import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserEvent {
  user_id: string;
  event_id: string;
  event_title: string;
  event_start: string;
  event_location: string;
  user_email: string;
  user_name: string;
  reminder_type: '1_day' | '2_hours';
  interaction_type: 'rsvp' | 'ticket' | 'reservation';
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
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // Time windows (30 min buffer for cron timing)
    const oneDayStart = new Date(oneDayFromNow.getTime() - 15 * 60 * 1000);
    const oneDayEnd = new Date(oneDayFromNow.getTime() + 15 * 60 * 1000);
    const twoHoursStart = new Date(twoHoursFromNow.getTime() - 15 * 60 * 1000);
    const twoHoursEnd = new Date(twoHoursFromNow.getTime() + 15 * 60 * 1000);

    const usersToNotify: UserEvent[] = [];

    // 1. Get RSVPs (going) for events starting in 1 day or 3 hours
    const { data: rsvps } = await supabase
      .from('rsvps')
      .select(`
        user_id,
        events!inner(id, title, start_at, location)
      `)
      .eq('status', 'going')
      .or(`start_at.gte.${oneDayStart.toISOString()}.and.start_at.lte.${oneDayEnd.toISOString()},start_at.gte.${twoHoursStart.toISOString()}.and.start_at.lte.${twoHoursEnd.toISOString()}`, { foreignTable: 'events' });

    // 2. Get ticket holders for events starting in 1 day or 3 hours
    const { data: tickets } = await supabase
      .from('ticket_orders')
      .select(`
        user_id,
        events!inner(id, title, start_at, location)
      `)
      .eq('payment_status', 'completed')
      .or(`start_at.gte.${oneDayStart.toISOString()}.and.start_at.lte.${oneDayEnd.toISOString()},start_at.gte.${twoHoursStart.toISOString()}.and.start_at.lte.${twoHoursEnd.toISOString()}`, { foreignTable: 'events' });

    // 3. Get reservations for events starting in 1 day or 3 hours
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
    rsvps?.forEach((r: any) => allUserIds.add(r.user_id));
    tickets?.forEach((t: any) => allUserIds.add(t.user_id));
    reservations?.forEach((r: any) => allUserIds.add(r.user_id));

    // Get user profiles and preferences
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, name')
      .in('id', Array.from(allUserIds));

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('user_id, notification_event_reminders, email_notifications_enabled')
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

    // Process RSVPs
    rsvps?.forEach((r: any) => {
      const reminderType = getReminderType(r.events.start_at);
      if (!reminderType) return;
      
      const pref = prefMap.get(r.user_id);
      if (!pref?.notification_event_reminders || !pref?.email_notifications_enabled) return;

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
        interaction_type: 'rsvp',
      });
    });

    // Process tickets
    tickets?.forEach((t: any) => {
      const reminderType = getReminderType(t.events.start_at);
      if (!reminderType) return;

      const pref = prefMap.get(t.user_id);
      if (!pref?.notification_event_reminders || !pref?.email_notifications_enabled) return;

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
      if (!pref?.notification_event_reminders || !pref?.email_notifications_enabled) return;

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

    // Dedupe by user + event + reminder_type
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
        rsvp: 'που δήλωσες ενδιαφέρον',
        ticket: 'για την οποία έχεις εισιτήριο',
        reservation: 'για την οποία έχεις κράτηση',
      }[notification.interaction_type];

      try {
        await resend.emails.send({
          from: "FOMO Cyprus <notifications@fomo.cy>",
          to: [notification.user_email],
          subject: `🔔 Υπενθύμιση: ${notification.event_title} ${timeText}!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6366f1;">Υπενθύμιση Εκδήλωσης</h1>
              <p>Γεια σου ${notification.user_name}!</p>
              <p>Η εκδήλωση <strong>${notification.event_title}</strong> ${interactionText} ξεκινάει ${timeText}!</p>
              <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p><strong>📍 Τοποθεσία:</strong> ${notification.event_location}</p>
                <p><strong>🕐 Ώρα:</strong> ${eventDate.toLocaleString('el-GR')}</p>
              </div>
              <p>Μην αργήσεις!</p>
              <p style="color: #6b7280; font-size: 12px;">FOMO Cyprus - Μην χάσεις τίποτα!</p>
            </div>
          `,
        });

        // Log the notification
        await supabase.from('notification_log').insert({
          user_id: notification.user_id,
          notification_type: `event_reminder_${notification.reminder_type}`,
          reference_id: notification.event_id,
          reference_type: 'event',
        });

        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${notification.user_email}:`, emailError);
      }
    }

    console.log(`Event reminders: Sent ${sentCount} notifications`);

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
    console.error("Error in send-event-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
