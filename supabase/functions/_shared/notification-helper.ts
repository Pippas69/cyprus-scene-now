// Shared notification helper for sending email + push + in-app notifications together
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendEncryptedPush, isUserPushEnabled, PushPayload } from "./web-push-crypto.ts";
import { getEmailForUserId } from "./user-email.ts";

  userId: string;
  title: string;
  message: string;
  type: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  deepLink?: string;
  emailSubject?: string;
  emailHtml?: string;
  skipEmail?: boolean;
  skipPush?: boolean;
  skipInApp?: boolean;
}

interface SendResult {
  inApp: boolean;
  push: { sent: number; failed: number };
  email: boolean;
}

const logStep = (step: string, details?: unknown) => {
  console.log(`[NOTIFICATION-HELPER] ${step}`, details ? JSON.stringify(details) : '');
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

// Create Supabase client with service role
function getSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

// Get user's email (profiles.email first; fallback to auth user email)
async function getUserEmail(supabase: SupabaseClient, userId: string): Promise<string | null> {
  return getEmailForUserId(supabase, userId);
}


// Check user's notification preferences
async function getUserPreferences(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

// Create in-app notification
async function createInAppNotification(
  supabase: SupabaseClient,
  data: NotificationData
): Promise<boolean> {
  const { error } = await supabase.from('notifications').insert({
    user_id: data.userId,
    title: data.title,
    message: data.message,
    type: data.type,
    event_type: data.eventType,
    entity_type: data.entityType || null,
    entity_id: data.entityId || null,
    deep_link: data.deepLink || null,
    read: false,
    delivered_at: new Date().toISOString(),
  });

  if (error) {
    logStep('Error creating in-app notification', error);
    return false;
  }
  return true;
}

// Send push notification using encrypted Web Push (iOS/Safari compatible)
async function sendPushNotification(
  supabase: SupabaseClient,
  data: NotificationData
): Promise<{ sent: number; failed: number }> {
  // Check if user has push enabled
  const enabled = await isUserPushEnabled(data.userId, supabase);
  if (!enabled) {
    logStep('Push disabled for user', { userId: data.userId });
    return { sent: 0, failed: 0 };
  }

  // Build push payload
  const extra = !data.entityId ? `${data.title}::${data.message}`.slice(0, 64) : null;
  const payload: PushPayload = {
    title: data.title,
    body: data.message,
    icon: "/fomo-logo-new.png",
    badge: "/fomo-logo-new.png",
    // Deterministic tag so retries/callers don't create duplicates
    tag: `n:${data.eventType}:${data.entityType || 'none'}:${data.entityId || extra || 'none'}`.slice(0, 120),
    data: {
      url: data.deepLink || "/",
      type: data.eventType,
      entityType: data.entityType,
      entityId: data.entityId,
    },
  };

  // Use encrypted push (iOS/Safari compatible)
  return sendEncryptedPush(data.userId, payload, supabase);
}

// Send email notification
async function sendEmailNotification(
  userEmail: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: "ΦΟΜΟ <support@fomo.com.cy>",
      to: [userEmail],
      subject,
      html,
    });
    return true;
  } catch (err) {
    logStep('Email send error', String(err));
    return false;
  }
}

// Main unified notification sender
export async function sendUnifiedNotification(data: NotificationData): Promise<SendResult> {
  const supabase = getSupabaseClient();
  const result: SendResult = { inApp: false, push: { sent: 0, failed: 0 }, email: false };

  try {
    // Get user preferences
    const prefs = await getUserPreferences(supabase, data.userId);
    const essential = isEssentialEventType(data.eventType);

    // 1. Always create in-app notification (source of truth)
    if (!data.skipInApp) {
      result.inApp = await createInAppNotification(supabase, data);
      logStep('In-app notification created', { success: result.inApp });
    }

    // 2. Send push notification
    // For essential confirmations, we bypass the user preference flag.
    if (!data.skipPush && (essential || prefs?.notification_push_enabled !== false)) {
      result.push = await sendPushNotification(supabase, data);
      logStep('Push notifications sent', result.push);
    }

    // 3. Send email
    // For essential confirmations, we bypass the user preference flag.
    if (!data.skipEmail && data.emailSubject && data.emailHtml && (essential || prefs?.email_notifications_enabled !== false)) {
      const userEmail = await getUserEmail(supabase, data.userId);
      if (userEmail) {
        result.email = await sendEmailNotification(userEmail, data.emailSubject, data.emailHtml);
        logStep('Email sent', { success: result.email });
      }
    }

    return result;
  } catch (err) {
    logStep('Error in sendUnifiedNotification', String(err));
    return result;
  }
}

// Quick notification sender (just in-app + push, no email)
export async function sendQuickNotification(
  userId: string,
  title: string,
  message: string,
  eventType: string,
  deepLink?: string,
  entityType?: string,
  entityId?: string
): Promise<SendResult> {
  return sendUnifiedNotification({
    userId,
    title,
    message,
    type: eventType.includes('error') ? 'error' : eventType.includes('warn') ? 'warning' : 'info',
    eventType,
    deepLink,
    entityType,
    entityId,
    skipEmail: true,
  });
}

export const emailHeader = `
  <div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 48px 24px 36px 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Cyprus Events</p>
  </div>
`;

export const emailFooter = `
  <div style="background: #102b4a; padding: 28px; text-align: center; border-radius: 0 0 12px 12px;">
    <p style="color: #3ec3b7; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px 0; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</p>
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 ΦΟΜΟ. Discover events in Cyprus.</p>
  </div>
`;

export function wrapEmailContent(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap" rel="stylesheet">
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
}
