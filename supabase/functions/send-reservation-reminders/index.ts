// Edge function to send reservation reminders 2 hours before reservation time
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendEncryptedPush } from "../_shared/web-push-crypto.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const logStep = (step: string, details?: unknown) => {
  console.log(`[RESERVATION-REMINDERS] ${step}`, details ? JSON.stringify(details) : '');
};

// Email template parts
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

interface ReservationReminder {
  userId: string;
  reservationId: string;
  reservationName: string;
  partySize: number;
  businessName: string;
  eventTitle?: string;
  reservationTime: string;
  location?: string;
  userEmail: string;
  userName: string;
  confirmationCode: string;
  qrCodeToken?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {

    // Auth guard: only service_role or internal calls allowed
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader || !serviceKey || authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoHoursStart = new Date(twoHoursFromNow.getTime() - 15 * 60 * 1000);
    const twoHoursEnd = new Date(twoHoursFromNow.getTime() + 15 * 60 * 1000);

    const remindersToSend: ReservationReminder[] = [];

    // 1. Get event-based reservations with events starting in ~2 hours
    const { data: eventReservations } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        reservation_name,
        party_size,
        confirmation_code,
        qr_code_token,
        events!inner(
          id,
          title,
          start_at,
          location,
          businesses(name, address)
        )
      `)
      .eq('status', 'accepted')
      .gte('events.start_at', twoHoursStart.toISOString())
      .lte('events.start_at', twoHoursEnd.toISOString());

    // 2. Get direct business reservations with preferred_time in ~2 hours
    const { data: directReservations } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        reservation_name,
        party_size,
        confirmation_code,
        qr_code_token,
        preferred_time,
        reservation_date,
        businesses!inner(id, name, address)
      `)
      .eq('status', 'accepted')
      .is('event_id', null)
      .not('business_id', 'is', null);

    // Collect user IDs
    const allUserIds = new Set<string>();
    eventReservations?.forEach((r: any) => allUserIds.add(r.user_id));
    
    // Filter direct reservations by time (need to parse time from preferred_time or reservation_date)
    const filteredDirectReservations = directReservations?.filter((r: any) => {
      // Combine reservation_date with preferred_time if available
      if (r.reservation_date) {
        const resDate = new Date(r.reservation_date);
        if (r.preferred_time) {
          const [hours, minutes] = r.preferred_time.split(':');
          resDate.setHours(parseInt(hours), parseInt(minutes));
        }
        return resDate >= twoHoursStart && resDate <= twoHoursEnd;
      }
      return false;
    }) || [];

    filteredDirectReservations.forEach((r: any) => allUserIds.add(r.user_id));

    if (allUserIds.size === 0) {
      logStep("No reservations to remind");
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profiles and preferences
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, name')
      .in('id', Array.from(allUserIds));

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('user_id, notification_reservations, email_notifications_enabled')
      .in('user_id', Array.from(allUserIds));

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const prefMap = new Map(prefs?.map(p => [p.user_id, p]) || []);

    // Process event reservations
    eventReservations?.forEach((r: any) => {
      const pref = prefMap.get(r.user_id);
      if (!pref?.notification_reservations || !pref?.email_notifications_enabled) return;

      const profile = profileMap.get(r.user_id);
      if (!profile?.email) return;

      remindersToSend.push({
        userId: r.user_id,
        reservationId: r.id,
        reservationName: r.reservation_name,
        partySize: r.party_size,
        businessName: r.events.businesses?.name || 'Επιχείρηση',
        eventTitle: r.events.title,
        reservationTime: r.events.start_at,
        location: r.events.location || r.events.businesses?.address,
        userEmail: profile.email,
        userName: profile.first_name || profile.name || 'User',
        confirmationCode: r.confirmation_code,
        qrCodeToken: r.qr_code_token,
      });
    });

    // Process direct reservations
    filteredDirectReservations.forEach((r: any) => {
      const pref = prefMap.get(r.user_id);
      if (!pref?.notification_reservations || !pref?.email_notifications_enabled) return;

      const profile = profileMap.get(r.user_id);
      if (!profile?.email) return;

      let resTime = r.reservation_date;
      if (r.preferred_time) {
        const resDate = new Date(r.reservation_date);
        const [hours, minutes] = r.preferred_time.split(':');
        resDate.setHours(parseInt(hours), parseInt(minutes));
        resTime = resDate.toISOString();
      }

      remindersToSend.push({
        userId: r.user_id,
        reservationId: r.id,
        reservationName: r.reservation_name,
        partySize: r.party_size,
        businessName: r.businesses?.name || 'Επιχείρηση',
        reservationTime: resTime,
        location: r.businesses?.address,
        userEmail: profile.email,
        userName: profile.first_name || profile.name || 'User',
        confirmationCode: r.confirmation_code,
        qrCodeToken: r.qr_code_token,
      });
    });

    // Check notification_log for duplicates
    const { data: existingLogs } = await supabase
      .from('notification_log')
      .select('user_id, reference_id')
      .eq('notification_type', 'reservation_reminder_2h')
      .in('reference_id', remindersToSend.map(r => r.reservationId));

    const loggedSet = new Set(existingLogs?.map(l => `${l.user_id}-${l.reference_id}`) || []);

    let sentCount = 0;

    for (const reminder of remindersToSend) {
      const logKey = `${reminder.userId}-${reminder.reservationId}`;
      if (loggedSet.has(logKey)) continue;

      try {
        // Reminders: in-app + push only (no email per spec)

        // Create in-app notification
        await supabase.from('notifications').insert({
          user_id: reminder.userId,
 title: 'Υπενθύμιση Κράτησης',
          message: `Η κράτησή σου στο ${reminder.businessName} είναι σε 2 ώρες!`,
          type: 'info',
          event_type: 'reservation_reminder',
          entity_type: 'reservation',
          entity_id: reminder.reservationId,
          deep_link: '/dashboard-user/reservations',
          read: false,
        });

        // Send push notification (using encrypted push for iOS/Safari)
        const pushResult = await sendEncryptedPush(reminder.userId, {
 title: 'Υπενθύμιση Κράτησης',
          body: `Η κράτησή σου στο ${reminder.businessName} είναι σε 2 ώρες!`,
          tag: `reservation-reminder-${reminder.reservationId}`,
          data: { url: '/dashboard-user/reservations' },
        }, supabase);
        logStep('Push notification sent', { reservationId: reminder.reservationId, ...pushResult });

        // Log to prevent duplicates
        await supabase.from('notification_log').insert({
          user_id: reminder.userId,
          notification_type: 'reservation_reminder_2h',
          reference_id: reminder.reservationId,
          reference_type: 'reservation',
        });

        sentCount++;
      } catch (err) {
        logStep('Error sending reminder', { reservationId: reminder.reservationId, error: String(err) });
      }
    }

    logStep(`Sent ${sentCount} reservation reminders`);

    return new Response(JSON.stringify({ success: true, sent: sentCount, checked: remindersToSend.length }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep('ERROR', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }
});
