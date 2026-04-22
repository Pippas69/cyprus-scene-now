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
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // ===== PHASE 1: Get business events and discounts in parallel =====
      const [eventsRes, discountsRes] = await Promise.all([
        supabase.from("events").select("id, event_type").eq("business_id", businessId),
        supabase.from("discounts").select("id").eq("business_id", businessId),
      ]);

      const events = eventsRes.data || [];
      const eventIds = events.map(e => e.id);
      const ticketEventIds = events.filter(e => e.event_type !== 'reservation').map(e => e.id);
      const discountIds = (discountsRes.data || []).map(d => d.id);

      // ===== PHASE 2: Fire ALL independent count queries in parallel =====
      const [
        profileViewsRes,
        offerViewsRes,
        eventViewsRes,
        crmGuestCountRes,
        ticketsRes,
        directReservationsRes,
        eventReservationsRes,
        offerPurchasesRes,
        studentRedemptionsRes,
        directBookingsRes,
        eventsWithReservationsRes,
        offerVisitsRes,
        ticketVisitsRes,
        directResCheckinsRes,
        studentDiscountVisitsRes,
      ] = await Promise.all([
        // Profile views
        supabase
          .from("engagement_events")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("event_type", "profile_view")
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Offer views
        discountIds.length > 0
          ? supabase
              .from("discount_views")
              .select("*", { count: "exact", head: true })
              .in("discount_id", discountIds)
              .gte("viewed_at", startISO)
              .lte("viewed_at", endISO)
          : Promise.resolve({ count: 0 }),
        // Event views
        eventIds.length > 0
          ? supabase
              .from("event_views")
              .select("*", { count: "exact", head: true })
              .in("event_id", eventIds)
              .gte("viewed_at", startISO)
              .lte("viewed_at", endISO)
          : Promise.resolve({ count: 0 }),
        // CRM guest count
        supabase
          .from("crm_guests")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Tickets (for returning customers)
        ticketEventIds.length > 0
          ? supabase
              .from("tickets")
              .select("id, user_id, order_id")
              .in("event_id", ticketEventIds)
              .gte("created_at", startISO)
              .lte("created_at", endISO)
          : Promise.resolve({ data: [], error: null }),
        // Direct reservations (exclude comp child rows)
        supabase
          .from("reservations")
          .select("id, user_id, party_size")
          .eq("business_id", businessId)
          .is("event_id", null)
          .eq("status", "accepted")
          .is("parent_reservation_id", null)
          .or("is_comp.is.null,is_comp.eq.false")
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Event reservations (exclude comp child rows)
        eventIds.length > 0
          ? supabase
              .from("reservations")
              .select("id, user_id, party_size")
              .in("event_id", eventIds)
              .eq("status", "accepted")
              .is("parent_reservation_id", null)
              .or("auto_created_from_tickets.is.null,auto_created_from_tickets.eq.false,seating_type_id.not.is.null")
              .or("is_comp.is.null,is_comp.eq.false")
              .gte("created_at", startISO)
              .lte("created_at", endISO)
          : Promise.resolve({ data: [], error: null }),
        // Offer purchases
        supabase
          .from("offer_purchases")
          .select("id, user_id, reservation_id, claim_type, party_size")
          .eq("business_id", businessId)
          .in("status", ["paid", "redeemed"])
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Student redemptions
        supabase
          .from("student_discount_redemptions")
          .select("id, student_verification_id")
          .eq("business_id", businessId)
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Direct bookings count (exclude comp child rows)
        supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId)
          .is("event_id", null)
          .eq("status", "accepted")
          .is("parent_reservation_id", null)
          .or("is_comp.is.null,is_comp.eq.false")
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Events with reservations enabled
        supabase
          .from("events")
          .select("id")
          .eq("business_id", businessId)
          .eq("accepts_reservations", true),
        // Offer visits (verified redemptions)
        discountIds.length > 0
          ? supabase
              .from("offer_purchases")
              .select("id", { count: "exact", head: true })
              .in("discount_id", discountIds)
              .not("redeemed_at", "is", null)
              .gte("redeemed_at", startISO)
              .lte("redeemed_at", endISO)
          : Promise.resolve({ count: 0 }),
        // Ticket visits (checked-in tickets)
        eventIds.length > 0
          ? supabase
              .from("tickets")
              .select("id", { count: "exact", head: true })
              .in("event_id", eventIds)
              .not("checked_in_at", "is", null)
              .gte("checked_in_at", startISO)
              .lte("checked_in_at", endISO)
          : Promise.resolve({ count: 0 }),
        // Direct reservation check-ins (for visits)
        supabase
          .from("reservations")
          .select("id, special_requests")
          .eq("business_id", businessId)
          .is("event_id", null)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", startISO)
          .lte("checked_in_at", endISO),
        // Student discount visits
        supabase
          .from("student_discount_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("created_at", startISO)
          .lte("created_at", endISO),
      ]);

      // ===== PROCESS VIEWS =====
      const totalViews = (profileViewsRes.count || 0) + (offerViewsRes.count || 0) + (eventViewsRes.count || 0);
      const customersThruFomo = crmGuestCountRes.count || 0;

      // ===== PROCESS RETURNING CUSTOMERS =====
      const ticketsData = (ticketsRes.data || []) as { id: string; user_id: string | null; order_id: string }[];
      const directReservations = (directReservationsRes.data || []) as { id: string; user_id: string | null; party_size: number }[];
      const eventReservations = (eventReservationsRes.data || []) as { id: string; user_id: string | null; party_size: number }[];
      const offerPurchases = (offerPurchasesRes.data || []) as { id: string; user_id: string | null; reservation_id: string | null; claim_type: string | null; party_size: number | null }[];
      const standaloneOfferPurchases = offerPurchases.filter(
        (purchase) => !purchase.reservation_id || purchase.claim_type === "walk_in"
      );
      const studentRedemptions = (studentRedemptionsRes.data || []) as { id: string; student_verification_id: string }[];

      // Resolve student verification -> user (only if needed)
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

      // Track registered user actions for "returning" calculation
      const registeredActionCounts: Record<string, number> = {};
      const seenRegisteredActions = new Set<string>();

      const countRegisteredAction = (userId: string | null | undefined, actionKey: string) => {
        if (!userId) return;
        const dedupeKey = `${userId}:${actionKey}`;
        if (seenRegisteredActions.has(dedupeKey)) return;
        seenRegisteredActions.add(dedupeKey);
        registeredActionCounts[userId] = (registeredActionCounts[userId] || 0) + 1;
      };

      ticketsData.forEach((t) => {
        if (t.user_id) countRegisteredAction(t.user_id, `ticket_order:${t.order_id}`);
      });
      directReservations.forEach((r) => {
        if (r.user_id) countRegisteredAction(r.user_id, `reservation:${r.id}`);
      });
      eventReservations.forEach((r) => {
        if (r.user_id) countRegisteredAction(r.user_id, `event_reservation:${r.id}`);
      });
      standaloneOfferPurchases.forEach((p) => {
        if (p.user_id) countRegisteredAction(p.user_id, `offer_purchase:${p.id}`);
      });
      studentRedemptions.forEach((r) => {
        const studentUserId = studentUserByVerification.get(r.student_verification_id) || null;
        if (studentUserId) countRegisteredAction(studentUserId, `student_redemption:${r.id}`);
      });
      const repeatCustomers = Object.values(registeredActionCounts).filter((count) => count >= 2).length;

      // ===== PROCESS BOOKINGS =====
      const eventIdsWithReservations = (eventsWithReservationsRes.data || []).map(e => e.id);
      
      // Event bookings - only if there are events with reservations
      let eventBookings = 0;
      if (eventIdsWithReservations.length > 0) {
        const { count } = await supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .in("event_id", eventIdsWithReservations)
          .eq("status", "accepted")
          .is("parent_reservation_id", null)
          .or("auto_created_from_tickets.is.null,auto_created_from_tickets.eq.false,seating_type_id.not.is.null")
          .or("is_comp.is.null,is_comp.eq.false")
          .gte("created_at", startISO)
          .lte("created_at", endISO);
        eventBookings = count || 0;
      }

      const bookings = (directBookingsRes.count || 0) + eventBookings;

      // ===== PROCESS TICKETS =====
      let tickets = 0;
      if (eventIds.length > 0) {
        const ticketAndHybridIds = events.filter(e => e.event_type !== 'reservation').map(e => e.id);
        const reservationOnlyIds = events.filter(e => e.event_type === 'reservation').map(e => e.id);

        // Fire both ticket counts in parallel
        const [ticketHybridRes, walkinOrdersRes] = await Promise.all([
          ticketAndHybridIds.length > 0
            ? supabase
                .from("tickets")
                .select("*", { count: "exact", head: true })
                .in("event_id", ticketAndHybridIds)
                .gte("created_at", startISO)
                .lte("created_at", endISO)
            : Promise.resolve({ count: 0 }),
          reservationOnlyIds.length > 0
            ? supabase
                .from("ticket_orders")
                .select("id")
                .in("event_id", reservationOnlyIds)
                .is("linked_reservation_id", null)
                .gte("created_at", startISO)
                .lte("created_at", endISO)
            : Promise.resolve({ data: [] }),
        ]);

        let reservationWalkinCount = 0;
        const walkinOrderIds = ((walkinOrdersRes as any).data || []).map((o: any) => o.id);
        if (walkinOrderIds.length > 0) {
          const { count } = await supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .in("order_id", walkinOrderIds)
            .gte("created_at", startISO)
            .lte("created_at", endISO);
          reservationWalkinCount = count || 0;
        }

        tickets = (ticketHybridRes.count || 0) + reservationWalkinCount;
      }

      // ===== PROCESS VISITS =====
      const offerVisits = offerVisitsRes.count || 0;
      const ticketVisits = ticketVisitsRes.count || 0;

      // Direct reservation visits - exclude offer-linked ones
      const directResCheckins = (directResCheckinsRes.data || []) as { id: string; special_requests: string | null }[];
      const offerMarkedReservationIds = new Set(
        directResCheckins
          .filter((r) => (r.special_requests || "").toLowerCase().includes("offer claim:"))
          .map((r) => r.id)
      );
      const directResIds = directResCheckins.map((r) => r.id);

      // Fire event reservation check-ins query in parallel with offer links
      const [offerLinksRes, eventResCheckinsRes] = await Promise.all([
        directResIds.length > 0
          ? supabase
              .from("offer_purchases")
              .select("reservation_id")
              .in("reservation_id", directResIds)
              .not("reservation_id", "is", null)
          : Promise.resolve({ data: [] }),
        eventIds.length > 0
          ? supabase
              .from("reservations")
              .select("id, user_id, event_id")
              .in("event_id", eventIds)
              .not("checked_in_at", "is", null)
              .or("auto_created_from_tickets.is.null,auto_created_from_tickets.eq.false")
              .gte("checked_in_at", startISO)
              .lte("checked_in_at", endISO)
          : Promise.resolve({ data: [] }),
      ]);

      const offerLinkedReservationIds = new Set(
        ((offerLinksRes.data || []) as { reservation_id: string | null }[])
          .map((o) => o.reservation_id)
          .filter(Boolean) as string[]
      );

      const directReservationVisits = directResIds.filter(
        (id) => !offerLinkedReservationIds.has(id) && !offerMarkedReservationIds.has(id)
      ).length;

      // Event reservation visits
      let eventReservationVisits = 0;
      const eventResCheckins = ((eventResCheckinsRes.data || []) as { id: string; user_id: string | null; event_id: string | null }[]);
      
      if (eventResCheckins.length > 0) {
        const eventResIds = eventResCheckins.map((r) => r.id);
        
        // Fire both queries in parallel
        const [linkedRowsRes, checkedInTicketsRes] = await Promise.all([
          supabase
            .from("ticket_orders")
            .select("linked_reservation_id")
            .in("linked_reservation_id", eventResIds)
            .not("linked_reservation_id", "is", null),
          supabase
            .from("tickets")
            .select("user_id, event_id")
            .in("event_id", eventIds)
            .not("checked_in_at", "is", null),
        ]);

        const linkedResIds = new Set(
          ((linkedRowsRes.data || []) as { linked_reservation_id: string | null }[])
            .map((row) => row.linked_reservation_id)
            .filter(Boolean) as string[]
        );

        const ticketCheckinPairs = new Set<string>();
        ((checkedInTicketsRes.data || []) as { user_id: string | null; event_id: string }[]).forEach((t) => {
          if (t.user_id && t.event_id) {
            ticketCheckinPairs.add(`${t.user_id}:${t.event_id}`);
          }
        });

        eventReservationVisits = eventResCheckins.filter((r) => {
          if (linkedResIds.has(r.id)) return false;
          if (r.user_id && r.event_id && ticketCheckinPairs.has(`${r.user_id}:${r.event_id}`)) {
            return false;
          }
          return true;
        }).length;
      }

      const visitsViaQR =
        offerVisits +
        ticketVisits +
        directReservationVisits +
        eventReservationVisits +
        (studentDiscountVisitsRes.count || 0);

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
