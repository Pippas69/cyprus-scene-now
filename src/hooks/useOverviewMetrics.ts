import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OverviewMetrics {
  totalViews: number;
  customersThruFomo: number;
  repeatCustomers: number;
  bookings: number;
  tickets: number;
  visitsViaQR: number;
}

export const useOverviewMetrics = (businessId: string, dateRange?: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ["overview-metrics", businessId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    queryFn: async (): Promise<OverviewMetrics> => {
      const startDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.to || new Date();

      // Get business events for filtering
      const { data: events } = await supabase
        .from("events")
        .select("id, event_type")
        .eq("business_id", businessId);
      
      const eventIds = events?.map(e => e.id) || [];
      const ticketEventIds = (events || [])
        .filter(e => e.event_type !== 'reservation')
        .map(e => e.id);

      // Get business discounts for filtering
      const { data: businessDiscounts } = await supabase
        .from("discounts")
        .select("id")
        .eq("business_id", businessId);
      
      const discountIds = businessDiscounts?.map(d => d.id) || [];

      // =====================================================
      // 1. TOTAL VIEWS (profile + offers + events - ALL combined)
      // =====================================================
      
      // Profile views
      const { count: profileViews } = await supabase
        .from("engagement_events")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("event_type", "profile_view")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Offer views
      let offerViews = 0;
      if (discountIds.length > 0) {
        const { count } = await supabase
          .from("discount_views")
          .select("*", { count: "exact", head: true })
          .in("discount_id", discountIds)
          .gte("viewed_at", startDate.toISOString())
          .lte("viewed_at", endDate.toISOString());
        offerViews = count || 0;
      }

      // Event views
      let eventViews = 0;
      if (eventIds.length > 0) {
        const { count } = await supabase
          .from("event_views")
          .select("*", { count: "exact", head: true })
          .in("event_id", eventIds)
          .gte("viewed_at", startDate.toISOString())
          .lte("viewed_at", endDate.toISOString());
        eventViews = count || 0;
      }

      const totalViews = (profileViews || 0) + offerViews + eventViews;

      // =====================================================
      // 2. CUSTOMERS (unique people) + RETURNING
      // Customer = unique person in CRM (matches CRM tab exactly)
      // Returning = registered users with 2+ distinct interactions
      // =====================================================

      // A) Count unique customers from CRM guests (source of truth)
      const { count: crmGuestCount } = await supabase
        .from("crm_guests")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const customersThruFomo = crmGuestCount || 0;

      // B) Load sources for "returning" calculation and other metrics
      const [ticketsRes, directReservationsRes, eventReservationsRes, offerPurchasesRes, studentRedemptionsRes] = await Promise.all([
        eventIds.length > 0
          ? supabase
              .from("tickets")
              .select("id, user_id, order_id")
              .in("event_id", eventIds)
              .gte("created_at", startDate.toISOString())
              .lte("created_at", endDate.toISOString())
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("reservations")
          .select("id, user_id, party_size")
          .eq("business_id", businessId)
          .is("event_id", null)
          .eq("status", "accepted")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        eventIds.length > 0
          ? supabase
              .from("reservations")
              .select("id, user_id, party_size")
              .in("event_id", eventIds)
              .eq("status", "accepted")
              .or("auto_created_from_tickets.is.null,auto_created_from_tickets.eq.false")
              .gte("created_at", startDate.toISOString())
              .lte("created_at", endDate.toISOString())
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("offer_purchases")
          .select("id, user_id, reservation_id, claim_type, party_size")
          .eq("business_id", businessId)
          .in("status", ["paid", "redeemed"])
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supabase
          .from("student_discount_redemptions")
          .select("id, student_verification_id")
          .eq("business_id", businessId)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
      ]);

      const ticketsData = (ticketsRes.data || []) as { id: string; user_id: string | null; order_id: string }[];
      const directReservations = (directReservationsRes.data || []) as { id: string; user_id: string | null; party_size: number }[];
      const eventReservations = (eventReservationsRes.data || []) as { id: string; user_id: string | null; party_size: number }[];
      const offerPurchases = (offerPurchasesRes.data || []) as { id: string; user_id: string | null; reservation_id: string | null; claim_type: string | null; party_size: number | null }[];
      const standaloneOfferPurchases = offerPurchases.filter(
        (purchase) => !purchase.reservation_id || purchase.claim_type === "walk_in"
      );
      const studentRedemptions = (studentRedemptionsRes.data || []) as { id: string; student_verification_id: string }[];

      // C) Resolve student verification -> user
      const studentVerificationIds = Array.from(
        new Set(studentRedemptions.map((r) => r.student_verification_id).filter(Boolean))
      );
      const studentUserByVerification = new Map<string, string>();
      if (studentVerificationIds.length > 0) {
        const { data: studentVerifications } = await supabase
          .from("student_verifications")
          .select("id, user_id")
          .in("id", studentVerificationIds);
        (studentVerifications || []).forEach((v) => {
          if (v.id && v.user_id) studentUserByVerification.set(v.id, v.user_id);
        });
      }

      // D) Track registered user actions for "returning" calculation
      const registeredActionCounts: Record<string, number> = {};
      const seenRegisteredActions = new Set<string>();

      const countRegisteredAction = (userId: string | null | undefined, actionKey: string) => {
        if (!userId) return;
        const dedupeKey = `${userId}:${actionKey}`;
        if (seenRegisteredActions.has(dedupeKey)) return;
        seenRegisteredActions.add(dedupeKey);
        registeredActionCounts[userId] = (registeredActionCounts[userId] || 0) + 1;
      };

      // Ticket registered actions (deduplicate by order)
      ticketsData.forEach((t) => {
        if (t.user_id) countRegisteredAction(t.user_id, `ticket_order:${t.order_id}`);
      });

      // Direct reservation actions
      directReservations.forEach((r) => {
        if (r.user_id) countRegisteredAction(r.user_id, `reservation:${r.id}`);
      });

      // Event reservation actions
      eventReservations.forEach((r) => {
        if (r.user_id) countRegisteredAction(r.user_id, `event_reservation:${r.id}`);
      });

      // Standalone offer purchase actions
      standaloneOfferPurchases.forEach((p) => {
        if (p.user_id) countRegisteredAction(p.user_id, `offer_purchase:${p.id}`);
      });

      // Student discount actions
      studentRedemptions.forEach((r) => {
        const studentUserId = studentUserByVerification.get(r.student_verification_id) || null;
        if (studentUserId) countRegisteredAction(studentUserId, `student_redemption:${r.id}`);
      });
      const repeatCustomers = Object.values(registeredActionCounts).filter((count) => count >= 2).length;

      // =====================================================
      // 4. BOOKINGS (all accepted reservations - 3 types)
      // - Direct from business profile
      // - Via offers (optional reservation)
      // - Via events (minimum charge)
      // =====================================================
      
      // Direct reservations from business profile
      const { count: directBookings } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .is("event_id", null) // Not linked to an event
        .eq("status", "accepted")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Event reservations (only from events with accepts_reservations=true)
      let eventBookings = 0;
      if (eventIds.length > 0) {
        // First get events that have reservation option enabled
        const { data: eventsWithReservations } = await supabase
          .from("events")
          .select("id")
          .eq("business_id", businessId)
          .eq("accepts_reservations", true);
        
        const eventIdsWithReservations = eventsWithReservations?.map(e => e.id) || [];
        
        if (eventIdsWithReservations.length > 0) {
          const { count } = await supabase
            .from("reservations")
            .select("*", { count: "exact", head: true })
            .in("event_id", eventIdsWithReservations)
            .eq("status", "accepted")
            .or("auto_created_from_tickets.is.null,auto_created_from_tickets.eq.false,seating_type_id.not.is.null")
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString());
          eventBookings = count || 0;
        }
      }

      const bookings = (directBookings || 0) + eventBookings;

      // =====================================================
      // 5. TICKETS (all tickets from events only)
      // =====================================================
      let tickets = 0;
      if (eventIds.length > 0) {
        const { count } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .in("event_id", eventIds)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
        tickets = count || 0;
      }

      // =====================================================
      // 6. VISITS (verified visits at venue) — SINGLE SOURCE OF TRUTH
      // Visits MUST match Performance / Boost Value / Audience:
      // - Offer visits: successful offer QR scans (offer_purchases.redeemed_at)
      // - Ticket visits: ticket check-ins (tickets.checked_in_at)
      // - Reservation visits: reservation check-ins (reservations.checked_in_at)
      //   * direct reservations (reservation.event_id IS NULL)
      //   * event reservations (reservation.event_id IN business events)
      // - Student discount visits: student discount redemptions (student_discount_redemptions.created_at)
      // =====================================================

      // A. Offer visits (verified redemptions)
      // IMPORTANT: We count ONLY one visit per redemption using offer_purchases.redeemed_at.
      // discount_scans can record multiple scan attempts for the same redemption.
      let offerVisits = 0;
      if (discountIds.length > 0) {
        const { count } = await supabase
          .from("offer_purchases")
          .select("id", { count: "exact", head: true })
          .in("discount_id", discountIds)
          .not("redeemed_at", "is", null)
          .gte("redeemed_at", startDate.toISOString())
          .lte("redeemed_at", endDate.toISOString());
        offerVisits = count || 0;
      }

      // B. Ticket visits (checked-in tickets)
      let ticketVisits = 0;
      if (eventIds.length > 0) {
        const { count } = await supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", startDate.toISOString())
          .lte("checked_in_at", endDate.toISOString());
        ticketVisits = count || 0;
      }

      // C. Reservation visits (verified reservation check-ins)
      // IMPORTANT: Offer-linked reservations also have event_id = NULL, so we must exclude them from direct profile visits.
      const { data: directResCheckins } = await supabase
        .from("reservations")
        .select("id, special_requests")
        .eq("business_id", businessId)
        .is("event_id", null)
        .not("checked_in_at", "is", null)
        .gte("checked_in_at", startDate.toISOString())
        .lte("checked_in_at", endDate.toISOString());

      // Offer-linked reservations can have event_id = NULL.
      // Some offer-reservations are only marked in reservations.special_requests
      // (e.g. "Offer claim: ..."), so we exclude those too.
      const offerMarkedReservationIds = new Set(
        (directResCheckins || [])
          .filter((r) => (r.special_requests || "").toLowerCase().includes("offer claim:"))
          .map((r) => r.id)
      );

      const directResIds = (directResCheckins || []).map((r) => r.id);

      let offerLinkedReservationIds = new Set<string>();
      if (directResIds.length > 0) {
        const { data: offerLinks } = await supabase
          .from("offer_purchases")
          .select("reservation_id")
          .in("reservation_id", directResIds)
          .not("reservation_id", "is", null);

        offerLinkedReservationIds = new Set(
          (offerLinks || [])
            .map((o) => (o as { reservation_id: string | null }).reservation_id)
            .filter(Boolean) as string[]
        );
      }

      const directReservationVisits = directResIds.filter(
        (id) => !offerLinkedReservationIds.has(id) && !offerMarkedReservationIds.has(id)
      ).length;

      let eventReservationVisits = 0;
      if (eventIds.length > 0) {
        // Fetch event reservations with check-ins
        const { data: eventResCheckins } = await supabase
          .from("reservations")
          .select("id, user_id, event_id")
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .or("auto_created_from_tickets.is.null,auto_created_from_tickets.eq.false")
          .gte("checked_in_at", startDate.toISOString())
          .lte("checked_in_at", endDate.toISOString());

        // Exclude reservations linked via ticket_orders (hybrid events)
        const eventResIds = (eventResCheckins || []).map((r) => r.id);
        let linkedResIds = new Set<string>();
        if (eventResIds.length > 0) {
          const { data: linkedRows } = await supabase
            .from("ticket_orders")
            .select("linked_reservation_id")
            .in("linked_reservation_id", eventResIds)
            .not("linked_reservation_id", "is", null);
          linkedResIds = new Set(
            (linkedRows || [])
              .map((row) => (row as { linked_reservation_id: string | null }).linked_reservation_id)
              .filter(Boolean) as string[]
          );
        }

        // Build a set of (user_id, event_id) pairs that already have a checked-in ticket
        const ticketCheckinPairs = new Set<string>();
        if ((eventResCheckins || []).length > 0) {
          const { data: checkedInTickets } = await supabase
            .from("tickets")
            .select("user_id, event_id")
            .in("event_id", eventIds)
            .not("checked_in_at", "is", null);
          (checkedInTickets || []).forEach((t) => {
            if (t.user_id && t.event_id) {
              ticketCheckinPairs.add(`${t.user_id}:${t.event_id}`);
            }
          });
        }

        eventReservationVisits = (eventResCheckins || []).filter((r) => {
          // Skip linked reservations
          if (linkedResIds.has(r.id)) return false;
          // Exclude if this user already has a checked-in ticket for the same event
          if (r.user_id && r.event_id && ticketCheckinPairs.has(`${r.user_id}:${r.event_id}`)) {
            return false;
          }
          return true;
        }).length;
      }

      // D. Student discount visits (student discount redemptions at this business)
      const { count: studentDiscountVisits } = await supabase
        .from("student_discount_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const visitsViaQR =
        offerVisits +
        ticketVisits +
        directReservationVisits +
        eventReservationVisits +
        (studentDiscountVisits || 0);

      return {
        totalViews,
        customersThruFomo,
        repeatCustomers,
        bookings,
        tickets,
        visitsViaQR,
      };
    },
    enabled: !!businessId,
  });
};
