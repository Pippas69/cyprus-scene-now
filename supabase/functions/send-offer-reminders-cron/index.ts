import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-OFFER-REMINDERS] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Offer reminders cron started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    // 2 hours from now
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoHoursMinusFiveMin = new Date(twoHoursFromNow.getTime() - 5 * 60 * 1000);

    logStep("Looking for offers expiring in ~2 hours");

    // Find all offers expiring in ~2 hours
    const { data: offersToRemind, error: offersError } = await supabase
      .from("discounts")
      .select("id, title, end_at")
      .gte("end_at", twoHoursMinusFiveMin.toISOString())
      .lte("end_at", twoHoursFromNow.toISOString())
      .eq("active", true);

    if (offersError) {
      throw new Error(`Failed to fetch offers: ${offersError.message}`);
    }

    logStep("Found offers to remind", { count: (offersToRemind || []).length });

    let remindersSent = 0;

    for (const offer of offersToRemind || []) {
      // Find users who have redeemed this offer (claimed/purchased)
      const { data: offerPurchases } = await supabase
        .from("offer_purchases")
        .select("user_id")
        .eq("discount_id", offer.id)
        .in("status", ["paid", "redeemed"]);

      for (const purchase of offerPurchases || []) {
        // Check idempotency
        const idempotencyKey = `offer_reminder:${offer.id}:${purchase.user_id}`;
        const { data: sentCheck } = await supabase
          .from("notification_idempotency")
          .select("id")
          .eq("unique_key", idempotencyKey)
          .single();

        if (!sentCheck) {
          // Send reminder
          await supabase.functions.invoke("send-user-notification", {
            body: {
              userId: purchase.user_id,
              title: `${offer.title}`,
              message: `Υπενθύμιση: Η προσφορά ληγει σε 2 ώρες`,
              eventType: "offer_reminder_2h",
              entityType: "offer",
              entityId: offer.id,
              deepLink: `/offers/${offer.id}`,
              skipEmail: true,
              skipInApp: false,
            },
          });

          await supabase
            .from("notification_idempotency")
            .insert({
              unique_key: idempotencyKey,
              user_id: purchase.user_id,
              event_type: "offer_reminder_2h",
              entity_type: "offer",
              entity_id: offer.id,
            });

          remindersSent++;
        }
      }
    }

    logStep("Offer reminders cron completed", { remindersSent });

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
