import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");

    // Use anon key only to identify the user behind the provided JWT
    const supabaseAuthClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuthClient.auth.getUser(token);

    if (userError || !user) return json({ error: "User not authenticated" }, 401);

    const { event_id, seating_type_id, party_size, reservation_name, phone_number, special_requests } =
      (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Service client for privileged DB writes (required for demo/preview flows)
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // If event_id not provided, pick the next upcoming reservation event.
    let eventId = (event_id as string | undefined) ?? null;

    if (!eventId) {
      const { data: nextEvent, error: nextEventError } = await supabaseService
        .from("events")
        .select("id, title, start_at")
        .eq("event_type", "reservation")
        .eq("accepts_reservations", true)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextEventError || !nextEvent?.id) {
        return json({ error: "No reservation events found" }, 400);
      }
      eventId = nextEvent.id;
    }

    const { data: event, error: eventError } = await supabaseService
      .from("events")
      .select("id, title, start_at, end_at, event_type")
      .eq("id", eventId)
      .single();

    if (eventError || !event) return json({ error: "Event not found" }, 404);
    if (event.event_type !== "reservation") {
      return json({ error: "Event is not a reservation event" }, 400);
    }

    // Choose seating type
    let seatingTypeId = (seating_type_id as string | undefined) ?? null;
    if (!seatingTypeId) {
      const { data: st, error: stError } = await supabaseService
        .from("reservation_seating_types")
        .select("id")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (stError || !st?.id) return json({ error: "No seating types found" }, 400);
      seatingTypeId = st.id;
    }

    const partySize = typeof party_size === "number" ? party_size : Number(party_size ?? 2);
    const safePartySize = Number.isFinite(partySize) && partySize > 0 ? partySize : 2;

    const confirmationCode = `EVT-${Date.now().toString(36).toUpperCase()}`;
    const qrCodeToken = crypto.randomUUID();

    // Create accepted, free (0€) reservation
    const { data: reservation, error: reservationError } = await supabaseService
      .from("reservations")
      .insert({
        event_id: eventId,
        user_id: user.id,
        reservation_name: (reservation_name as string | undefined) ?? "Test Reservation",
        party_size: safePartySize,
        phone_number: (phone_number as string | undefined) ?? null,
        preferred_time: event.start_at,
        special_requests: (special_requests as string | undefined) ?? null,
        seating_type_id: seatingTypeId,
        prepaid_min_charge_cents: 0,
        prepaid_charge_status: "paid",
        status: "accepted",
        confirmation_code: confirmationCode,
        qr_code_token: qrCodeToken,
      })
      .select("id, confirmation_code, qr_code_token")
      .single();

    if (reservationError || !reservation) {
      console.error("[create-free-reservation-event] insert error", reservationError);
      return json({ error: "Failed to create reservation" }, 400);
    }

    // Create in-app notification directly for user
    try {
      await supabaseService.from('notifications').insert({
        user_id: user.id,
        title: '✅ Κράτηση επιβεβαιώθηκε!',
        message: `Κράτηση για ${event.title} - ${safePartySize} ${safePartySize === 1 ? 'άτομο' : 'άτομα'}`,
        type: 'reservation',
        event_type: 'reservation_confirmed',
        entity_type: 'reservation',
        entity_id: reservation.id,
        deep_link: `/dashboard-user/reservations`,
        delivered_at: new Date().toISOString(),
      });
      console.log("[create-free-reservation-event] User in-app notification created");
    } catch (e) {
      console.error("[create-free-reservation-event] User in-app notification failed", e);
    }

    // Send push notification to user
    try {
      const pushResult = await sendPushIfEnabled(user.id, {
        title: '✅ Κράτηση επιβεβαιώθηκε!',
        body: `${event.title} - ${safePartySize} ${safePartySize === 1 ? 'άτομο' : 'άτομα'}`,
        tag: `reservation-${reservation.id}`,
        data: {
          url: `/dashboard-user/reservations`,
          type: 'reservation_confirmed',
          entityType: 'reservation',
          entityId: reservation.id,
        },
      }, supabaseService);
      console.log("[create-free-reservation-event] User push sent", pushResult);
    } catch (e) {
      console.error("[create-free-reservation-event] User push failed", e);
    }

    // Send reservation notifications (user confirmation + business alert) via dedicated function
    // Best-effort: do not fail the booking if notifications fail.
    try {
      await supabaseService.functions.invoke('send-reservation-notification', {
        body: {
          reservationId: reservation.id,
          type: 'new',
        },
      });
    } catch (e) {
      console.error("[create-free-reservation-event] send-reservation-notification failed", e);
    }

    // Decrement seating slots best-effort (avoid failing the whole response)
    try {
      await supabaseService.rpc("decrement_seating_slots", { p_seating_type_id: seatingTypeId });
    } catch (e) {
      console.error("[create-free-reservation-event] decrement_seating_slots failed", e);
    }

    return json({
      reservation_id: reservation.id,
      confirmation_code: reservation.confirmation_code,
      qr_code_token: reservation.qr_code_token,
      event_id: eventId,
      prepaid_amount_cents: 0,
    });
  } catch (error: unknown) {
    console.error("[create-free-reservation-event] ERROR", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
