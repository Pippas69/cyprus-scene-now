// Unified edge function to send notifications to users (in-app + push + email)
// Used by other functions and frontend to trigger notifications
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendEncryptedPush, PushPayload } from "../_shared/web-push-crypto.ts";
import { buildNotificationKey, markAsSent, wasAlreadySent } from "../_shared/notification-idempotency.ts";
import { getEmailForUserId } from "../_shared/user-email.ts";


const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-USER-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

// Transactional confirmations must ALWAYS send (bypass preference toggles).
// Note: actual push delivery still depends on having a valid subscription.
const ESSENTIAL_EVENT_TYPES = new Set<string>([
  // Reservations
  'reservation_confirmed',
  'reservation_pending',
  'reservation_declined',
  'reservation_cancelled',

  // Tickets
  'ticket_purchased',
  'ticket_sale',
  'ticket_checked_in',

  // Offers
  'offer_claimed',
  'offer_purchased',
  'offer_redeemed',

  // Student
  'student_discount_redeemed',
]);

function isEssentialEventType(eventType: string): boolean {
  return ESSENTIAL_EVENT_TYPES.has(eventType);
}

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

    const essential = isEssentialEventType(data.eventType);

    // Idempotency: avoid duplicate push/email/in-app for the same logical event.
    // If entityId is missing, we include a stable "extra" derived from title+message.
    const extra = !data.entityId ? `${data.title}::${data.message}`.slice(0, 160) : null;
    const unifiedKey = buildNotificationKey({
      channel: "inapp",
      eventType: data.eventType,
      recipientUserId: data.userId,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      extra,
    });

    const already = await wasAlreadySent(supabase, data.userId, unifiedKey);
    if (already) {
      logStep("Skipping duplicate unified notification", { unifiedKey });
      return new Response(JSON.stringify({ success: true, skippedDuplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // 2. Send push notification
    // For essential confirmations, bypass the user preference flag.
    if (!data.skipPush && (essential || prefs?.notification_push_enabled !== false)) {
      const payload: PushPayload = {
        title: data.title,
        body: data.message,
        icon: '/fomo-logo-new.png',
        badge: '/fomo-logo-new.png',
        tag: `${data.eventType}-${data.entityId || Date.now()}`,
        data: {
          url: data.deepLink || '/',
          type: data.eventType,
          entityType: data.entityType,
          entityId: data.entityId,
        },
      };

      results.push = await sendEncryptedPush(data.userId, payload, supabase);
      logStep('Push notifications sent', results.push);
    }

    // 3. Send email
    // For essential confirmations, bypass the user preference flag.
    if (!data.skipEmail && data.emailSubject && data.emailHtml && (essential || prefs?.email_notifications_enabled !== false)) {
      const userEmail = await getEmailForUserId(supabase, data.userId);

      if (userEmail) {
        try {
          await resend.emails.send({
            from: "ΦΟΜΟ <notifications@fomo.com.cy>",
            to: [userEmail],
            subject: data.emailSubject,
            html: data.emailHtml,
          });
          results.email = true;
        } catch (err) {
          logStep('Email send error', String(err));
        }
      } else {
        logStep('Email skipped (no email found for user)', { userId: data.userId });
      }
    }

    // Mark idempotency AFTER attempting to send (best effort)
    try {
      await markAsSent(supabase, data.userId, unifiedKey, data.entityType ?? null, data.entityId ?? null);
    } catch (e) {
      logStep('Failed to mark notification idempotency (non-fatal)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    logStep("Notification sent", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
