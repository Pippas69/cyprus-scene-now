import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[RECONCILE-PAYMENTS] ${step}`, details ? JSON.stringify(details) : '');
};

const buildReservationGuestsFromMetadata = (
  metadata: Record<string, string | undefined> | null | undefined,
  reservationName: string,
  partySize: number,
) => {
  let guestsJson = metadata?.guests || "";

  if (!guestsJson && metadata) {
    const chunks: string[] = [];
    for (let i = 0; ; i++) {
      const chunk = metadata[`guests_${i}`];
      if (!chunk) break;
      chunks.push(chunk);
    }
    if (chunks.length > 0) guestsJson = chunks.join("");
  }

  let guests: { name: string; age: number | null }[] = [];

  if (guestsJson) {
    try {
      const parsed = JSON.parse(guestsJson) as Array<{ name?: string; age?: number | string }>;
      if (Array.isArray(parsed)) {
        guests = parsed.map((guest, index) => ({
          name: (guest?.name || "").trim() || `${reservationName || "Guest"} ${index + 1}`,
          age:
            typeof guest?.age === "number"
              ? guest.age
              : guest?.age
                ? parseInt(String(guest.age), 10) || null
                : null,
        }));
      }
    } catch (error) {
      logStep("Failed to parse reservation guests during reconciliation", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (guests.length === 0 && partySize > 0) {
    guests = Array.from({ length: partySize }, (_, index) => ({
      name: partySize === 1 ? reservationName || "Guest" : `${reservationName || "Guest"} ${index + 1}`,
      age: null,
    }));
  }

  return guests;
};

const ensureReservationEventGuestTickets = async ({
  supabaseClient,
  reservationId,
  paymentIntentId,
  session,
}: {
  supabaseClient: any;
  reservationId: string;
  paymentIntentId: string;
  session: Stripe.Checkout.Session | null;
}) => {
  const { data: reservation, error: reservationError } = await supabaseClient
    .from("reservations")
    .select("id, event_id, user_id, reservation_name, party_size")
    .eq("id", reservationId)
    .single();

  if (reservationError || !reservation?.event_id) {
    throw reservationError || new Error("Reservation event context not found");
  }

  const guests = buildReservationGuestsFromMetadata(
    session?.metadata as Record<string, string | undefined> | undefined,
    reservation.reservation_name || "Guest",
    reservation.party_size || 1,
  );

  const { data: existingOrder } = await supabaseClient
    .from("ticket_orders")
    .select("id")
    .eq("linked_reservation_id", reservationId)
    .maybeSingle();

  let orderId = existingOrder?.id ?? null;

  if (!orderId) {
    const { data: eventData, error: eventError } = await supabaseClient
      .from("events")
      .select("business_id")
      .eq("id", reservation.event_id)
      .single();

    if (eventError || !eventData?.business_id) {
      throw eventError || new Error("Business not found for reservation event");
    }

    const { data: createdOrder, error: orderError } = await supabaseClient
      .from("ticket_orders")
      .insert({
        event_id: reservation.event_id,
        business_id: eventData.business_id,
        user_id: reservation.user_id,
        customer_name: guests[0]?.name || reservation.reservation_name || "Guest",
        customer_email:
          (session?.metadata?.customer_email || session?.customer_details?.email || "").trim() || "unknown@fomo.local",
        status: "completed",
        subtotal_cents: 0,
        commission_cents: 0,
        commission_percent: 0,
        total_cents: 0,
        stripe_payment_intent_id: paymentIntentId,
        stripe_checkout_session_id: session?.id ?? null,
        linked_reservation_id: reservationId,
      })
      .select("id")
      .single();

    if (orderError || !createdOrder) {
      throw orderError || new Error("Failed to create ticket order");
    }

    orderId = createdOrder.id;
  }

  const { data: existingTickets, error: existingTicketsError } = await supabaseClient
    .from("tickets")
    .select("id")
    .eq("order_id", orderId);

  if (existingTicketsError) {
    throw existingTicketsError;
  }

  const missingGuests = guests.slice(existingTickets?.length || 0);
  if (missingGuests.length === 0) {
    return;
  }

  const { error: ticketsError } = await supabaseClient.from("tickets").insert(
    missingGuests.map((guest) => ({
      order_id: orderId,
      event_id: reservation.event_id,
      guest_name: guest.name || "Guest",
      guest_age: guest.age,
      qr_code_token: crypto.randomUUID(),
      status: "valid",
    })),
  );

  if (ticketsError) {
    throw ticketsError;
  }
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
    // Grace window: 45 min (not 30) — prevents race with user who pays at minute 29
    const cutoffTime = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const maxAge = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingTicketOrders, error: ticketOrdersError } = await supabaseClient
      .from("ticket_orders")
      .select("id, stripe_checkout_session_id, event_id, user_id, status, total_cents, commission_cents")
      .eq("status", "pending")
      .not("stripe_checkout_session_id", "is", null)
      .lt("created_at", cutoffTime)
      .gt("created_at", maxAge);

    if (ticketOrdersError) {
      logStep("Error fetching pending ticket orders", { error: ticketOrdersError.message });
    } else if (pendingTicketOrders && pendingTicketOrders.length > 0) {
      logStep("Found pending ticket orders", { count: pendingTicketOrders.length });

      for (const order of pendingTicketOrders) {
        try {
          if (!order.stripe_checkout_session_id) continue;

          const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);

          if (session.payment_status === "paid") {
            // VALIDATE: amount_total must match order total
            const stripeAmountCents = session.amount_total || 0;
            const stripeCurrency = session.currency?.toLowerCase() || "eur";
            const metadataOrderId = session.metadata?.order_id;

            if (metadataOrderId && metadataOrderId !== order.id) {
              results.errors.push(`Ticket order ${order.id}: metadata order_id mismatch (${metadataOrderId})`);
              continue;
            }

            if (order.total_cents > 0 && Math.abs(stripeAmountCents - order.total_cents) > 1) {
              results.errors.push(`Ticket order ${order.id}: amount mismatch (stripe=${stripeAmountCents}, db=${order.total_cents})`);
              continue;
            }

            if (stripeCurrency !== "eur") {
              results.errors.push(`Ticket order ${order.id}: unexpected currency ${stripeCurrency}`);
              continue;
            }

            logStep("Found paid+validated ticket order", { orderId: order.id, amount: stripeAmountCents });

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
