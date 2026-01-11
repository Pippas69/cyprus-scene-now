import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_RESERVATION_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret");
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  const body = await req.text();

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    // Only process reservation_event type payments
    if (metadata?.type !== "reservation_event") {
      console.log("Not a reservation event payment, skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reservationId = metadata.reservation_id;
    const seatingTypeId = metadata.seating_type_id;

    if (!reservationId) {
      console.error("No reservation_id in metadata");
      return new Response("Missing reservation_id", { status: 400 });
    }

    try {
      // Update reservation to paid and accepted
      const { data: reservation, error: updateError } = await supabaseClient
        .from("reservations")
        .update({
          prepaid_charge_status: "paid",
          status: "accepted",
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", reservationId)
        .select(`
          *,
          events (
            id,
            title,
            start_at,
            location,
            venue_name,
            business_id,
            businesses (
              id,
              name,
              phone
            )
          )
        `)
        .single();

      if (updateError) {
        console.error("Error updating reservation:", updateError);
        throw updateError;
      }

      // Decrement seating slots
      if (seatingTypeId) {
        const { data: decremented, error: decrementError } = await supabaseClient
          .rpc("decrement_seating_slots", { p_seating_type_id: seatingTypeId });

        if (decrementError) {
          console.error("Error decrementing seating slots:", decrementError);
          // Don't fail the webhook, just log the error
        }
      }

      // Get seating type info for the email
      let seatingTypeName = "";
      let dressCode = "";
      if (seatingTypeId) {
        const { data: seatingType } = await supabaseClient
          .from("reservation_seating_types")
          .select("seating_type, dress_code, no_show_policy")
          .eq("id", seatingTypeId)
          .single();

        if (seatingType) {
          const seatingTypeLabels: Record<string, string> = {
            bar: "Bar",
            table: "Table",
            vip: "VIP",
            sofa: "Sofa",
          };
          seatingTypeName = seatingTypeLabels[seatingType.seating_type] || seatingType.seating_type;
          dressCode = seatingType.dress_code || "";
        }
      }

      // Get user email
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email, name")
        .eq("id", reservation.user_id)
        .single();

      // Send confirmation notification
      try {
        await supabaseClient.functions.invoke("send-reservation-notification", {
          body: {
            reservation_id: reservationId,
            notification_type: "payment_confirmed",
            email: profile?.email,
            reservation_name: reservation.reservation_name,
            party_size: reservation.party_size,
            event_title: reservation.events?.title,
            event_date: reservation.events?.start_at,
            event_location: reservation.events?.location || reservation.events?.venue_name,
            seating_type: seatingTypeName,
            prepaid_amount_cents: reservation.prepaid_min_charge_cents,
            confirmation_code: reservation.confirmation_code,
            qr_code_token: reservation.qr_code_token,
            dress_code: dressCode,
            business_name: reservation.events?.businesses?.name,
            business_phone: reservation.events?.businesses?.phone,
          },
        });
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
        // Don't fail the webhook for notification errors
      }

      console.log(`Reservation ${reservationId} marked as paid and confirmed`);
    } catch (error: unknown) {
      console.error("Error processing reservation payment:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const metadata = paymentIntent.metadata;

    if (metadata?.type === "reservation_event" && metadata?.reservation_id) {
      // Update reservation status to indicate payment failed
      await supabaseClient
        .from("reservations")
        .update({
          prepaid_charge_status: "pending",
          status: "pending",
        })
        .eq("id", metadata.reservation_id);

      console.log(`Reservation ${metadata.reservation_id} payment failed`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});