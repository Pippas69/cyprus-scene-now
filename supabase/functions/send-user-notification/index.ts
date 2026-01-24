// Unified edge function to send notifications to users (in-app + push + email)
// Used by other functions and frontend to trigger notifications
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-USER-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

interface NotificationRequest {
  userId: string;
  title: string;
  message: string;
  eventType: string; // e.g., 'reservation_confirmed', 'ticket_purchased', 'offer_claimed'
  entityType?: string; // e.g., 'reservation', 'ticket', 'offer'
  entityId?: string;
  deepLink?: string;
  emailSubject?: string;
  emailHtml?: string;
  skipEmail?: boolean;
  skipPush?: boolean;
  skipInApp?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const data: NotificationRequest = await req.json();
    logStep("Request data", { userId: data.userId, eventType: data.eventType });

    if (!data.userId || !data.title || !data.message || !data.eventType) {
      throw new Error("Missing required fields: userId, title, message, eventType");
    }

    // Get user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('email_notifications_enabled, notification_push_enabled')
      .eq('user_id', data.userId)
      .single();

    const results = {
      inApp: false,
      push: { sent: 0, failed: 0 },
      email: false,
    };

    // 1. Create in-app notification (always, unless explicitly skipped)
    if (!data.skipInApp) {
      const { error } = await supabase.from('notifications').insert({
        user_id: data.userId,
        title: data.title,
        message: data.message,
        type: data.eventType.includes('error') ? 'error' : data.eventType.includes('warn') ? 'warning' : 'info',
        event_type: data.eventType,
        entity_type: data.entityType || null,
        entity_id: data.entityId || null,
        deep_link: data.deepLink || null,
        read: false,
        delivered_at: new Date().toISOString(),
      });

      results.inApp = !error;
      if (error) {
        logStep('Error creating in-app notification', error);
      }
    }

    // 2. Send push notification if enabled
    if (!data.skipPush && prefs?.notification_push_enabled !== false) {
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', data.userId);

      if (subscriptions && subscriptions.length > 0) {
        const vapidKey = Deno.env.get("VAPID_PUBLIC_KEY");
        
        if (vapidKey) {
          const payload = JSON.stringify({
            title: data.title,
            body: data.message,
            icon: '/fomo-logo-new.png',
            badge: '/fomo-logo-new.png',
            data: {
              url: data.deepLink || '/',
              type: data.eventType,
              entityType: data.entityType,
              entityId: data.entityId,
            },
          });

          for (const sub of subscriptions) {
            try {
              const response = await fetch(sub.endpoint, {
                method: 'POST',
                headers: {
                  'TTL': '86400',
                  'Content-Type': 'application/json',
                  'Authorization': `vapid t=${vapidKey}, k=${vapidKey}`,
                },
                body: payload,
              });

              if (!response.ok) {
                if (response.status === 404 || response.status === 410) {
                  await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
                results.push.failed++;
              } else {
                results.push.sent++;
              }
            } catch {
              results.push.failed++;
            }
          }
        }
      }
    }

    // 3. Send email if provided and enabled
    if (!data.skipEmail && data.emailSubject && data.emailHtml && prefs?.email_notifications_enabled !== false) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', data.userId)
        .single();

      if (profile?.email) {
        try {
          await resend.emails.send({
            from: "ΦΟΜΟ <notifications@fomo.cy>",
            to: [profile.email],
            subject: data.emailSubject,
            html: data.emailHtml,
          });
          results.email = true;
        } catch (err) {
          logStep('Email send error', String(err));
        }
      }
    }

    logStep("Notification sent", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep('ERROR', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
