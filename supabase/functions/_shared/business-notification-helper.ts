// Business Notification Helper - Unified notification system for businesses
// Supports: Email + Push + In-App with idempotency and audit logging

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendEncryptedPush, PushPayload } from "./web-push-crypto.ts";
import { getEmailForUserId } from "./user-email.ts";


const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Notification types for businesses
export type BusinessNotificationType = 
  | 'NEW_RESERVATION'
  | 'NEW_RESERVATION_EVENT'
  | 'NEW_RESERVATION_OFFER'
  | 'NEW_RESERVATION_PROFILE'
  | 'TICKET_SALE'
  | 'OFFER_REDEEMED'
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_NO_SHOW'
  | 'RESERVATION_CHECK_IN'
  | 'LOW_INVENTORY'
  | 'SOLD_OUT'
  | 'EVENT_CREATED'
  | 'OFFER_CREATED'
  | 'BOOST_ACTIVATED'
  | 'BOOST_STARTED'
  | 'BOOST_ENDED'
  | 'PLAN_CHANGED'
  | 'NEW_FOLLOWER'
  | 'RSVP_UPDATE'
  | 'WEEKLY_DIGEST';

export interface BusinessNotificationData {
  businessId: string;
  businessUserId: string; // The user_id of the business owner
  type: BusinessNotificationType;
  title: string;
  message: string;
  
  // For idempotency
  objectType?: string; // RESERVATION, TICKET, OFFER, EVENT, etc.
  objectId?: string;
  
  // Email content (optional - for email-enabled notifications)
  emailSubject?: string;
  emailHtml?: string;
  
  // Deep link for in-app notification
  deepLink?: string;
  
  // Additional metadata
  payload?: Record<string, unknown>;
  
  // Skip channels
  skipEmail?: boolean;
  skipPush?: boolean;
  skipInApp?: boolean;
}

export interface BusinessNotificationResult {
  success: boolean;
  inApp: boolean;
  push: { sent: number; failed: number };
  email: boolean;
  skippedDuplicate?: boolean;
  idempotencyKey?: string;
}

const logStep = (step: string, details?: unknown) => {
  console.log(`[BUSINESS-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

// Create Supabase client with service role
function getSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

// Generate deterministic idempotency key
function generateIdempotencyKey(data: BusinessNotificationData): string {
  const parts = [
    data.type,
    data.businessId,
    data.objectType || 'none',
    data.objectId || 'none',
    // For inventory alerts, include the threshold in the key
    data.payload?.threshold || '',
  ].filter(Boolean);
  return parts.join(':');
}

// Check if notification was already sent (idempotency check)
async function checkIdempotency(
  supabase: SupabaseClient,
  idempotencyKey: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('notification_type', idempotencyKey)
    .maybeSingle();
  
  return !!data;
}

// Log notification for idempotency and audit
async function logNotification(
  supabase: SupabaseClient,
  userId: string,
  idempotencyKey: string,
  referenceType?: string,
  referenceId?: string
): Promise<void> {
  await supabase.from('notification_log').insert({
    user_id: userId,
    notification_type: idempotencyKey,
    reference_type: referenceType,
    reference_id: referenceId,
    sent_at: new Date().toISOString(),
  });
}

// Get user's email (profiles.email first; fallback to auth user email)
async function getBusinessOwnerEmail(supabase: SupabaseClient, userId: string): Promise<string | null> {
  return getEmailForUserId(supabase, userId);
}


// Get user's business notification preferences
async function getBusinessNotificationPreferences(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

// Check if this notification type is enabled for the user
function isNotificationEnabled(prefs: Record<string, unknown> | null, type: BusinessNotificationType): boolean {
  if (!prefs) return true; // Default to enabled
  
  // Essential notifications are always enabled
  const essentialTypes: BusinessNotificationType[] = [
    'NEW_RESERVATION', 'NEW_RESERVATION_EVENT', 'NEW_RESERVATION_OFFER', 
    'NEW_RESERVATION_PROFILE', 'TICKET_SALE', 'OFFER_REDEEMED'
  ];
  
  if (essentialTypes.includes(type)) {
    return true; // Always enabled
  }
  
  // Optional notification mappings
  const optionalMap: Partial<Record<BusinessNotificationType, string>> = {
    'RESERVATION_CANCELLED': 'notification_reservation_cancelled',
    'RESERVATION_NO_SHOW': 'notification_reservation_cancelled', // Same toggle
    'RESERVATION_CHECK_IN': 'notification_reservation_cancelled', // Same toggle
    'LOW_INVENTORY': 'notification_almost_sold_out',
    'SOLD_OUT': 'notification_sold_out',
    'EVENT_CREATED': 'notification_creation_success',
    'OFFER_CREATED': 'notification_creation_success',
    'BOOST_ACTIVATED': 'notification_boost_success',
    'BOOST_STARTED': 'notification_boost_success',
    'BOOST_ENDED': 'notification_boost_success',
    'PLAN_CHANGED': 'notification_plan_change',
    'NEW_FOLLOWER': 'notification_new_follower',
    'RSVP_UPDATE': 'notification_rsvp_updates',
    'WEEKLY_DIGEST': 'notification_weekly_summary',
  };
  
  const prefKey = optionalMap[type];
  if (prefKey && prefs[prefKey] === false) {
    return false;
  }
  
  return true;
}

// Create in-app notification for business owner
async function createInAppNotification(
  supabase: SupabaseClient,
  data: BusinessNotificationData
): Promise<boolean> {
  const { error } = await supabase.from('notifications').insert({
    user_id: data.businessUserId,
    title: data.title,
    message: data.message,
    type: 'business',
    event_type: data.type,
    entity_type: data.objectType || null,
    entity_id: data.objectId || null,
    deep_link: data.deepLink || '/dashboard-business',
    read: false,
    delivered_at: new Date().toISOString(),
  });

  if (error) {
    logStep('Error creating in-app notification', error);
    return false;
  }
  return true;
}

// Send push notification to business owner using encrypted Web Push (iOS/Safari compatible)
async function sendPushNotification(
  supabase: SupabaseClient,
  data: BusinessNotificationData
): Promise<{ sent: number; failed: number }> {
  // Build push payload
  const extra = !data.objectId ? `${data.title}::${data.message}`.slice(0, 64) : null;
  const payload: PushPayload = {
    title: data.title,
    body: data.message,
    icon: "/fomo-logo-new.png",
    badge: "/fomo-logo-new.png",
    // Deterministic tag so retries/callers don't create duplicates
    tag: `biz:${data.type}:${data.objectType || 'none'}:${data.objectId || extra || 'none'}`.slice(0, 120),
    data: {
      url: data.deepLink || "/dashboard-business",
      type: data.type,
      businessId: data.businessId,
      objectType: data.objectType,
      objectId: data.objectId,
    },
  };

  // Use encrypted push (iOS/Safari compatible)
  return sendEncryptedPush(data.businessUserId, payload, supabase);
}

// Send email to business owner
async function sendEmailNotification(
  email: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: "ΦΟΜΟ <notifications@fomo.com.cy>",
      to: [email],
      subject,
      html,
    });
    return true;
  } catch (err) {
    logStep('Email send error', String(err));
    return false;
  }
}

// Main unified business notification sender
export async function sendBusinessNotification(
  data: BusinessNotificationData
): Promise<BusinessNotificationResult> {
  const supabase = getSupabaseClient();
  const result: BusinessNotificationResult = {
    success: false,
    inApp: false,
    push: { sent: 0, failed: 0 },
    email: false,
  };

  try {
    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey(data);
    result.idempotencyKey = idempotencyKey;
    
    // Check for duplicate
    const alreadySent = await checkIdempotency(supabase, idempotencyKey, data.businessUserId);
    if (alreadySent) {
      logStep('Skipping duplicate notification', { idempotencyKey });
      result.skippedDuplicate = true;
      result.success = true;
      return result;
    }

    // Get user preferences
    const prefs = await getBusinessNotificationPreferences(supabase, data.businessUserId);
    
    // Check if this notification type is enabled
    if (!isNotificationEnabled(prefs, data.type)) {
      logStep('Notification type disabled by user preferences', { type: data.type });
      result.success = true;
      return result;
    }

    // 1. Always create in-app notification (source of truth for business inbox)
    if (!data.skipInApp) {
      result.inApp = await createInAppNotification(supabase, data);
      logStep('In-app notification created', { success: result.inApp });
    }

    // 2. Send push notification if enabled
    // Essential business confirmations must ALWAYS send (bypass preference toggles).
    const essentialBusinessTypes: BusinessNotificationType[] = [
      'NEW_RESERVATION',
      'NEW_RESERVATION_EVENT',
      'NEW_RESERVATION_OFFER',
      'NEW_RESERVATION_PROFILE',
      'TICKET_SALE',
      'OFFER_REDEEMED',
      'RESERVATION_CHECK_IN',
    ];

    if (!data.skipPush && (essentialBusinessTypes.includes(data.type) || prefs?.notification_push_enabled !== false)) {
      result.push = await sendPushNotification(supabase, data);
      logStep('Push notifications sent', result.push);
    }

    // 3. Send email if provided
    if (!data.skipEmail && data.emailSubject && data.emailHtml) {
      const email = await getBusinessOwnerEmail(supabase, data.businessUserId);
      if (email) {
        result.email = await sendEmailNotification(email, data.emailSubject, data.emailHtml);
        logStep('Email sent', { success: result.email });
      }
    }

    // Log for idempotency
    await logNotification(
      supabase,
      data.businessUserId,
      idempotencyKey,
      data.objectType,
      data.objectId
    );

    result.success = true;
    return result;
  } catch (err) {
    logStep('Error in sendBusinessNotification', String(err));
    return result;
  }
}

// Branded email template parts for business notifications
export const businessEmailHeader = `
  <div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 48px 24px 36px 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Business Dashboard</p>
  </div>
`;

export const businessEmailFooter = `
  <div style="background: #102b4a; padding: 28px; text-align: center; border-radius: 0 0 12px 12px;">
    <p style="color: #3ec3b7; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px 0; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</p>
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 ΦΟΜΟ. Empowering Cyprus businesses.</p>
  </div>
`;

export function wrapBusinessEmailContent(content: string): string {
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
        ${businessEmailHeader}
        <div style="padding: 32px 24px;">
          ${content}
        </div>
        ${businessEmailFooter}
      </div>
    </body>
    </html>
  `;
}
