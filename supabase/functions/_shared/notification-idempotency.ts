// Shared idempotency helper for notifications (push/email/in-app)
// Uses public.notification_log as the source of truth.

import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type NotificationChannel = "push" | "email" | "inapp";

export function buildNotificationKey(params: {
  channel: NotificationChannel;
  eventType: string;
  recipientUserId: string;
  entityType?: string | null;
  entityId?: string | null;
  extra?: string | null;
}): string {
  const parts = [
    params.channel,
    params.eventType,
    params.recipientUserId,
    params.entityType ?? "none",
    params.entityId ?? "none",
    params.extra ?? "",
  ].filter(Boolean);

  return parts.join(":");
}

export async function wasAlreadySent(
  supabase: SupabaseClient,
  recipientUserId: string,
  notificationKey: string
): Promise<boolean> {
  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("user_id", recipientUserId)
    .eq("notification_type", notificationKey)
    .maybeSingle();

  return !!data;
}

export async function markAsSent(
  supabase: SupabaseClient,
  recipientUserId: string,
  notificationKey: string,
  referenceType?: string | null,
  referenceId?: string | null
): Promise<void> {
  await supabase.from("notification_log").insert({
    user_id: recipientUserId,
    notification_type: notificationKey,
    reference_type: referenceType ?? null,
    reference_id: referenceId ?? null,
    sent_at: new Date().toISOString(),
  });
}
