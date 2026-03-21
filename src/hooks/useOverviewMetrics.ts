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
        .select("id")
        .eq("business_id", businessId);
      
      const eventIds = events?.map(e => e.id) || [];

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
      // 2. CUSTOMERS + RETURNING (Unified CRM definition)
      // Customer = unique person with a QR from any source:
      // - Event tickets
      // - Reservations (profile / offer / event)
      // - Offer claims (walk-in or standalone)
      // - Student discount redemptions
      // Returning = registered users with 2+ actions (not limited to check-ins)
      // =====================================================

      const customerKeys = new Set<string>();
      const registeredActionCounts: Record<string, number> = {};
      const seenRegisteredActions = new Set<string>();

      const normalizeName = (value: string | null | undefined) => {
        if (!value) return null;
        const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
        return normalized.length > 0 ? normalized : null;
      };

      const buildCustomerKey = ({
        guestName,
        userId,
        fallback,
      }: {
        guestName?: string | null;
        userId?: string | null;
        fallback: string;
      }) => {
        const normalizedName = normalizeName(guestName);
        if (normalizedName) return `ghost:${normalizedName}`;
        if (userId) return `user:${userId}`;
        return fallback;
      };

      const countRegisteredAction = (userId: string | null | undefined, actionKey: string) => {
        if (!userId) return;
        const dedupeKey = `${userId}:${actionKey}`;
        if (seenRegisteredActions.has(dedupeKey)) return;
        seenRegisteredActions.add(dedupeKey);
        registeredActionCounts[userId] = (registeredActionCounts[userId] || 0) + 1;
      };

      // A) Tickets sold (event QR holders)
      let ticketsData: { id: string; user_id: string; guest_name: string | null; order_id: string }[] = [];
      if (eventIds.length > 0) {
        const { data } = await supabase
          .from("tickets")
          .select("id, user_id, guest_name, order_id")
          .in("event_id", eventIds)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        ticketsData = (data || []) as { id: string; user_id: string; guest_name: string | null; order_id: string }[];

        ticketsData.forEach((ticket) => {
          customerKeys.add(
            buildCustomerKey({
              guestName: ticket.guest_name,
              userId: ticket.user_id,
              fallback: `ticket:${ticket.id}`,
            })
          );
          countRegisteredAction(ticket.user_id, `ticket_order:${ticket.order_id}`);
        });
      }

      // B) Reservations (profile / offer / event), excluding synthetic ticket-linked rows
      const { data: directReservations } = await supabase
        .from("reservations")
        .select("id, user_id, reservation_name")
        .eq("business_id", businessId)
        .is("event_id", null)
        .eq("status", "accepted")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      let eventReservations: { id: string; user_id: string; reservation_name: string }[] = [];
      if (eventIds.length > 0) {
        const { data } = await supabase
          .from("reservations")
          .select("id, user_id, reservation_name")
          .in("event_id", eventIds)
          .eq("status", "accepted")
          .or("auto_created_from_tickets.is.null,auto_created_from_tickets.eq.false")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        eventReservations = (data || []) as { id: string; user_id: string; reservation_name: string }[];
      }

      const reservations = [
        ...((directReservations || []) as { id: string; user_id: string; reservation_name: string }[]),
        ...eventReservations,
      ];

      const reservationIds = reservations.map((r) => r.id);
      const reservationGuestsByReservation = new Map<string, { id: string; guest_name: string | null }[]>();

      if (reservationIds.length > 0) {
        const { data: reservationGuests } = await supabase
          .from("reservation_guests")
          .select("id, reservation_id, guest_name")
          .in("reservation_id", reservationIds);

        (reservationGuests || []).forEach((guest) => {
          const existing = reservationGuestsByReservation.get(guest.reservation_id) || [];
          existing.push({ id: guest.id, guest_name: guest.guest_name });
          reservationGuestsByReservation.set(guest.reservation_id, existing);
        });
      }

      reservations.forEach((reservation) => {
        const guests = reservationGuestsByReservation.get(reservation.id) || [];

        if (guests.length > 0) {
          guests.forEach((guest) => {
            customerKeys.add(
              buildCustomerKey({
                guestName: guest.guest_name,
                userId: null,
                fallback: `reservation_guest:${guest.id}`,
              })
            );
          });
        } else {
          customerKeys.add(
            buildCustomerKey({
              guestName: reservation.reservation_name,
              userId: reservation.user_id,
              fallback: `reservation:${reservation.id}`,
            })
          );
        }

        countRegisteredAction(reservation.user_id, `reservation:${reservation.id}`);
      });

      // C) Offer claims (standalone / walk-in), avoid double-counting offer-linked reservations
      const { data: offerPurchases } = await supabase
        .from("offer_purchases")
        .select("id, user_id, reservation_id, claim_type")
        .eq("business_id", businessId)
        .in("status", ["paid", "redeemed"])
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const standaloneOfferPurchases = (offerPurchases || []).filter(
        (purchase) => !purchase.reservation_id || purchase.claim_type === "walk_in"
      );

      const offerPurchaseIds = standaloneOfferPurchases.map((purchase) => purchase.id);
      const offerGuestsByPurchase = new Map<string, { id: string; guest_name: string | null }[]>();

      if (offerPurchaseIds.length > 0) {
        const { data: offerGuests } = await supabase
          .from("offer_purchase_guests")
          .select("id, purchase_id, guest_name")
          .in("purchase_id", offerPurchaseIds);

        (offerGuests || []).forEach((guest) => {
          const existing = offerGuestsByPurchase.get(guest.purchase_id) || [];
          existing.push({ id: guest.id, guest_name: guest.guest_name });
          offerGuestsByPurchase.set(guest.purchase_id, existing);
        });
      }

      standaloneOfferPurchases.forEach((purchase) => {
        const guests = offerGuestsByPurchase.get(purchase.id) || [];

        if (guests.length > 0) {
          guests.forEach((guest) => {
            customerKeys.add(
              buildCustomerKey({
                guestName: guest.guest_name,
                userId: null,
                fallback: `offer_guest:${guest.id}`,
              })
            );
          });
        } else {
          customerKeys.add(
            buildCustomerKey({
              userId: purchase.user_id,
              fallback: `offer_purchase:${purchase.id}`,
            })
          );
        }

        countRegisteredAction(purchase.user_id, `offer_purchase:${purchase.id}`);
      });

      // D) Student discount redemptions
      const { data: studentRedemptions } = await supabase
        .from("student_discount_redemptions")
        .select("id, student_verification_id")
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const studentVerificationIds = Array.from(
        new Set(
          (studentRedemptions || [])
            .map((redemption) => redemption.student_verification_id)
            .filter(Boolean)
        )
      );

      const studentUserByVerification = new Map<string, string>();
      if (studentVerificationIds.length > 0) {
        const { data: studentVerifications } = await supabase
          .from("student_verifications")
          .select("id, user_id")
          .in("id", studentVerificationIds);

        (studentVerifications || []).forEach((verification) => {
          if (verification.id && verification.user_id) {
            studentUserByVerification.set(verification.id, verification.user_id);
          }
        });
      }

      (studentRedemptions || []).forEach((redemption) => {
        const studentUserId = studentUserByVerification.get(redemption.student_verification_id);

        customerKeys.add(
          buildCustomerKey({
            userId: studentUserId || null,
            fallback: `student_redemption:${redemption.id}`,
          })
        );

        countRegisteredAction(studentUserId || null, `student_redemption:${redemption.id}`);
      });

      const customersThruFomo = customerKeys.size;
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
          .filter((r) => ((r as any).special_requests || "").toLowerCase().includes("offer claim:"))
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
        const { count } = await supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .neq("auto_created_from_tickets", true)
          .gte("checked_in_at", startDate.toISOString())
          .lte("checked_in_at", endDate.toISOString());
        eventReservationVisits = count || 0;
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
