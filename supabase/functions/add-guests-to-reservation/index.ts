import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { securityHeaders } from "../_shared/security-headers.ts";
import { ensureReservationEventGuestTickets } from "../_shared/reservation-event-tickets.ts";

const LATIN = /^[a-zA-Z\s\-\.']+$/;

const log = (s: string, d?: unknown) =>
  console.log(`[ADD-GUESTS] ${s}`, d ? JSON.stringify(d) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: securityHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { reservation_id, extra_guests, guest_names, guest_ages, email } = await req.json();
    if (!reservation_id || !extra_guests || extra_guests < 1) {
      throw new Error("Invalid request");
    }
    const cleanedNames: string[] = (guest_names || []).map((n: string) => String(n).trim()).filter(Boolean);
    if (cleanedNames.length !== extra_guests) {
      throw new Error("Guest names count mismatch");
    }
    for (const n of cleanedNames) {
      if (!LATIN.test(n)) throw new Error("Names must be Latin characters only");
    }
    const cleanedAges: (number | null)[] = Array.isArray(guest_ages)
      ? guest_ages.map((a: any) => {
          const n = parseInt(String(a), 10);
          return isNaN(n) ? null : n;
        })
      : new Array(extra_guests).fill(null);
    const cleanedEmail: string | null = email && typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? email.trim()
      : null;

    // Load reservation
    const { data: res, error: resErr } = await supabase
      .from("reservations")
      .select(`
        id, user_id, event_id, business_id, party_size, seating_type_id,
        prepaid_min_charge_cents, status, reservation_name, email,
        events ( id, title, start_at, event_type, pay_at_door, businesses ( id, name, stripe_account_id, stripe_onboarding_completed ) )
      `)
      .eq("id", reservation_id)
      .single();

    if (resErr || !res) throw new Error("Reservation not found");
    if (res.user_id !== user.id) throw new Error("Not your reservation");
    if (!res.event_id || !res.seating_type_id) {
      throw new Error("Add guests is only supported for event-based reservations");
    }
    if (res.status === "cancelled" || res.status === "declined") {
      throw new Error("Cannot add guests to a cancelled reservation");
    }

    const newPartySize = (res.party_size || 0) + extra_guests;

    // Tier lookup for max + new charge
    const { data: tiers, error: tiersErr } = await supabase
      .from("seating_type_tiers")
      .select("min_people, max_people, prepaid_min_charge_cents, pricing_mode")
      .eq("seating_type_id", res.seating_type_id)
      .order("min_people", { ascending: true });
    if (tiersErr) throw tiersErr;
    if (!tiers || tiers.length === 0) throw new Error("No tier configured");

    const maxPeople = Math.max(...tiers.map((t: any) => t.max_people));
    if (newPartySize > maxPeople) {
      throw new Error(`Maximum ${maxPeople} guests for this seating type`);
    }

    const newTier = tiers.find((t: any) => newPartySize >= t.min_people && newPartySize <= t.max_people);
    if (!newTier) throw new Error("No tier matches new party size");

    const currentCharge = res.prepaid_min_charge_cents || 0;
    const newCharge = newTier.prepaid_min_charge_cents || 0;
    const isBottlesTier = newTier.pricing_mode === "bottles";
    const isPayAtVenue = !!(res as any).events?.pay_at_door;
    const isHybrid = (res as any).events?.event_type === "ticket_and_reservation";

    // Reservation delta:
    //   - hybrid events → 0 (only new tickets are charged online, reservation/bottles at venue)
    //   - bottles tier  → 0 (bottles paid at venue)
    //   - only-reservation amount tier → max(0, newCharge - currentCharge)
    const reservationDeltaCents = (isHybrid || isBottlesTier) ? 0 : Math.max(0, newCharge - currentCharge);

    // Hybrid: tickets ALWAYS charged for new guests (ticketPrice × extra).
    // pay_at_door only affects reservation/min-spend amounts, not extra ticket purchases.
    // We also resolve prepaid_amount_cents → portion that becomes table credit.
    let hybridTicketPriceCents = 0;
    let hybridTicketPrepaidCents: number | null = null; // null = full price acts as credit (legacy)
    let hybridTierId: string | null = null;
    if (isHybrid) {
      // Find tier_id from existing tickets linked to this reservation
      const { data: existingOrder } = await supabase
        .from("ticket_orders")
        .select("id")
        .eq("linked_reservation_id", reservation_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingOrder?.id) {
        const { data: ticketRow } = await supabase
          .from("tickets")
          .select("tier_id")
          .eq("order_id", existingOrder.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        hybridTierId = ticketRow?.tier_id ?? null;
      }
      if (hybridTierId) {
        const { data: tierRow } = await supabase
          .from("ticket_tiers")
          .select("price_cents, prepaid_amount_cents")
          .eq("id", hybridTierId)
          .maybeSingle();
        hybridTicketPriceCents = tierRow?.price_cents || 0;
        hybridTicketPrepaidCents = (tierRow as any)?.prepaid_amount_cents ?? null;
      } else {
        // Fallback: cheapest active tier
        const { data: tiersList } = await supabase
          .from("ticket_tiers")
          .select("id, price_cents, prepaid_amount_cents")
          .eq("event_id", res.event_id)
          .eq("active", true)
          .gt("price_cents", 0)
          .order("price_cents", { ascending: true })
          .limit(1);
        hybridTicketPriceCents = tiersList?.[0]?.price_cents || 0;
        hybridTicketPrepaidCents = (tiersList?.[0] as any)?.prepaid_amount_cents ?? null;
        hybridTierId = tiersList?.[0]?.id ?? null;
      }
    }
    const ticketsExtraCents = hybridTicketPriceCents * extra_guests;
    // Per-ticket credit toward table minimum (NULL → full price for backward compat)
    const perTicketCreditCents =
      hybridTicketPrepaidCents == null
        ? hybridTicketPriceCents
        : Math.max(0, Math.min(hybridTicketPriceCents, hybridTicketPrepaidCents));
    const ticketsExtraCreditCents = perTicketCreditCents * extra_guests;

    // Total online charge
    const extraChargeCents = ticketsExtraCents + (!isPayAtVenue ? reservationDeltaCents : 0);

    log("Computed", {
      currentCharge, newCharge, reservationDeltaCents, hybridTicketPriceCents,
      hybridTicketPrepaidCents, perTicketCreditCents, ticketsExtraCreditCents,
      ticketsExtraCents, extraChargeCents, newPartySize, maxPeople,
      isBottlesTier, isPayAtVenue, isHybrid,
    });

    // FREE PATH — apply immediately
    if (extraChargeCents === 0) {
      // Update reservation party_size + charge + email (if changed)
      const updatePayload: any = { party_size: newPartySize, prepaid_min_charge_cents: newCharge };
      if (cleanedEmail && cleanedEmail !== res.email) updatePayload.email = cleanedEmail;
      const { error: updErr } = await supabase
        .from("reservations")
        .update(updatePayload)
        .eq("id", reservation_id);
      if (updErr) throw updErr;

      // Build guests array (only the new ones) with ages
      const newGuests = cleanedNames.map((name, i) => ({ name, age: cleanedAges[i] ?? null }));

      // Add tickets for new guests (event-based) OR reservation_guests (direct)
      if (res.event_id) {
        await ensureReservationEventGuestTickets({
          supabaseClient: supabase,
          reservationId: reservation_id,
          paymentIntentId: null,
          session: null,
          guests: newGuests,
          customerEmail: cleanedEmail || res.email || null,
          forceNewOrder: true,
          orderSubtotalCents: 0,
          orderTotalCents: 0,
        });
      } else {
        // Direct reservation → insert into reservation_guests
        const guestInserts = newGuests.map((g) => ({
          reservation_id,
          guest_name: g.name,
          qr_code_token: crypto.randomUUID(),
          status: "valid" as const,
        }));
        await supabase.from("reservation_guests").insert(guestInserts);
      }

      // Forward to processor for emails/notifications
      const baseUrl = `${(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "")}/functions/v1`;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      try {
        await fetch(`${baseUrl}/process-add-guests-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            reservation_id,
            extra_guests,
            extra_charge_cents: 0,
            source: "add-guests-free",
          }),
        });
      } catch (e) {
        log("Free-path notify forward failed (non-fatal)", { error: String(e) });
      }

      return new Response(JSON.stringify({ ok: true, free: true }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // PAID PATH — create Stripe checkout for the diff
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const business = (res as any).events?.businesses;
    const event = (res as any).events;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", user.id)
      .single();
    const customerEmail = cleanedEmail || profile?.email || user.email || res.email || "";

    // Update email on reservation if user provided a different one (paid path)
    if (cleanedEmail && cleanedEmail !== res.email) {
      await supabase.from("reservations").update({ email: cleanedEmail }).eq("id", reservation_id);
    }

    // get/create Stripe customer
    let customerId: string | undefined;
    if (customerEmail) {
      const list = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (list.data.length > 0) customerId = list.data[0].id;
      else {
        const c = await stripe.customers.create({ email: customerEmail, name: profile?.name || res.reservation_name });
        customerId = c.id;
      }
    }

    const metadata: Record<string, string> = {
      type: "add_guests",
      reservation_id,
      extra_guests: String(extra_guests),
      new_party_size: String(newPartySize),
      new_prepaid_charge_cents: String(newCharge),
      extra_charge_cents: String(extraChargeCents),
      reservation_delta_cents: String(reservationDeltaCents),
      tickets_extra_cents: String(ticketsExtraCents),
      tickets_extra_credit_cents: String(ticketsExtraCreditCents),
      hybrid_ticket_price_cents: String(hybridTicketPriceCents),
      hybrid_ticket_prepaid_cents: String(hybridTicketPrepaidCents ?? ""),
      per_ticket_credit_cents: String(perTicketCreditCents),
      user_id: user.id,
      business_id: business?.id || "",
      customer_email: customerEmail,
    };

    // Serialize guest names + ages (chunked)
    const guestsJson = JSON.stringify(cleanedNames.map((name, i) => ({ name, age: cleanedAges[i] ?? null })));
    if (guestsJson.length <= 500) {
      metadata.guests = guestsJson;
    } else {
      const chunkSize = 490;
      for (let i = 0; i * chunkSize < guestsJson.length; i++) {
        metadata[`guests_${i}`] = guestsJson.slice(i * chunkSize, (i + 1) * chunkSize);
      }
    }

    const origin = req.headers.get("origin") || "https://fomo.com.cy";
    const hasConnect = !!(business?.stripe_account_id && business?.stripe_onboarding_completed);

    // Pricing profile to mirror main reservation flow (fees passed to buyer if business so configured)
    let buyerPaysStripe = true;
    let buyerPaysPlatformFee = false;
    let platformFeeReservationCents = 0;
    try {
      const { data: pp } = await supabase
        .from("business_pricing_profiles")
        .select("stripe_fee_bearer, platform_revenue_enabled, revenue_model, fixed_fee_bearer, fixed_fee_reservation_cents")
        .eq("business_id", business?.id)
        .maybeSingle();
      if (pp) {
        buyerPaysStripe = pp.stripe_fee_bearer === "buyer";
        const revenueEnabled = !!pp.platform_revenue_enabled;
        const isFixedFee = revenueEnabled && pp.revenue_model === "fixed_fee";
        buyerPaysPlatformFee = isFixedFee && pp.fixed_fee_bearer === "buyer";
        platformFeeReservationCents = buyerPaysPlatformFee ? (pp.fixed_fee_reservation_cents || 0) : 0;
      }
    } catch (e) {
      log("pricing profile fetch failed (non-fatal)", { error: String(e) });
    }

    const stripeFeesCents = (extraChargeCents > 0 && buyerPaysStripe)
      ? Math.ceil(extraChargeCents * 0.029 + 25)
      : 0;
    const platformFeeCents = (extraChargeCents > 0 && buyerPaysPlatformFee) ? platformFeeReservationCents : 0;

    const lineItems: any[] = [];
    if (ticketsExtraCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: `${event?.title || "Event"} — Εισιτήρια νέων ατόμων`,
            description: `${extra_guests} × εισιτήριο`,
          },
          unit_amount: hybridTicketPriceCents,
        },
        quantity: extra_guests,
      });
    }
    if (reservationDeltaCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: `${event?.title || "Reservation"} — Επιπλέον προπληρωμή κράτησης`,
            description: `+${extra_guests} άτομα`,
          },
          unit_amount: reservationDeltaCents,
        },
        quantity: 1,
      });
    }
    if (platformFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: "Χρέωση υπηρεσίας" },
          unit_amount: platformFeeCents,
        },
        quantity: 1,
      });
    }
    if (stripeFeesCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: "Έξοδα επεξεργασίας" },
          unit_amount: stripeFeesCents,
        },
        quantity: 1,
      });
    }

    const baseSession: any = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/dashboard-user?tab=reservations&subtab=event&add_guests=success&reservation_id=${reservation_id}`,
      cancel_url: `${origin}/dashboard-user?tab=reservations&subtab=event&add_guests=cancelled`,
      metadata,
    };

    let session: Stripe.Checkout.Session;
    if (hasConnect) {
      try {
        await stripe.accounts.retrieve(business.stripe_account_id);
        session = await stripe.checkout.sessions.create({
          ...baseSession,
          payment_intent_data: {
            transfer_data: { destination: business.stripe_account_id },
            metadata,
          },
        });
      } catch {
        session = await stripe.checkout.sessions.create(baseSession);
      }
    } else {
      session = await stripe.checkout.sessions.create(baseSession);
    }

    log("Checkout created", { sessionId: session.id, extraChargeCents });

    return new Response(JSON.stringify({ checkout_url: session.url }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
