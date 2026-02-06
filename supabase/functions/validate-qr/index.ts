import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Language = "el" | "en";

type ValidateQRRequest = {
  qrData: string;
  businessId: string;
  language?: Language;
};

type QRType = "ticket" | "offer" | "reservation" | "student" | "unknown";

const logStep = (step: string, details?: unknown) => {
  console.log(`[VALIDATE-QR] ${step}`, details ? JSON.stringify(details) : "");
};

const msg = (language: Language) => ({
  // Generic
  success: language === "el" ? "Επιτυχής Επαλήθευση!" : "Successfully Verified!",
  checkedIn: language === "el" ? "Check-in ολοκληρώθηκε!" : "Check-in complete!",
  notFound: language === "el" ? "Δεν βρέθηκε" : "Not found",
  wrongBusiness: language === "el" ? "Δεν ανήκει στην επιχείρησή σας" : "Doesn't belong to your business",
  unauthorized: language === "el" ? "Μη εξουσιοδοτημένο" : "Unauthorized",
  invalidRequest: language === "el" ? "Μη έγκυρο αίτημα" : "Invalid request",
  internalError: language === "el" ? "Σφάλμα" : "Error",
  
  // Ticket specific
  ticketAlreadyUsed: language === "el" ? "Το εισιτήριο έχει ήδη χρησιμοποιηθεί" : "Ticket already used",
  ticketCancelled: language === "el" ? "Το εισιτήριο έχει ακυρωθεί" : "Ticket has been cancelled",
  
  // Offer specific
  offerAlreadyRedeemed: language === "el" ? "Η προσφορά έχει ήδη εξαργυρωθεί" : "Offer already redeemed",
  offerExpired: language === "el" ? "Η προσφορά έχει λήξει" : "Offer has expired",
  offerNotPaid: language === "el" ? "Η προσφορά δεν έχει πληρωθεί" : "Offer hasn't been paid",
  offerNotValidToday: language === "el" ? "Η προσφορά δεν ισχύει σήμερα" : "Offer not valid today",
  offerNotValidHours: language === "el" ? "Η προσφορά δεν ισχύει αυτή την ώρα" : "Offer not valid at this time",
  
  // Reservation specific
  reservationCancelled: language === "el" ? "Η κράτηση έχει ακυρωθεί" : "Reservation cancelled",
  reservationDeclined: language === "el" ? "Η κράτηση απορρίφθηκε" : "Reservation declined",
  reservationPending: language === "el" ? "Η κράτηση εκκρεμεί έγκριση" : "Reservation pending approval",
  reservationAlreadyCheckedIn: language === "el" ? "Ήδη έχει γίνει check-in" : "Already checked in",
  
  // Student specific
  studentExpired: language === "el" ? "Η επαλήθευση φοιτητή έχει λήξει" : "Student verification expired",
  studentNotFound: language === "el" ? "Ο φοιτητής δεν βρέθηκε" : "Student not found",
  studentAlreadyRedeemed: language === "el" ? "Ο φοιτητής έχει ήδη χρησιμοποιήσει την έκπτωση" : "Student already used discount",
});

// Detect QR type from data
const detectQRType = (qrData: string): { type: QRType; token: string; qrBusinessId?: string } => {
  const cleaned = String(qrData || "").trim();
  
  // Student QR format: fomo-student:{token}:{businessId}
  // The businessId is required to ensure QR is only valid for the specific business
  if (cleaned.startsWith("fomo-student:")) {
    const parts = cleaned.replace("fomo-student:", "").split(":");
    const token = parts[0];
    const qrBusinessId = parts[1]; // May be undefined for old QR codes
    return { type: "student", token, qrBusinessId };
  }
  
  // Try to extract token from URL if present
  let token = cleaned;
  try {
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
      const url = new URL(cleaned);
      const qp =
        url.searchParams.get("qr_code_token") ||
        url.searchParams.get("qrToken") ||
        url.searchParams.get("token") ||
        url.searchParams.get("qr");
      if (qp) token = qp;
      else token = url.pathname.split("/").filter(Boolean).pop() || cleaned;
    } else {
      token = cleaned.split("?")[0].split("/").filter(Boolean).pop() || cleaned;
    }
  } catch {
    // ignore URL parsing errors
  }
  
  return { type: "unknown", token };
};

const withinOfferHoursCyprus = (start: string, end: string, nowHHMM: string) => {
  const startTime = String(start).substring(0, 5);
  const endTime = String(end).substring(0, 5);
  if (endTime < startTime) {
    return nowHHMM >= startTime || nowHHMM <= endTime;
  }
  return nowHHMM >= startTime && nowHHMM <= endTime;
};

// Mask email for privacy
const maskEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  const visibleChars = Math.min(3, localPart.length);
  const masked = localPart.substring(0, visibleChars) + '***';
  return `${masked}@${domain}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: msg("en").unauthorized }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, message: msg("en").unauthorized }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ValidateQRRequest;
    const language: Language = body.language === "el" ? "el" : "en";
    const m = msg(language);

    if (!body.qrData || !body.businessId) {
      return new Response(JSON.stringify({ success: false, message: m.invalidRequest }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Request", { userId: user.id, businessId: body.businessId, qrData: body.qrData.substring(0, 50) });

    // Verify the caller owns this business
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, user_id, student_discount_enabled, student_discount_percent, student_discount_mode")
      .eq("id", body.businessId)
      .single();

    if (businessError || !business) {
      logStep("Business not found", { businessError });
      return new Response(JSON.stringify({ success: false, message: m.wrongBusiness }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (business.user_id !== user.id) {
      logStep("Wrong business owner", { expected: business.user_id, actual: user.id });
      return new Response(JSON.stringify({ success: false, message: m.wrongBusiness }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type: detectedType, token, qrBusinessId } = detectQRType(body.qrData);
    logStep("Detected QR", { detectedType, token: token.substring(0, 20), qrBusinessId });

    // If type is student, handle it with the qrBusinessId for validation
    if (detectedType === "student") {
      return await handleStudentQR(supabaseAdmin, token, body.businessId, business, user.id, m, language, qrBusinessId);
    }

    // Try to identify the QR type by querying each table
    // 1. Try ticket
    const { data: ticket } = await supabaseAdmin
      .from("tickets")
      .select(`*, ticket_tiers(name, price_cents), ticket_orders(customer_name, customer_email, user_id), events(id, title, start_at, business_id)`)
      .eq("qr_code_token", token)
      .single();

    if (ticket) {
      return await handleTicketQR(supabaseAdmin, ticket, body.businessId, user.id, m, language);
    }

    // 2. Try offer purchase
    const { data: purchase } = await supabaseAdmin
      .from("offer_purchases")
      .select(`*, discounts(id, title, description, business_id, valid_days, valid_start_time, valid_end_time)`)
      .eq("qr_code_token", token)
      .single();

    if (purchase) {
      return await handleOfferQR(supabaseAdmin, purchase, body.businessId, user.id, m, language);
    }

    // 3. Try reservation
    const { data: reservation } = await supabaseAdmin
      .from("reservations")
      .select(`*, events(id, title, start_at, business_id), businesses(id, name)`)
      .or(`qr_code_token.eq.${token},confirmation_code.eq.${token}`)
      .single();

    if (reservation) {
      return await handleReservationQR(supabaseAdmin, reservation, body.businessId, user.id, m, language);
    }

    // Not found
    logStep("QR not found in any table", { token });
    return new Response(JSON.stringify({ success: false, message: m.notFound, qrType: "unknown" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[VALIDATE-QR] Unhandled error", error);
    return new Response(JSON.stringify({ success: false, message: msg("en").internalError }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Handler for Ticket QR
async function handleTicketQR(
  supabaseAdmin: any,
  ticket: any,
  businessId: string,
  staffUserId: string,
  m: ReturnType<typeof msg>,
  language: Language
) {
  logStep("Processing ticket", { ticketId: ticket.id, status: ticket.status });

  // Verify ticket belongs to this business
  if (ticket.events?.business_id !== businessId) {
    return new Response(JSON.stringify({ success: false, message: m.wrongBusiness, qrType: "ticket" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check status
  if (ticket.status === "used") {
    return new Response(JSON.stringify({
      success: false,
      message: m.ticketAlreadyUsed,
      qrType: "ticket",
      alreadyUsed: true,
      details: {
        tierName: ticket.ticket_tiers?.name,
        customerName: ticket.ticket_orders?.customer_name,
        eventTitle: ticket.events?.title,
        checkedInAt: ticket.checked_in_at,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (ticket.status === "cancelled" || ticket.status === "refunded") {
    return new Response(JSON.stringify({
      success: false,
      message: m.ticketCancelled,
      qrType: "ticket",
      details: { status: ticket.status }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check in the ticket
  const { error: updateError } = await supabaseAdmin
    .from("tickets")
    .update({
      status: "used",
      checked_in_at: new Date().toISOString(),
      checked_in_by: staffUserId,
    })
    .eq("id", ticket.id);

  if (updateError) {
    logStep("Ticket update failed", { updateError });
    return new Response(JSON.stringify({ success: false, message: m.internalError, qrType: "ticket" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  logStep("Ticket checked in", { ticketId: ticket.id });

  // Get business owner user_id for in-app notification
  const { data: eventData } = await supabaseAdmin
    .from("events")
    .select("business_id, businesses(user_id)")
    .eq("id", ticket.events?.id)
    .single();

  // Create in-app notification for business owner
  if (eventData?.businesses?.user_id) {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: eventData.businesses.user_id,
        title: '✅ Check-in εισιτηρίου!',
        message: `${ticket.ticket_orders?.customer_name || 'Πελάτης'} έκανε check-in για "${ticket.events?.title}"`,
        type: 'business',
        event_type: 'ticket_checked_in',
        entity_type: 'ticket',
        entity_id: ticket.id,
        deep_link: '/dashboard-business/tickets',
        delivered_at: new Date().toISOString(),
      });
      logStep("Business in-app notification created for ticket check-in");
    } catch (notifError) {
      logStep("Failed to create business in-app notification", notifError);
    }
  }

  // Send push notification to user when their ticket is checked in
  const ticketUserId = ticket.ticket_orders?.user_id;
  if (ticketUserId) {
    try {
      await sendPushIfEnabled(ticketUserId, {
        title: '✅ Check-in επιτυχές!',
        body: language === "el" 
          ? `Καλωσήρθατε στο "${ticket.events?.title}"` 
          : `Welcome to "${ticket.events?.title}"`,
        tag: `ticket-checkin-${ticket.id}`,
        data: {
          url: `/event/${ticket.events?.id}`,
          type: 'ticket_checked_in',
          entityType: 'ticket',
          entityId: ticket.id,
        },
      }, supabaseAdmin);
      logStep("Ticket check-in push sent", { userId: ticketUserId });
    } catch (pushError) {
      logStep("Ticket check-in push failed (non-fatal)", { error: pushError instanceof Error ? pushError.message : String(pushError) });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: m.checkedIn,
    qrType: "ticket",
    details: {
      id: ticket.id,
      tierName: ticket.ticket_tiers?.name,
      tierPrice: ticket.ticket_tiers?.price_cents,
      customerName: ticket.ticket_orders?.customer_name,
      customerEmail: maskEmail(ticket.ticket_orders?.customer_email),
      eventTitle: ticket.events?.title,
      eventStartAt: ticket.events?.start_at,
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Handler for Offer QR
async function handleOfferQR(
  supabaseAdmin: any,
  purchase: any,
  businessId: string,
  staffUserId: string,
  m: ReturnType<typeof msg>,
  language: Language
) {
  logStep("Processing offer", { purchaseId: purchase.id, status: purchase.status });

  const discount = purchase.discounts;
  if (!discount || discount.business_id !== businessId) {
    return new Response(JSON.stringify({ success: false, message: m.wrongBusiness, qrType: "offer" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (purchase.status === "redeemed") {
    return new Response(JSON.stringify({
      success: false,
      message: m.offerAlreadyRedeemed,
      qrType: "offer",
      alreadyRedeemed: true,
      details: {
        title: discount.title,
        redeemedAt: purchase.redeemed_at,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (purchase.status !== "paid") {
    return new Response(JSON.stringify({ success: false, message: m.offerNotPaid, qrType: "offer" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
    return new Response(JSON.stringify({ success: false, message: m.offerExpired, qrType: "offer" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check valid days
  if (discount?.valid_days && Array.isArray(discount.valid_days) && discount.valid_days.length > 0) {
    const cyprusWeekday = new Date()
      .toLocaleDateString("en-US", { timeZone: "Europe/Nicosia", weekday: "long" })
      .toLowerCase();
    if (!discount.valid_days.map((d: string) => String(d).toLowerCase()).includes(cyprusWeekday)) {
      return new Response(JSON.stringify({ success: false, message: m.offerNotValidToday, qrType: "offer" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Check valid hours
  if (discount?.valid_start_time && discount?.valid_end_time) {
    const cyprusTime = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Europe/Nicosia",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    if (!withinOfferHoursCyprus(discount.valid_start_time, discount.valid_end_time, cyprusTime)) {
      return new Response(JSON.stringify({ success: false, message: m.offerNotValidHours, qrType: "offer" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Redeem
  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("offer_purchases")
    .update({
      status: "redeemed",
      redeemed_at: nowIso,
      redeemed_by: staffUserId,
    })
    .eq("id", purchase.id)
    .eq("status", "paid");

  if (updateError) {
    return new Response(JSON.stringify({ success: false, message: m.internalError, qrType: "offer" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Also check-in linked reservation if present
  if (purchase.reservation_id) {
    try {
      await supabaseAdmin
        .from('reservations')
        .update({ checked_in_at: nowIso, checked_in_by: staffUserId })
        .eq('id', purchase.reservation_id)
        .is('checked_in_at', null);
    } catch (e) {
      console.error('[VALIDATE-QR] Failed to check-in linked reservation', e);
    }
  }

  // Fetch profile for display
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", purchase.user_id)
    .single();

  logStep("Offer redeemed", { purchaseId: purchase.id });

  // Get business owner user_id and name for notifications
  const { data: businessData } = await supabaseAdmin
    .from("businesses")
    .select("user_id, name")
    .eq("id", businessId)
    .single();

  const customerName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : 'Πελάτης';

  // Create in-app notification for business owner
  if (businessData?.user_id) {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: businessData.user_id,
        title: '✅ Εξαργύρωση προσφοράς!',
        message: `${customerName} εξαργύρωσε "${discount.title}"`,
        type: 'business',
        event_type: 'offer_redeemed',
        entity_type: 'offer',
        entity_id: purchase.id,
        deep_link: '/dashboard-business/discounts',
        delivered_at: new Date().toISOString(),
      });
      logStep("Business in-app notification created for offer redemption");
    } catch (notifError) {
      logStep("Failed to create business in-app notification", notifError);
    }
  }

  // Create in-app notification for user (offer holder)
  if (purchase.user_id) {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: purchase.user_id,
        title: '✅ Προσφορά εξαργυρώθηκε!',
        message: `"${discount.title}"${businessData?.name ? ` - ${businessData.name}` : ''} εξαργυρώθηκε επιτυχώς`,
        type: 'offer',
        event_type: 'offer_redeemed',
        entity_type: 'offer',
        entity_id: purchase.id,
        deep_link: '/dashboard-user/offers',
        delivered_at: new Date().toISOString(),
      });
      logStep("User in-app notification created for offer redemption");
    } catch (notifError) {
      logStep("Failed to create user in-app notification", notifError);
    }
  }

  // Send push notification to user when their offer is redeemed
  if (purchase.user_id) {
    try {
      await sendPushIfEnabled(purchase.user_id, {
        title: '✅ Προσφορά εξαργυρώθηκε!',
        body: language === "el" 
          ? `"${discount.title}" εξαργυρώθηκε επιτυχώς` 
          : `"${discount.title}" redeemed successfully`,
        tag: `offer-redeemed-${purchase.id}`,
        data: {
          url: '/dashboard-user/offers',
          type: 'offer_redeemed',
          entityType: 'offer',
          entityId: purchase.id,
        },
      }, supabaseAdmin);
      logStep("Offer redemption push sent", { userId: purchase.user_id });
    } catch (pushError) {
      logStep("Offer redemption push failed (non-fatal)", { error: pushError instanceof Error ? pushError.message : String(pushError) });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: m.success,
    qrType: "offer",
    details: {
      id: purchase.id,
      title: discount.title,
      description: discount.description,
      originalPriceCents: purchase.original_price_cents,
      discountPercent: purchase.discount_percent,
      finalPriceCents: purchase.final_price_cents,
      customerName: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : null,
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Handler for Reservation QR
async function handleReservationQR(
  supabaseAdmin: any,
  reservation: any,
  businessId: string,
  staffUserId: string,
  m: ReturnType<typeof msg>,
  language: Language
) {
  logStep("Processing reservation", { reservationId: reservation.id, status: reservation.status });

  const isDirectReservation = !reservation.event_id && !!reservation.business_id;
  const reservationBusinessId = isDirectReservation ? reservation.business_id : reservation.events?.business_id;

  if (reservationBusinessId !== businessId) {
    return new Response(JSON.stringify({ success: false, message: m.wrongBusiness, qrType: "reservation" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (reservation.status === "cancelled") {
    return new Response(JSON.stringify({ success: false, message: m.reservationCancelled, qrType: "reservation" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (reservation.status === "declined") {
    return new Response(JSON.stringify({ success: false, message: m.reservationDeclined, qrType: "reservation" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (reservation.status === "pending") {
    return new Response(JSON.stringify({ success: false, message: m.reservationPending, qrType: "reservation" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (reservation.checked_in_at) {
    return new Response(JSON.stringify({
      success: false,
      message: m.reservationAlreadyCheckedIn,
      qrType: "reservation",
      alreadyCheckedIn: true,
      details: {
        id: reservation.id,
        name: reservation.reservation_name,
        partySize: reservation.party_size,
        checkedInAt: reservation.checked_in_at,
        isDirectReservation,
        eventTitle: reservation.events?.title,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Perform check-in
  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("reservations")
    .update({
      checked_in_at: nowIso,
      checked_in_by: staffUserId,
    })
    .eq("id", reservation.id);

  if (updateError) {
    return new Response(JSON.stringify({ success: false, message: m.internalError, qrType: "reservation" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Record scan
  try {
    await supabaseAdmin.from('reservation_scans').insert({
      reservation_id: reservation.id,
      scanned_by: staffUserId,
      scan_type: 'check_in',
      device_info: { source: 'unified_scanner' },
      success: true,
    });
  } catch (e) {
    console.error('[VALIDATE-QR] Failed to record scan', e);
  }

  logStep("Reservation checked in", { reservationId: reservation.id });

  // Get business owner user_id for in-app notification
  const { data: businessOwnerData } = await supabaseAdmin
    .from("businesses")
    .select("user_id")
    .eq("id", businessId)
    .single();

  // Get location name for notifications
  const locationName = isDirectReservation 
    ? reservation.businesses?.name 
    : reservation.events?.title;

  // Create in-app notification for business owner
  if (businessOwnerData?.user_id) {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: businessOwnerData.user_id,
        title: '✅ Check-in κράτησης!',
        message: `${reservation.reservation_name} • ${reservation.party_size} άτομα`,
        type: 'business',
        event_type: 'reservation_checked_in',
        entity_type: 'reservation',
        entity_id: reservation.id,
        deep_link: '/dashboard-business/reservations',
        delivered_at: new Date().toISOString(),
      });
      logStep("Business in-app notification created for reservation check-in");
    } catch (notifError) {
      logStep("Failed to create business in-app notification", notifError);
    }
  }

  // Create in-app notification for user (reservation holder)
  if (reservation.user_id) {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: reservation.user_id,
        title: '✅ Check-in επιτυχές!',
        message: `Κράτηση για ${reservation.reservation_name}${locationName ? ` - ${locationName}` : ''} - Καλωσήρθατε!`,
        type: 'reservation',
        event_type: 'reservation_checked_in',
        entity_type: 'reservation',
        entity_id: reservation.id,
        deep_link: '/dashboard-user/reservations',
        delivered_at: new Date().toISOString(),
      });
      logStep("User in-app notification created for reservation check-in");
    } catch (notifError) {
      logStep("Failed to create user in-app notification", notifError);
    }
  }

  // Send push notification to user when their reservation is checked in
  if (reservation.user_id) {
    try {
      await sendPushIfEnabled(reservation.user_id, {
        title: '✅ Check-in επιτυχές!',
        body: language === "el" 
          ? `Κράτηση για ${reservation.reservation_name} - Καλωσήρθατε!` 
          : `Reservation for ${reservation.reservation_name} - Welcome!`,
        tag: `reservation-checkin-${reservation.id}`,
        data: {
          url: '/dashboard-user/reservations',
          type: 'reservation_checked_in',
          entityType: 'reservation',
          entityId: reservation.id,
        },
      }, supabaseAdmin);
      logStep("Reservation check-in push sent", { userId: reservation.user_id });
    } catch (pushError) {
      logStep("Reservation check-in push failed (non-fatal)", { error: pushError instanceof Error ? pushError.message : String(pushError) });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: m.checkedIn,
    qrType: "reservation",
    details: {
      id: reservation.id,
      name: reservation.reservation_name,
      partySize: reservation.party_size,
      arrivalTime: reservation.arrival_time,
      reservationDate: reservation.reservation_date,
      isDirectReservation,
      eventTitle: reservation.events?.title,
      businessName: reservation.businesses?.name,
      prepaidMinChargeCents: reservation.prepaid_min_charge_cents,
      prepaidChargeStatus: reservation.prepaid_charge_status,
      seatingType: reservation.seating_type,
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Handler for Student QR
async function handleStudentQR(
  supabaseAdmin: any,
  token: string,
  businessId: string,
  business: any,
  staffUserId: string,
  m: ReturnType<typeof msg>,
  language: Language,
  qrBusinessId?: string // The businessId encoded in the QR code
) {
  logStep("Processing student", { token: token.substring(0, 20), qrBusinessId });

  // CRITICAL: Validate that the QR code was generated for THIS business
  // If qrBusinessId is present in the QR, it MUST match the scanning business
  if (qrBusinessId && qrBusinessId !== businessId) {
    return new Response(JSON.stringify({
      success: false,
      message: language === "el" 
        ? "Αυτός ο QR κώδικας δεν ισχύει για αυτή την επιχείρηση" 
        : "This QR code is not valid for this business",
      qrType: "student"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If no qrBusinessId in the QR code, reject it (old format not supported anymore)
  if (!qrBusinessId) {
    return new Response(JSON.stringify({
      success: false,
      message: language === "el" 
        ? "Μη έγκυρος QR κώδικας - παρακαλώ ζητήστε νέο κώδικα από τη σελίδα της επιχείρησης" 
        : "Invalid QR code - please request a new code from the business page",
      qrType: "student"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!business.student_discount_enabled) {
    return new Response(JSON.stringify({
      success: false,
      message: language === "el" ? "Οι φοιτητικές εκπτώσεις δεν είναι ενεργοποιημένες" : "Student discounts not enabled",
      qrType: "student"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Look up student verification
  const { data: verification, error: verificationError } = await supabaseAdmin
    .from('student_verifications')
    .select(`id, status, expires_at, user_id, university_name`)
    .eq('qr_code_token', token)
    .single();

  if (verificationError || !verification) {
    return new Response(JSON.stringify({ success: false, message: m.studentNotFound, qrType: "student" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (verification.status !== 'approved') {
    return new Response(JSON.stringify({ success: false, message: m.studentNotFound, qrType: "student" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (verification.expires_at && new Date(verification.expires_at) < new Date()) {
    return new Response(JSON.stringify({ success: false, message: m.studentExpired, qrType: "student" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check if "once" mode and already redeemed
  if (business.student_discount_mode === 'once') {
    const { data: existingRedemptions } = await supabaseAdmin
      .from('student_discount_redemptions')
      .select('id')
      .eq('student_verification_id', verification.id)
      .eq('business_id', businessId)
      .limit(1);

    if (existingRedemptions && existingRedemptions.length > 0) {
      return new Response(JSON.stringify({ success: false, message: m.studentAlreadyRedeemed, qrType: "student" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Fetch student profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", verification.user_id)
    .single();

  logStep("Student verified", { verificationId: verification.id });

  // Record the redemption immediately (price entry is optional)
  const { data: redemptionRow, error: redemptionError } = await supabaseAdmin
    .from('student_discount_redemptions')
    .insert({
      student_verification_id: verification.id,
      business_id: businessId,
      scanned_by: staffUserId,
      original_price_cents: 0,
      discounted_price_cents: 0,
      discount_amount_cents: 0,
      item_description: null,
    })
    .select('id')
    .single();

  if (redemptionError || !redemptionRow?.id) {
    logStep("Student redemption insert failed", { redemptionError });
    return new Response(JSON.stringify({ success: false, message: m.internalError, qrType: "student" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  logStep("Student redemption recorded", { verificationId: verification.id, redemptionId: redemptionRow.id });

  // Return success - scan is recorded immediately
  return new Response(JSON.stringify({
    success: true,
    message: language === "el" ? "Φοιτητική έκπτωση καταγράφηκε!" : "Student discount recorded!",
    qrType: "student",
    // IMPORTANT: Student scans should go straight to the price-entry UI (optional)
    // to avoid duplicated success blocks in the unified scanner.
    requiresPriceEntry: true,
    details: {
      redemptionId: redemptionRow.id,
      verificationId: verification.id,
      studentName: profile?.name || "Unknown",
      universityName: verification.university_name,
      avatarUrl: profile?.avatar_url,
      discountPercent: business.student_discount_percent || 0,
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
