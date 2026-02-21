import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[RECONCILE-PAYMENTS] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Reconciliation started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const results = {
      tickets_reconciled: 0,
      reservations_reconciled: 0,
      offers_reconciled: 0,
      expired_released: 0,
      errors: [] as string[],
    };

    // ============================================================
    // 1. Find pending ticket orders with Stripe session IDs
    //    that should have been processed but weren't
    // ============================================================
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
    const maxAge = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h ago

    const { data: pendingTicketOrders, error: ticketOrdersError } = await supabaseClient
      .from("ticket_orders")
      .select("id, stripe_checkout_session_id, event_id, user_id, status")
      .eq("status", "pending")
      .not("stripe_checkout_session_id", "is", null)
      .lt("created_at", cutoffTime) // At least 30 min old (give checkout time to complete)
      .gt("created_at", maxAge); // No older than 24h

    if (ticketOrdersError) {
      logStep("Error fetching pending ticket orders", { error: ticketOrdersError.message });
    } else if (pendingTicketOrders && pendingTicketOrders.length > 0) {
      logStep("Found pending ticket orders", { count: pendingTicketOrders.length });

      for (const order of pendingTicketOrders) {
        try {
          if (!order.stripe_checkout_session_id) continue;

          const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);

          if (session.payment_status === "paid") {
            logStep("Found paid but unprocessed ticket order", { orderId: order.id });

            // Invoke the process-ticket-payment function to complete the order
            const { error: invokeError } = await supabaseClient.functions.invoke(
              "process-ticket-payment",
              {
                body: {
                  sessionId: order.stripe_checkout_session_id,
                  orderId: order.id,
                },
              }
            );

            if (invokeError) {
              results.errors.push(`Ticket order ${order.id}: ${invokeError.message}`);
            } else {
              results.tickets_reconciled++;
            }
          } else if (session.payment_status === "unpaid" && session.status === "expired") {
            // Session expired without payment - release reserved tickets
            logStep("Expired unpaid session, releasing tickets", { orderId: order.id });

            const ticketBreakdown = JSON.parse(session.metadata?.ticket_breakdown || "[]");
            for (const item of ticketBreakdown) {
              try {
                await supabaseClient.rpc("release_tickets", {
                  p_tier_id: item.tierId,
                  p_quantity: item.quantity,
                });
              } catch (e) {
                logStep("Failed to release tickets for tier", { tierId: item.tierId, error: e });
              }
            }

            // Mark order as expired
            await supabaseClient
              .from("ticket_orders")
              .update({ status: "expired" })
              .eq("id", order.id);

            results.expired_released++;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          results.errors.push(`Ticket order ${order.id}: ${msg}`);
        }
      }
    }

    // ============================================================
    // 2. Find pending reservation payments
    // Note: reservations use stripe_payment_intent_id, not stripe_checkout_session_id
    // We look for reservations with prepaid_charge_status = 'pending' and a payment_intent
    // ============================================================
    const { data: pendingReservations, error: resError } = await supabaseClient
      .from("reservations")
      .select("id, stripe_payment_intent_id, status, prepaid_charge_status")
      .eq("prepaid_charge_status", "pending")
      .not("stripe_payment_intent_id", "is", null)
      .lt("created_at", cutoffTime)
      .gt("created_at", maxAge);

    if (resError) {
      logStep("Error fetching pending reservations", { error: resError.message });
    } else if (pendingReservations && pendingReservations.length > 0) {
      logStep("Found pending reservations", { count: pendingReservations.length });

      for (const res of pendingReservations) {
        try {
          if (!res.stripe_payment_intent_id) continue;

          // Check payment intent status directly
          const paymentIntent = await stripe.paymentIntents.retrieve(res.stripe_payment_intent_id);

          if (paymentIntent.status === "succeeded") {
            logStep("Found paid but unprocessed reservation", { reservationId: res.id });

            // Directly update the reservation since we know payment succeeded
            const { error: updateError } = await supabaseClient
              .from("reservations")
              .update({
                prepaid_charge_status: "paid",
                status: "accepted",
              })
              .eq("id", res.id)
              .eq("prepaid_charge_status", "pending");

            if (updateError) {
              results.errors.push(`Reservation ${res.id}: ${updateError.message}`);
            } else {
              results.reservations_reconciled++;
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          results.errors.push(`Reservation ${res.id}: ${msg}`);
        }
      }
    }

    // ============================================================
    // 3. Find pending offer purchases
    // ============================================================
    const { data: pendingOffers, error: offersError } = await supabaseClient
      .from("offer_purchases")
      .select("id, stripe_checkout_session_id, status")
      .eq("status", "pending")
      .not("stripe_checkout_session_id", "is", null)
      .lt("created_at", cutoffTime)
      .gt("created_at", maxAge);

    if (offersError) {
      logStep("Error fetching pending offers", { error: offersError.message });
    } else if (pendingOffers && pendingOffers.length > 0) {
      logStep("Found pending offers", { count: pendingOffers.length });

      for (const offer of pendingOffers) {
        try {
          if (!offer.stripe_checkout_session_id) continue;

          const session = await stripe.checkout.sessions.retrieve(offer.stripe_checkout_session_id);

          if (session.payment_status === "paid") {
            logStep("Found paid but unprocessed offer", { purchaseId: offer.id });

            const { error: invokeError } = await supabaseClient.functions.invoke(
              "process-offer-payment",
              {
                body: {
                  purchaseId: offer.id,
                },
              }
            );

            if (invokeError) {
              results.errors.push(`Offer ${offer.id}: ${invokeError.message}`);
            } else {
              results.offers_reconciled++;
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          results.errors.push(`Offer ${offer.id}: ${msg}`);
        }
      }
    }

    logStep("Reconciliation complete", results);

    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("FATAL ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
