import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-EVENT-REMINDERS] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Event reminders cron started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    // 2 hours from now (in UTC, we'll check server-side)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoHoursMinusFiveMin = new Date(twoHoursFromNow.getTime() - 5 * 60 * 1000);

    logStep("Looking for events between", {
      now: now.toISOString(),
      twoHoursMinusFiveMin: twoHoursMinusFiveMin.toISOString(),
      twoHoursFromNow: twoHoursFromNow.toISOString(),
    });

    // Find all events starting in ~2 hours
    const { data: eventsToRemind, error: eventsError } = await supabase
      .from("events")
      .select("id, title, start_at")
      .gte("start_at", twoHoursMinusFiveMin.toISOString())
      .lte("start_at", twoHoursFromNow.toISOString());

    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }

    logStep("Found events to remind", { count: (eventsToRemind || []).length });

    let remindersSent = 0;

    for (const event of eventsToRemind || []) {
      logStep(`Processing event: ${event.title}`);

      // 1. Find users with reservations for this event
      const { data: reservations } = await supabase
        .from("event_reservations")
        .select("user_id")
        .eq("event_id", event.id)
        .eq("status", "confirmed");

      for (const reservation of reservations || []) {
        // Check idempotency
        const idempotencyKey = `event_reminder:${event.id}:${reservation.user_id}:reservation`;
        const { data: sentCheck } = await supabase
          .from("notification_idempotency")
          .select("id")
          .eq("unique_key", idempotencyKey)
          .single();

        if (!sentCheck) {
          // Send reminder
          await supabase.functions.invoke("send-user-notification", {
            body: {
              userId: reservation.user_id,
              title: `${event.title}`,
              message: `Υπενθύμιση: Η εκδήλωση ξεκινά σε 2 ώρες`,
              eventType: "event_reminder_2h",
              entityType: "event",
              entityId: event.id,
              deepLink: `/events/${event.id}`,
              skipEmail: true,
              skipInApp: false,
            },
          });

          await supabase
            .from("notification_idempotency")
            .insert({
              unique_key: idempotencyKey,
              user_id: reservation.user_id,
              event_type: "event_reminder_2h",
              entity_type: "event",
              entity_id: event.id,
            });

          remindersSent++;
        }
      }

      // 2. Find users with tickets for this event
      const { data: ticketPurchases } = await supabase
        .from("ticket_purchases")
        .select("user_id")
        .eq("event_id", event.id)
        .eq("status", "paid");

      for (const ticket of ticketPurchases || []) {
        const idempotencyKey = `event_reminder:${event.id}:${ticket.user_id}:ticket`;
        const { data: sentCheck } = await supabase
          .from("notification_idempotency")
          .select("id")
          .eq("unique_key", idempotencyKey)
          .single();

        if (!sentCheck) {
          await supabase.functions.invoke("send-user-notification", {
            body: {
              userId: ticket.user_id,
              title: `${event.title}`,
              message: `Υπενθύμιση: Το εισιτήριό σου για αυτή την εκδήλωση ξεκινά σε 2 ώρες`,
              eventType: "event_reminder_2h",
              entityType: "event",
              entityId: event.id,
              deepLink: `/events/${event.id}`,
              skipEmail: true,
              skipInApp: false,
            },
          });

          await supabase
            .from("notification_idempotency")
            .insert({
              unique_key: idempotencyKey,
              user_id: ticket.user_id,
              event_type: "event_reminder_2h",
              entity_type: "event",
              entity_id: event.id,
            });

          remindersSent++;
        }
      }

      // 3. Find users with RSVP (interested or going) for this event
      const { data: rsvpUsers } = await supabase
        .from("event_rsvps")
        .select("user_id")
        .eq("event_id", event.id)
        .in("status", ["interested", "going"]);

      for (const rsvp of rsvpUsers || []) {
        const idempotencyKey = `event_reminder:${event.id}:${rsvp.user_id}:rsvp`;
        const { data: sentCheck } = await supabase
          .from("notification_idempotency")
          .select("id")
          .eq("unique_key", idempotencyKey)
          .single();

        if (!sentCheck) {
          await supabase.functions.invoke("send-user-notification", {
            body: {
              userId: rsvp.user_id,
              title: `${event.title}`,
              message: `Υπενθύμιση: Η εκδήλωση ξεκινά σε 2 ώρες`,
              eventType: "event_reminder_2h",
              entityType: "event",
              entityId: event.id,
              deepLink: `/events/${event.id}`,
              skipEmail: true,
              skipInApp: false,
            },
          });

          await supabase
            .from("notification_idempotency")
            .insert({
              unique_key: idempotencyKey,
              user_id: rsvp.user_id,
              event_type: "event_reminder_2h",
              entity_type: "event",
              entity_id: event.id,
            });

          remindersSent++;
        }
      }
    }

    logStep("Event reminders cron completed", { remindersSent });

    return new Response(
      JSON.stringify({ success: true, remindersSent }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
