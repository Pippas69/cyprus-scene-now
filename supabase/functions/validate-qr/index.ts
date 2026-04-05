import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";
import { buildNotificationKey, markAsSent, wasAlreadySent } from "../_shared/notification-idempotency.ts";
import { getEmailForUserId } from "../_shared/user-email.ts";
import { 
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";
  wrapPremiumEmail, 
  wrapBusinessEmail, 
  emailTitle, 
  emailGreeting, 
  infoCard, 
  detailRow, 
  successBadge,
  discountBadge,
} from "../_shared/email-templates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    return new Response(null, { headers: securityHeaders });
  }

  const startedAt = Date.now();

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitId = (req.headers.get("Authorization") || clientIP).substring(0, 40) + ":" + clientIP;
    const rateCheck = await checkRateLimit(rateLimitId, "validate_qr", 60, 5);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: msg("en").unauthorized }), {
        status: 401,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
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
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ValidateQRRequest;
    const language: Language = body.language === "el" ? "el" : "en";
    const m = msg(language);

    if (!body.qrData || !body.businessId) {
      return new Response(JSON.stringify({ success: false, message: m.invalidRequest }), {
        status: 400,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Request", { userId: user.id, businessId: body.businessId, qrData: body.qrData.substring(0, 50) });

    // Verify the caller owns this business
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, name, user_id, student_discount_enabled, student_discount_percent, student_discount_mode")
      .eq("id", body.businessId)
      .single();

    if (businessError || !business) {
      logStep("Business not found", { businessError });
      return new Response(JSON.stringify({ success: false, message: m.wrongBusiness }), {
        status: 200,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    if (business.user_id !== user.id) {
      logStep("Wrong business owner", { expected: business.user_id, actual: user.id });
      return new Response(JSON.stringify({ success: false, message: m.wrongBusiness }), {
        status: 200,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
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
      .select(`*, ticket_tiers(name, price_cents), ticket_orders(customer_name, customer_email, user_id, linked_reservation_id), events(id, title, start_at, business_id)`)
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

    // 3. Try reservation guest (per-guest QR code)
    const { data: reservationGuest } = await supabaseAdmin
      .from("reservation_guests")
      .select(`*, reservations(*, events(id, title, start_at, business_id), businesses(id, name))`)
      .eq("qr_code_token", token)
      .single();

    if (reservationGuest) {
      return await handleReservationGuestQR(supabaseAdmin, reservationGuest, body.businessId, user.id, m, language);
    }

    // 4. Try reservation (legacy single QR)
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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[VALIDATE-QR] Unhandled error", error);
    return new Response(JSON.stringify({ success: false, message: msg("en").internalError }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
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
        customerName: ticket.guest_name || ticket.ticket_orders?.customer_name,
        eventTitle: ticket.events?.title,
        checkedInAt: ticket.checked_in_at,
      }
    }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  // Atomic check-in: UPDATE WHERE status='valid' prevents double check-in race condition
  const { data: checkinResult, error: checkinError } = await supabaseAdmin
    .rpc("atomic_ticket_checkin", {
      p_ticket_id: ticket.id,
      p_staff_user_id: staffUserId,
    });

  if (checkinError) {
    logStep("Atomic ticket checkin RPC failed", { checkinError });
    return new Response(JSON.stringify({ success: false, message: m.internalError, qrType: "ticket" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (!checkinResult?.success) {
    logStep("Atomic ticket checkin rejected", { error: checkinResult?.error });
    const errorMessage = checkinResult?.error === 'ALREADY_USED' ? m.ticketAlreadyUsed : m.ticketCancelled;
    return new Response(JSON.stringify({
      success: false,
      message: errorMessage,
      qrType: "ticket",
      alreadyUsed: checkinResult?.error === 'ALREADY_USED',
      details: {
        tierName: ticket.ticket_tiers?.name,
        customerName: ticket.guest_name || ticket.ticket_orders?.customer_name,
        eventTitle: ticket.events?.title,
      }
    }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  logStep("Ticket checked in", { ticketId: ticket.id });

  // ==================== AUTO CHECK-IN LINKED RESERVATION ====================
  let linkedReservationInfo: any = null;
  try {
    const linkedReservationId = ticket.ticket_orders?.linked_reservation_id;

    if (linkedReservationId) {
      const { data: linkedResBase, error: linkedResBaseError } = await supabaseAdmin
        .from("reservations")
        .select("id, party_size, ticket_credit_cents, prepaid_min_charge_cents, reservation_name, status, checked_in_at, seating_type_id")
        .eq("id", linkedReservationId)
        .maybeSingle();

      if (linkedResBaseError) {
        logStep("Linked reservation fetch error", { linkedReservationId, error: linkedResBaseError.message });
      }

      if (linkedResBase) {
        let linkedResForUi = linkedResBase;

        if (linkedResBase.status === "accepted" && !linkedResBase.checked_in_at) {
          const { data: updatedLinkedRes, error: updateLinkedResError } = await supabaseAdmin
            .from("reservations")
            .update({ checked_in_at: new Date().toISOString() })
            .eq("id", linkedReservationId)
            .eq("status", "accepted")
            .is("checked_in_at", null)
            .select("id, party_size, ticket_credit_cents, prepaid_min_charge_cents, reservation_name, status, checked_in_at, seating_type_id")
            .maybeSingle();

          if (updateLinkedResError) {
            logStep("Linked reservation check-in update error", { linkedReservationId, error: updateLinkedResError.message });
          }

          if (updatedLinkedRes) {
            linkedResForUi = updatedLinkedRes;
          }
        }

        // Only show reservation info if it's a real table reservation (has seating_type_id)
        // Walk-in tickets don't have table reservations, so skip the reservation UI
        if (linkedResForUi.seating_type_id) {
          // Look up correct min charge from seating tiers based on party size
          let tierMinChargeCents: number | null = null;
          try {
            const { data: tiers } = await supabaseAdmin
              .from("seating_type_tiers")
              .select("min_people, max_people, prepaid_min_charge_cents")
              .eq("seating_type_id", linkedResForUi.seating_type_id)
              .order("min_people", { ascending: true });
            if (tiers) {
              const matchedTier = tiers.find((t: any) => linkedResForUi.party_size >= t.min_people && linkedResForUi.party_size <= t.max_people);
              const fallbackTier = matchedTier ?? [...tiers].reverse().find((t: any) => linkedResForUi.party_size >= t.min_people) ?? tiers[0];
              if (fallbackTier) tierMinChargeCents = fallbackTier.prepaid_min_charge_cents;
            }
          } catch (tierErr) {
            logStep("Tier lookup error (non-fatal)", { error: tierErr instanceof Error ? tierErr.message : String(tierErr) });
          }

          linkedReservationInfo = {
            reservationId: linkedResForUi.id,
            partySize: linkedResForUi.party_size,
            minimumChargeCents: tierMinChargeCents ?? linkedResForUi.prepaid_min_charge_cents ?? linkedResForUi.ticket_credit_cents ?? 0,
            ticketCreditCents: linkedResForUi.ticket_credit_cents,
            reservationName: linkedResForUi.reservation_name,
          };
          logStep("Linked reservation info prepared", linkedReservationInfo);
        } else {
          logStep("Walk-in ticket detected (no seating_type_id), skipping reservation UI info");
        }
      }
    }
  } catch (linkedResError) {
    logStep("Linked reservation check-in error (non-fatal)", { error: linkedResError instanceof Error ? linkedResError.message : String(linkedResError) });
  }

  // Get business owner user_id for in-app notification
  const { data: eventData } = await supabaseAdmin
    .from("events")
    .select("business_id, businesses(user_id, name)")
    .eq("id", ticket.events?.id)
    .single();

  const businessName = (eventData?.businesses as any)?.name || '';

  // Create in-app notification for business owner
  if (eventData?.businesses?.user_id) {
    try {
      const displayName = ticket.guest_name || ticket.ticket_orders?.customer_name || 'Πελάτης';
      const notifMessage = linkedReservationInfo
        ? `${displayName} έκανε check-in για "${ticket.events?.title}" + Κράτηση ${linkedReservationInfo.partySize} ατόμων`
        : `${displayName} έκανε check-in για "${ticket.events?.title}"`;

      await supabaseAdmin.from('notifications').insert({
        user_id: eventData.businesses.user_id,
        title: linkedReservationInfo ? '✅ Check-in εισιτηρίου + Κράτηση!' : '✅ Check-in εισιτηρίου!',
        message: notifMessage,
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

  // Create in-app notification for user (ticket holder)
  const ticketUserId = ticket.ticket_orders?.user_id;
  if (ticketUserId) {
    try {
      const linkedAmountCents = linkedReservationInfo?.minimumChargeCents ?? linkedReservationInfo?.ticketCreditCents ?? 0;
      const userMessage = linkedReservationInfo
        ? `Καλωσήρθατε στο "${ticket.events?.title}"${businessName ? ` - ${businessName}` : ''}. Κράτηση ενεργοποιήθηκε (${linkedReservationInfo.partySize} άτομα, minimum charge €${(linkedAmountCents / 100).toFixed(2)})`
        : `Καλωσήρθατε στο "${ticket.events?.title}"${businessName ? ` - ${businessName}` : ''}`;

      await supabaseAdmin.from('notifications').insert({
        user_id: ticketUserId,
        title: linkedReservationInfo ? '✅ Check-in + Κράτηση!' : '✅ Check-in επιτυχές!',
        message: userMessage,
        type: 'ticket',
        event_type: 'ticket_checked_in',
        entity_type: 'ticket',
        entity_id: ticket.id,
        deep_link: `/event/${ticket.events?.id}`,
        delivered_at: new Date().toISOString(),
      });
      logStep("User in-app notification created for ticket check-in");
    } catch (notifError) {
      logStep("Failed to create user in-app notification", notifError);
    }
  }

  // Send push notification to user when their ticket is checked in
  if (ticketUserId) {
    try {
      const pushBody = linkedReservationInfo
        ? (language === "el" 
            ? `Καλωσήρθατε στο "${ticket.events?.title}" - Κράτηση ενεργοποιήθηκε!` 
            : `Welcome to "${ticket.events?.title}" - Reservation activated!`)
        : (language === "el" 
            ? `Καλωσήρθατε στο "${ticket.events?.title}"` 
            : `Welcome to "${ticket.events?.title}"`);

      await sendPushIfEnabled(ticketUserId, {
        title: linkedReservationInfo ? '✅ Check-in + Κράτηση!' : '✅ Check-in επιτυχές!',
        body: pushBody,
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
    message: linkedReservationInfo 
      ? (language === "el" ? "Check-in + Κράτηση ενεργοποιήθηκε!" : "Check-in + Reservation activated!")
      : m.checkedIn,
    qrType: "ticket",
    linkedReservation: linkedReservationInfo,
    details: {
      id: ticket.id,
      tierName: ticket.ticket_tiers?.name,
      tierPrice: ticket.ticket_tiers?.price_cents,
      customerName: ticket.guest_name || ticket.ticket_orders?.customer_name,
      customerEmail: maskEmail(ticket.ticket_orders?.customer_email),
      eventTitle: ticket.events?.title,
      eventStartAt: ticket.events?.start_at,
    }
  }), {
    status: 200,
    headers: { ...securityHeaders, "Content-Type": "application/json" },
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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (purchase.status !== "paid") {
    return new Response(JSON.stringify({ success: false, message: m.offerNotPaid, qrType: "offer" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
    return new Response(JSON.stringify({ success: false, message: m.offerExpired, qrType: "offer" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  // NOTE: We intentionally do NOT enforce valid_days / valid_start_time / valid_end_time at scan time.
  // The only hard rules for offer QR redemption are:
  // - correct business
  // - paid
  // - not expired
  // - single-use (not already redeemed)
  // This prevents false negatives like “Η προσφορά δεν ισχύει αυτή την ώρα” for legitimate redemptions.

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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
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

  // Push + emails with idempotency (so even if another function also fires, user gets 1 notification)
  const userPushKey = purchase.user_id
    ? buildNotificationKey({ channel: "push", eventType: "offer_redeemed", recipientUserId: purchase.user_id, entityType: "offer", entityId: purchase.id })
    : null;
  const bizPushKey = businessData?.user_id
    ? buildNotificationKey({ channel: "push", eventType: "offer_redeemed", recipientUserId: businessData.user_id, entityType: "offer", entityId: purchase.id })
    : null;

  // Send push notification to user
  if (purchase.user_id && userPushKey && !(await wasAlreadySent(supabaseAdmin, purchase.user_id, userPushKey))) {
    try {
      await sendPushIfEnabled(
        purchase.user_id,
        {
          title: '✅ Προσφορά εξαργυρώθηκε!',
          body: language === "el" ? `"${discount.title}" εξαργυρώθηκε επιτυχώς` : `"${discount.title}" redeemed successfully`,
          tag: `n:offer_redeemed:${purchase.id}`,
          data: {
            url: '/dashboard-user/offers',
            type: 'offer_redeemed',
            entityType: 'offer',
            entityId: purchase.id,
          },
        },
        supabaseAdmin
      );
      await markAsSent(supabaseAdmin, purchase.user_id, userPushKey, "offer", purchase.id);
      logStep("Offer redemption push sent", { userId: purchase.user_id });
    } catch (pushError) {
      logStep("Offer redemption push failed (non-fatal)", { error: pushError instanceof Error ? pushError.message : String(pushError) });
    }
  } else if (purchase.user_id && userPushKey) {
    logStep("Skipping duplicate offer user push", { userPushKey });
  }

  // Send push notification to business
  if (businessData?.user_id && bizPushKey && !(await wasAlreadySent(supabaseAdmin, businessData.user_id, bizPushKey))) {
    try {
      await sendPushIfEnabled(
        businessData.user_id,
        {
          title: '✅ Εξαργύρωση προσφοράς!',
          body: `${customerName} εξαργύρωσε "${discount.title}"`,
          tag: `n:offer_redeemed:${purchase.id}`,
          data: {
            url: '/dashboard-business/discounts',
            type: 'offer_redeemed',
            entityType: 'offer',
            entityId: purchase.id,
          },
        },
        supabaseAdmin
      );
      await markAsSent(supabaseAdmin, businessData.user_id, bizPushKey, "offer", purchase.id);
      logStep("Business offer redemption push sent", { userId: businessData.user_id });
    } catch (pushError) {
      logStep("Business offer redemption push failed (non-fatal)", { error: pushError instanceof Error ? pushError.message : String(pushError) });
    }
  } else if (businessData?.user_id && bizPushKey) {
    logStep("Skipping duplicate offer business push", { bizPushKey });
  }

  // NOTE: Emails are intentionally NOT sent for offer redemptions.
  // Push notifications and in-app notifications are sufficient for this event.

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
    headers: { ...securityHeaders, "Content-Type": "application/json" },
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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (reservation.status === "cancelled") {
    return new Response(JSON.stringify({ success: false, message: m.reservationCancelled, qrType: "reservation" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (reservation.status === "declined") {
    return new Response(JSON.stringify({ success: false, message: m.reservationDeclined, qrType: "reservation" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (reservation.status === "pending") {
    return new Response(JSON.stringify({ success: false, message: m.reservationPending, qrType: "reservation" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  // Atomic check-in: UPDATE WHERE checked_in_at IS NULL prevents double check-in race condition
  const nowIso = new Date().toISOString();
  const { data: checkinResult, error: checkinError } = await supabaseAdmin
    .rpc("atomic_reservation_checkin", {
      p_reservation_id: reservation.id,
      p_staff_user_id: staffUserId,
    });

  if (checkinError) {
    logStep("Atomic reservation checkin RPC failed", { checkinError });
    return new Response(JSON.stringify({ success: false, message: m.internalError, qrType: "reservation" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
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
    headers: { ...securityHeaders, "Content-Type": "application/json" },
  });
}

// Handler for Reservation Guest QR (per-guest individual QR code)
async function handleReservationGuestQR(
  supabaseAdmin: any,
  guest: any,
  businessId: string,
  staffUserId: string,
  m: ReturnType<typeof msg>,
  language: Language
) {
  const reservation = guest.reservations;
  if (!reservation) {
    return new Response(JSON.stringify({ success: false, message: m.notFound, qrType: "reservation" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  logStep("Processing reservation guest", { guestId: guest.id, guestName: guest.guest_name, reservationId: reservation.id });

  const isDirectReservation = !reservation.event_id && !!reservation.business_id;
  const reservationBusinessId = isDirectReservation ? reservation.business_id : reservation.events?.business_id;

  if (reservationBusinessId !== businessId) {
    return new Response(JSON.stringify({ success: false, message: m.wrongBusiness, qrType: "reservation" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (reservation.status === "cancelled") {
    return new Response(JSON.stringify({ success: false, message: m.reservationCancelled, qrType: "reservation" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (reservation.status === "declined") {
    return new Response(JSON.stringify({ success: false, message: m.reservationDeclined, qrType: "reservation" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (reservation.status === "pending") {
    return new Response(JSON.stringify({ success: false, message: m.reservationPending, qrType: "reservation" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  // Check if this specific guest is already checked in
  if (guest.checked_in_at) {
    return new Response(JSON.stringify({
      success: false,
      message: m.reservationAlreadyCheckedIn,
      qrType: "reservation_guest",
      alreadyCheckedIn: true,
      details: {
        id: guest.id,
        reservationId: reservation.id,
        guestName: guest.guest_name,
        name: reservation.reservation_name,
        partySize: reservation.party_size,
        checkedInAt: guest.checked_in_at,
        isDirectReservation,
        eventTitle: reservation.events?.title,
      }
    }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  // Check in this specific guest
  const nowIso = new Date().toISOString();
  const { error: checkinError } = await supabaseAdmin
    .from("reservation_guests")
    .update({ checked_in_at: nowIso, checked_in_by: staffUserId, status: "used" })
    .eq("id", guest.id)
    .is("checked_in_at", null);

  if (checkinError) {
    logStep("Guest check-in failed", { checkinError });
    return new Response(JSON.stringify({ success: false, message: m.internalError, qrType: "reservation_guest" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  // Count total checked-in guests for this reservation
  const { count: checkedInCount } = await supabaseAdmin
    .from("reservation_guests")
    .select("id", { count: "exact", head: true })
    .eq("reservation_id", reservation.id)
    .not("checked_in_at", "is", null);

  // If all guests are checked in, also check in the reservation itself
  if (checkedInCount >= reservation.party_size && !reservation.checked_in_at) {
    await supabaseAdmin.rpc("atomic_reservation_checkin", {
      p_reservation_id: reservation.id,
      p_staff_user_id: staffUserId,
    });
  }

  // Record scan
  try {
    await supabaseAdmin.from('reservation_scans').insert({
      reservation_id: reservation.id,
      scanned_by: staffUserId,
      scan_type: 'guest_check_in',
      device_info: { source: 'unified_scanner', guest_id: guest.id, guest_name: guest.guest_name },
      success: true,
    });
  } catch (e) {
    console.error('[VALIDATE-QR] Failed to record guest scan', e);
  }

  logStep("Reservation guest checked in", { guestId: guest.id, guestName: guest.guest_name });

  const locationName = isDirectReservation 
    ? reservation.businesses?.name 
    : reservation.events?.title;

  // Notify business owner
  const { data: businessOwnerData } = await supabaseAdmin
    .from("businesses")
    .select("user_id")
    .eq("id", businessId)
    .single();

  if (businessOwnerData?.user_id) {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: businessOwnerData.user_id,
        title: '✅ Guest Check-in!',
        message: `${guest.guest_name} • ${reservation.reservation_name} (${checkedInCount}/${reservation.party_size})`,
        type: 'business',
        event_type: 'reservation_checked_in',
        entity_type: 'reservation',
        entity_id: reservation.id,
        deep_link: '/dashboard-business/reservations',
        delivered_at: new Date().toISOString(),
      });
    } catch (notifError) {
      logStep("Failed to create business notification", notifError);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: m.checkedIn,
    qrType: "reservation_guest",
    details: {
      id: guest.id,
      reservationId: reservation.id,
      guestName: guest.guest_name,
      name: reservation.reservation_name,
      partySize: reservation.party_size,
      checkedInCount,
      isDirectReservation,
      eventTitle: reservation.events?.title,
      businessName: reservation.businesses?.name,
    }
  }), {
    status: 200,
    headers: { ...securityHeaders, "Content-Type": "application/json" },
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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (!business.student_discount_enabled) {
    return new Response(JSON.stringify({
      success: false,
      message: language === "el" ? "Οι φοιτητικές εκπτώσεις δεν είναι ενεργοποιημένες" : "Student discounts not enabled",
      qrType: "student"
    }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (verification.status !== 'approved') {
    return new Response(JSON.stringify({ success: false, message: m.studentNotFound, qrType: "student" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  if (verification.expires_at && new Date(verification.expires_at) < new Date()) {
    return new Response(JSON.stringify({ success: false, message: m.studentExpired, qrType: "student" }), {
      status: 200,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
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
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Fetch student profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("name, avatar_url, email")
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
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  logStep("Student redemption recorded", { verificationId: verification.id, redemptionId: redemptionRow.id });

  // Get business name for notifications
  const businessName = (business as any)?.name || '';

  // Create in-app notification for business owner
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: business.user_id,
      title: '🎓 Φοιτητική έκπτωση!',
      message: `${profile?.name || 'Φοιτητής'} χρησιμοποίησε φοιτητική έκπτωση${businessName ? ` - ${business.student_discount_percent}%` : ''}`,
      type: 'business',
      event_type: 'student_discount_redeemed',
      entity_type: 'student_redemption',
      entity_id: redemptionRow.id,
      deep_link: '/dashboard-business/student-discounts',
      delivered_at: new Date().toISOString(),
    });
    logStep("Business in-app notification created for student discount");
  } catch (notifError) {
    logStep("Failed to create business in-app notification", notifError);
  }

  // Create in-app notification for student
  if (verification.user_id) {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: verification.user_id,
        title: '🎓 Φοιτητική έκπτωση εφαρμόστηκε!',
        message: `${business.student_discount_percent}% έκπτωση${businessName ? ` στο ${businessName}` : ''}`,
        type: 'student',
        event_type: 'student_discount_redeemed',
        entity_type: 'student_redemption',
        entity_id: redemptionRow.id,
        deep_link: '/dashboard-user/student',
        delivered_at: new Date().toISOString(),
      });
      logStep("User in-app notification created for student discount");
    } catch (notifError) {
      logStep("Failed to create user in-app notification", notifError);
    }

    // Send push notification to student
    try {
      await sendPushIfEnabled(verification.user_id, {
        title: '🎓 Φοιτητική έκπτωση εφαρμόστηκε!',
        body: `${business.student_discount_percent}% έκπτωση${businessName ? ` στο ${businessName}` : ''}`,
        tag: `student-discount-${redemptionRow.id}`,
        data: {
          url: '/dashboard-user/student',
          type: 'student_discount_redeemed',
          entityType: 'student_redemption',
          entityId: redemptionRow.id,
        },
      }, supabaseAdmin);
      logStep("Student discount push sent", { userId: verification.user_id });
    } catch (pushError) {
      logStep("Student discount push failed (non-fatal)", { error: pushError instanceof Error ? pushError.message : String(pushError) });
    }
   }

  // Send confirmation emails (ALWAYS) to both business + student
  try {
    // Business owner email
    const { data: bizProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, name')
      .eq('id', business.user_id)
      .single();

    const businessEmail = bizProfile?.email;
    const studentEmail = (profile as any)?.email;

    const businessNameSafe = (business as any)?.name || businessName || 'Η επιχείρησή σου';
    const studentNameSafe = (profile as any)?.name || 'Φοιτητής';

    const subjectUser = `🎓 Φοιτητική έκπτωση εφαρμόστηκε στο ${businessNameSafe}`;
    const subjectBusiness = `🎓 Φοιτητική έκπτωση χρησιμοποιήθηκε`;
    
    // Format timestamp in Cyprus timezone
    const checkInTime = new Date().toLocaleTimeString('el-GR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Nicosia'
    });
    const checkInDate = new Date().toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Nicosia'
    });

    // Premium user email content - no redemption ID
    const userContent = `
      ${successBadge('Η φοιτητική σου έκπτωση εφαρμόστηκε')}
      ${emailTitle('Καλώς ήρθες!', `Η επιχείρηση ${businessNameSafe} εφάρμοσε την έκπτωσή σου`)}
      ${discountBadge(`${business.student_discount_percent || 0}%`)}
      ${infoCard('Λεπτομέρειες', `
        ${detailRow('Επιχείρηση', businessNameSafe)}
        ${detailRow('Φοιτητής', studentNameSafe)}
        ${detailRow('Έκπτωση', `${business.student_discount_percent || 0}%`, true)}
        ${detailRow('Ημερομηνία', checkInDate)}
        ${detailRow('Ώρα', checkInTime)}
      `)}
    `;

    // Premium business email content - no redemption ID
    const businessContent = `
      ${successBadge('Νέο check-in φοιτητικής έκπτωσης')}
      ${emailTitle('Φοιτητική έκπτωση χρησιμοποιήθηκε')}
      ${infoCard('Λεπτομέρειες Πελάτη', `
        ${detailRow('Φοιτητής', studentNameSafe)}
        ${detailRow('Έκπτωση', `${business.student_discount_percent || 0}%`, true)}
        ${detailRow('Ημερομηνία', checkInDate)}
        ${detailRow('Ώρα', checkInTime)}
      `)}
    `;

    const userHtml = wrapPremiumEmail(userContent, 'Φοιτητική Έκπτωση');
    const businessHtml = wrapBusinessEmail(businessContent, 'Φοιτητική Έκπτωση');

    if (studentEmail) {
      await resend.emails.send({
        from: "ΦΟΜΟ <support@fomo.com.cy>",
        to: [studentEmail],
        subject: subjectUser,
        html: userHtml,
      });
    }

    if (businessEmail) {
      await resend.emails.send({
        from: "ΦΟΜΟ <support@fomo.com.cy>",
        to: [businessEmail],
        subject: subjectBusiness,
        html: businessHtml,
      });
    }

    logStep('Student discount emails sent', { student: !!studentEmail, business: !!businessEmail });
  } catch (emailErr) {
    logStep('Student discount email error (non-fatal)', { error: emailErr instanceof Error ? emailErr.message : String(emailErr) });
  }

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
    headers: { ...securityHeaders, "Content-Type": "application/json" },
  });
}
