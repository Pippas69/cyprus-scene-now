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
      // 2. CUSTOMERS (unique users who CHECKED IN at venue)
      // Only count users with verified visits (QR scan):
      // - Offer redemptions (redeemed_at IS NOT NULL)
      // - Ticket check-ins (checked_in_at IS NOT NULL)
      // - Reservation check-ins (checked_in_at IS NOT NULL)
      // - Student discount redemptions
      // =====================================================
      
      // A. Users from offer redemptions (verified at venue)
      let offerCheckinUsers: { user_id: string }[] = [];
      if (discountIds.length > 0) {
        const { data } = await supabase
          .from("offer_purchases")
          .select("user_id")
          .in("discount_id", discountIds)
          .not("redeemed_at", "is", null)
          .gte("redeemed_at", startDate.toISOString())
          .lte("redeemed_at", endDate.toISOString());
        offerCheckinUsers = data || [];
      }

      // B. Users from ticket check-ins
      let ticketCheckinUsers: { user_id: string }[] = [];
      if (eventIds.length > 0) {
        const { data } = await supabase
          .from("tickets")
          .select("user_id")
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", startDate.toISOString())
          .lte("checked_in_at", endDate.toISOString());
        ticketCheckinUsers = data || [];
      }

      // C. Users from direct reservation check-ins (profile reservations)
      const { data: directReservationCheckinUsers } = await supabase
        .from("reservations")
        .select("user_id")
        .eq("business_id", businessId)
        .is("event_id", null)
        .not("checked_in_at", "is", null)
        .gte("checked_in_at", startDate.toISOString())
        .lte("checked_in_at", endDate.toISOString());

      // D. Users from event reservation check-ins
      let eventReservationCheckinUsers: { user_id: string | null }[] = [];
      if (eventIds.length > 0) {
        const { data } = await supabase
          .from("reservations")
          .select("user_id")
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", startDate.toISOString())
          .lte("checked_in_at", endDate.toISOString());
        eventReservationCheckinUsers = data || [];
      }

      // E. Users from student discount redemptions
      // IMPORTANT: 1 redemption = 1 verified check-in.
      // NOTE: scanned_by is the staff user who scans (NOT the student), so we always resolve via student_verifications.
      const { data: studentDiscountData } = await supabase
        .from("student_discount_redemptions")
        .select("student_verification_id")
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Build a list of userIds PER redemption (keeps duplicates for repeat customers)
      let studentDiscountUserIdsPerRedemption: string[] = [];
      if (studentDiscountData && studentDiscountData.length > 0) {
        const verificationIds = studentDiscountData
          .map((s) => (s as { student_verification_id: string | null }).student_verification_id)
          .filter(Boolean) as string[];

        const uniqueVerificationIds = Array.from(new Set(verificationIds));
        if (uniqueVerificationIds.length > 0) {
          const { data: verifications } = await supabase
            .from("student_verifications")
            .select("id, user_id")
            .in("id", uniqueVerificationIds);

          const mapByVerificationId = new Map<string, string>();
          (verifications || []).forEach((v) => {
            if (v.id && v.user_id) mapByVerificationId.set(v.id, v.user_id);
          });

          // Preserve multiplicity: one entry per redemption
          studentDiscountUserIdsPerRedemption = verificationIds
            .map((verificationId) => mapByVerificationId.get(verificationId))
            .filter(Boolean) as string[];
        }
      }

      // Combine all unique customer user IDs (only verified check-ins)
      const allCheckinUserIds = new Set([
        ...(offerCheckinUsers?.map(o => o.user_id) || []),
        ...(ticketCheckinUsers?.map(t => t.user_id) || []),
        ...(directReservationCheckinUsers?.map(r => r.user_id) || []),
        ...(eventReservationCheckinUsers?.map(r => r.user_id) || []),
        ...studentDiscountUserIdsPerRedemption
      ].filter(Boolean));
      
      const customersThruFomo = allCheckinUserIds.size;

      // =====================================================
      // 3. REPEAT CUSTOMERS (users with 2+ verified check-ins)
      // =====================================================
      const userCheckinCounts: Record<string, number> = {};
      
      offerCheckinUsers?.forEach(o => {
        if (o.user_id) userCheckinCounts[o.user_id] = (userCheckinCounts[o.user_id] || 0) + 1;
      });
      ticketCheckinUsers?.forEach(t => {
        if (t.user_id) userCheckinCounts[t.user_id] = (userCheckinCounts[t.user_id] || 0) + 1;
      });
      directReservationCheckinUsers?.forEach(r => {
        if (r.user_id) userCheckinCounts[r.user_id] = (userCheckinCounts[r.user_id] || 0) + 1;
      });
      eventReservationCheckinUsers?.forEach(r => {
        if (r.user_id) userCheckinCounts[r.user_id] = (userCheckinCounts[r.user_id] || 0) + 1;
      });
      studentDiscountUserIdsPerRedemption.forEach(userId => {
        userCheckinCounts[userId] = (userCheckinCounts[userId] || 0) + 1;
      });
      
      const repeatCustomers = Object.values(userCheckinCounts).filter(c => c >= 2).length;

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
