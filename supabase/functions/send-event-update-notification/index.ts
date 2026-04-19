// Send Event Update Notification - Notifies users when an event is cancelled or rescheduled
// Called from frontend when business updates event status

import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-EVENT-UPDATE-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

interface EventUpdateRequest {
  eventId: string;
  updateType: 'cancelled' | 'rescheduled';
  newStartAt?: string; // For rescheduled events
  reason?: string;
}

const BodySchema = z.object({
  eventId: flexId,
  updateType: safeString(50),
  newStartAt: dateString.optional(),
  reason: optionalString(1000),
});

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { eventId, updateType, newStartAt, reason } = await parseBody(req, BodySchema);
    logStep("Request data", { eventId, updateType, newStartAt });

    if (!eventId || !updateType) {
      throw new Error("Missing required fields: eventId, updateType");
    }

    // Fetch event with business info
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        start_at,
        location,
        venue_name,
        business_id,
        businesses!inner(name, logo_url)
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    const businessName = (event.businesses as any)?.name || 'The organizer';
    const isCancelled = updateType === 'cancelled';

    // Collect all users to notify (unique)
    const usersToNotify = new Set<string>();

    // 1. Get ticket holders
    const { data: ticketOrders } = await supabase
      .from('ticket_orders')
      .select('user_id, customer_email, customer_name')
      .eq('event_id', eventId)
      .eq('status', 'completed');

    for (const order of ticketOrders || []) {
      if (order.user_id) usersToNotify.add(order.user_id);
    }
    logStep(`Found ${ticketOrders?.length || 0} ticket orders`);

    // 2. Get RSVP users (going and interested)
    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('user_id')
      .eq('event_id', eventId)
      .in('status', ['going', 'interested']);

    for (const rsvp of rsvps || []) {
      if (rsvp.user_id) usersToNotify.add(rsvp.user_id);
    }
    logStep(`Found ${rsvps?.length || 0} RSVPs`);

    // 3. Get reservation holders
    const { data: reservations } = await supabase
      .from('reservations')
      .select('user_id, reservation_email, reservation_name')
      .eq('event_id', eventId)
      .in('status', ['confirmed', 'pending']);

    for (const res of reservations || []) {
      if (res.user_id) usersToNotify.add(res.user_id);
    }
    logStep(`Found ${reservations?.length || 0} reservations`);

    // Prepare notification content
    const notifTitle = isCancelled 
 ? 'Event ακυρώθηκε' 
 : 'Event αλλαγή ώρας';
    
    let notifMessage = isCancelled
      ? `Το "${event.title}" ακυρώθηκε από ${businessName}.`
      : `Το "${event.title}" έχει νέα ώρα.`;

    if (reason) {
      notifMessage += ` Λόγος: ${reason}`;
    }

    if (!isCancelled && newStartAt) {
      const newDate = new Date(newStartAt).toLocaleDateString('el-GR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Nicosia',
      });
      notifMessage += ` Νέα ημερομηνία: ${newDate}`;
    }

    let notifiedCount = 0;
    let emailsSent = 0;

    // Send notifications to all users
    for (const userId of usersToNotify) {
      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title: notifTitle,
        message: notifMessage,
        type: isCancelled ? 'event_cancelled' : 'event_rescheduled',
        entity_type: 'event',
        entity_id: eventId,
      });

      // Send push notification
      await sendPushIfEnabled(userId, {
        title: notifTitle,
        body: notifMessage,
        tag: `event-update-${eventId}`,
        data: {
          url: `/event/${eventId}`,
          type: isCancelled ? 'event_cancelled' : 'event_rescheduled',
          entityType: 'event',
          entityId: eventId,
        },
      }, supabase);

      notifiedCount++;
    }

    logStep(`Notified ${notifiedCount} users via in-app and push`);

    // Per spec: cancellation/update notifications are in-app + push only (no email)
    const emailsSent = 0;

    logStep("Completed", { notifiedCount, emailsSent });

    return new Response(JSON.stringify({ 
      success: true,
      notifiedCount,
      emailsSent,
    }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
