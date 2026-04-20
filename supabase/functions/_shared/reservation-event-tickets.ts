type SupabaseClientLike = any;

export type ReservationGuestInput = {
  name?: string | null;
  age?: number | string | null;
};

const AUTO_TIER_NAME = "Reservation Entry";
const AUTO_TIER_DESCRIPTION = "Auto-created tier for reservation-only event QR check-ins.";

const normalizeReservationGuests = (
  guests: ReservationGuestInput[],
  reservationName: string,
  partySize: number,
) => {
  const baseName = reservationName || "Guest";
  const targetSize = Math.max(partySize || 0, guests.length);

  if (targetSize === 0) {
    return [] as { name: string; age: number | null }[];
  }

  const cleaned = guests.slice(0, targetSize).map((guest, index) => ({
    name: (guest?.name || "").trim() || (targetSize === 1 ? baseName : `${baseName} ${index + 1}`),
    age:
      typeof guest?.age === "number"
        ? guest.age
        : guest?.age
          ? parseInt(String(guest.age), 10) || null
          : null,
  }));

  while (cleaned.length < targetSize) {
    const index = cleaned.length;
    cleaned.push({
      name: targetSize === 1 ? baseName : `${baseName} ${index + 1}`,
      age: null,
    });
  }

  return cleaned;
};

export const buildReservationGuestsFromMetadata = (
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

  if (!guestsJson) {
    return normalizeReservationGuests([], reservationName, partySize);
  }

  try {
    const parsed = JSON.parse(guestsJson) as ReservationGuestInput[];
    if (!Array.isArray(parsed)) {
      return normalizeReservationGuests([], reservationName, partySize);
    }

    return normalizeReservationGuests(parsed, reservationName, partySize);
  } catch {
    return normalizeReservationGuests([], reservationName, partySize);
  }
};

const getOrCreateReservationEventTierId = async ({
  supabaseClient,
  eventId,
}: {
  supabaseClient: SupabaseClientLike;
  eventId: string;
}) => {
  const { data: existingTiers, error: tiersError } = await supabaseClient
    .from("ticket_tiers")
    .select("id, active")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (tiersError) {
    throw tiersError;
  }

  const preferredTier = existingTiers?.find((tier: { id: string; active: boolean }) => tier.active) || existingTiers?.[0];
  if (preferredTier?.id) {
    return preferredTier.id;
  }

  const { data: createdTier, error: createTierError } = await supabaseClient
    .from("ticket_tiers")
    .insert({
      event_id: eventId,
      name: AUTO_TIER_NAME,
      description: AUTO_TIER_DESCRIPTION,
      quantity_total: 999999,
      price_cents: 0,
      active: true,
      currency: "eur",
      max_per_order: 50,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (createTierError || !createdTier?.id) {
    throw createTierError || new Error("Failed to create reservation ticket tier");
  }

  return createdTier.id;
};

export const ensureReservationEventGuestTickets = async ({
  supabaseClient,
  reservationId,
  paymentIntentId,
  session,
  guests: providedGuests,
  customerEmail,
  forceNewOrder = false,
  orderSubtotalCents = 0,
  orderTotalCents = 0,
}: {
  supabaseClient: SupabaseClientLike;
  reservationId: string;
  paymentIntentId?: string | null;
  session?: { id?: string | null; metadata?: Record<string, string | undefined> | null; customer_details?: { email?: string | null } | null } | null;
  guests?: ReservationGuestInput[];
  customerEmail?: string | null;
  /**
   * When true, always create a NEW ticket_orders row (used by add-guests so
   * each batch of additional guests is its own order with its own subtotal).
   * When false (default), reuses the existing linked order if any.
   */
  forceNewOrder?: boolean;
  /** Subtotal (excl. fees) for the new order, used only when forceNewOrder=true. */
  orderSubtotalCents?: number;
  /** Total (incl. fees) for the new order, used only when forceNewOrder=true. */
  orderTotalCents?: number;
}): Promise<number> => {
  const { data: reservation, error: reservationError } = await supabaseClient
    .from("reservations")
    .select("id, event_id, user_id, reservation_name, party_size")
    .eq("id", reservationId)
    .single();

  if (reservationError || !reservation?.event_id || !reservation?.user_id) {
    throw reservationError || new Error("Reservation event context not found");
  }

  const guests = Array.isArray(providedGuests) && providedGuests.length > 0
    ? normalizeReservationGuests(
        providedGuests,
        reservation.reservation_name || "Guest",
        // For add-guests batches we want EXACTLY the provided names —
        // never pad to the reservation's total party_size.
        forceNewOrder ? providedGuests.length : (reservation.party_size || providedGuests.length),
      )
    : buildReservationGuestsFromMetadata(
        session?.metadata,
        reservation.reservation_name || "Guest",
        reservation.party_size || 0,
      );

  if (guests.length === 0) {
    return 0;
  }

  const tierId = await getOrCreateReservationEventTierId({
    supabaseClient,
    eventId: reservation.event_id,
  });

  let orderId: string | null = null;

  if (!forceNewOrder) {
    const { data: existingOrder } = await supabaseClient
      .from("ticket_orders")
      .select("id")
      .eq("linked_reservation_id", reservationId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    orderId = existingOrder?.id ?? null;
  }

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
          (customerEmail || session?.metadata?.customer_email || session?.customer_details?.email || "").trim() || "unknown@fomo.local",
        status: "completed",
        subtotal_cents: orderSubtotalCents,
        commission_cents: 0,
        commission_percent: 0,
        total_cents: orderTotalCents || orderSubtotalCents,
        stripe_payment_intent_id: paymentIntentId || null,
        stripe_checkout_session_id: session?.id || null,
        linked_reservation_id: reservationId,
      })
      .select("id")
      .single();

    if (orderError || !createdOrder?.id) {
      throw orderError || new Error("Failed to create reservation ticket order");
    }

    orderId = createdOrder.id;
  }

  // When forceNewOrder=true the order has no tickets yet → insert all `guests`.
  // When false (legacy webhook path), only fill the gap up to expected count.
  let guestsToInsert = guests;
  if (!forceNewOrder) {
    const { data: existingTickets, error: existingTicketsError } = await supabaseClient
      .from("tickets")
      .select("id")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (existingTicketsError) {
      throw existingTicketsError;
    }

    guestsToInsert = guests.slice(existingTickets?.length || 0);
    if (guestsToInsert.length === 0) {
      return 0;
    }
  }

  const { error: ticketsError } = await supabaseClient.from("tickets").insert(
    guestsToInsert.map((guest) => ({
      order_id: orderId,
      tier_id: tierId,
      event_id: reservation.event_id,
      user_id: reservation.user_id,
      guest_name: guest.name || "Guest",
      guest_age: guest.age,
      status: "valid",
    })),
  );

  if (ticketsError) {
    throw ticketsError;
  }

  return guestsToInsert.length;
};
