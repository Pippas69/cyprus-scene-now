import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-RESERVATION-REMINDERS] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Reservation reminders cron started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    // 2 hours from now
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoHoursMinusFiveMin = new Date(twoHoursFromNow.getTime() - 5 * 60 * 1000);

    logStep("Looking for reservations scheduled in ~2 hours");

    // Find all business reservations (direct reservations) in the next 2 hours
    const { data: reservationsToRemind, error: reservError } = await supabase
      .from("business_reservations")
      .select("id, user_id, business_id, reserved_at, businesses(name, user_id)")
      .gte("reserved_at", twoHoursMinusFiveMin.toISOString())
      .lte("reserved_at", twoHoursFromNow.toISOString())
      .eq("status", "confirmed");

    if (reservError) {
      throw new Error(`Failed to fetch reservations: ${reservError.message}`);
    }

    logStep("Found reservations to remind", { count: (reservationsToRemind || []).length });

    let remindersSent = 0;

    for (const reservation of reservationsToRemind || []) {
      // Check idempotency
      const idempotencyKey = `reservation_reminder:${reservation.id}:${reservation.user_id}`;
      const { data: sentCheck } = await supabase
        .from("notification_idempotency")
        .select("id")
        .eq("unique_key", idempotencyKey)
        .single();

      if (!sentCheck) {
        const businessData = (reservation as any).businesses;
        const businessName = businessData?.name || "Το εστιατόριο";

        // Send reminder
        await supabase.functions.invoke("send-user-notification", {
          body: {
            userId: reservation.user_id,
            title: `Υπενθύμιση κράτησης στο ${businessName}`,
            message: `Η κράτησή σου ξεκινά σε 2 ώρες`,
            eventType: "reservation_reminder_2h",
            entityType: "reservation",
            entityId: reservation.id,
            deepLink: `/reservations/${reservation.id}`,
            skipEmail: true,
            skipInApp: false,
          },
        });

        await supabase
          .from("notification_idempotency")
          .insert({
            unique_key: idempotencyKey,
            user_id: reservation.user_id,
            event_type: "reservation_reminder_2h",
            entity_type: "reservation",
            entity_id: reservation.id,
          });

        remindersSent++;
      }
    }

    logStep("Reservation reminders cron completed", { remindersSent });

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
