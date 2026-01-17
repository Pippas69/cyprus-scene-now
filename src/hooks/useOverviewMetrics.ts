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
    queryFn: async (): Promise<OverviewMetrics> => {
      const startDate = dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
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
      // 2. CUSTOMERS (unique users who got a QR code)
      // - Reservations (direct, offer-linked, event-linked)
      // - Offer claims (with or without reservation)
      // - Ticket purchases
      // =====================================================
      
      // Direct reservations (from business profile)
      const { data: directReservationUsers } = await supabase
        .from("reservations")
        .select("user_id")
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Event-linked reservations
      let eventReservationUsers: { user_id: string | null }[] = [];
      if (eventIds.length > 0) {
        const { data } = await supabase
          .from("reservations")
          .select("user_id")
          .in("event_id", eventIds)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
        eventReservationUsers = data || [];
      }

      // Offer claims (from offer_purchases - these are customers who claimed an offer)
      let offerClaimUsers: { user_id: string }[] = [];
      if (discountIds.length > 0) {
        const { data } = await supabase
          .from("offer_purchases")
          .select("user_id")
          .in("discount_id", discountIds)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
        offerClaimUsers = data || [];
      }

      // Ticket purchases
      const { data: ticketUsers } = await supabase
        .from("ticket_orders")
        .select("user_id")
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Combine all unique customer user IDs
      const allUserIds = new Set([
        ...(directReservationUsers?.map(r => r.user_id) || []),
        ...(eventReservationUsers?.map(r => r.user_id) || []),
        ...(offerClaimUsers?.map(o => o.user_id) || []),
        ...(ticketUsers?.map(t => t.user_id) || [])
      ].filter(Boolean));
      
      const customersThruFomo = allUserIds.size;

      // =====================================================
      // 3. REPEAT CUSTOMERS (users with 2+ QR codes obtained)
      // =====================================================
      const userCounts: Record<string, number> = {};
      
      directReservationUsers?.forEach(r => {
        if (r.user_id) userCounts[r.user_id] = (userCounts[r.user_id] || 0) + 1;
      });
      eventReservationUsers?.forEach(r => {
        if (r.user_id) userCounts[r.user_id] = (userCounts[r.user_id] || 0) + 1;
      });
      offerClaimUsers?.forEach(o => {
        if (o.user_id) userCounts[o.user_id] = (userCounts[o.user_id] || 0) + 1;
      });
      ticketUsers?.forEach(t => {
        if (t.user_id) userCounts[t.user_id] = (userCounts[t.user_id] || 0) + 1;
      });
      
      const repeatCustomers = Object.values(userCounts).filter(c => c >= 2).length;

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
      // 6. VISITS (QR scans verified by business)
      // - Offer scans (walk-in or with reservation)
      // - Ticket check-ins
      // - Direct reservation scans
      // =====================================================
      
      // A. Offer scans (discount_scans table - successful scans only)
      let offerScans = 0;
      if (discountIds.length > 0) {
        const { count } = await supabase
          .from("discount_scans")
          .select("*", { count: "exact", head: true })
          .in("discount_id", discountIds)
          .eq("success", true)
          .gte("scanned_at", startDate.toISOString())
          .lte("scanned_at", endDate.toISOString());
        offerScans = count || 0;
      }

      // B. Ticket check-ins
      let ticketCheckIns = 0;
      if (eventIds.length > 0) {
        const { count } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", startDate.toISOString())
          .lte("checked_in_at", endDate.toISOString());
        ticketCheckIns = count || 0;
      }

      // C. Direct reservation scans (from reservation_scans table)
      const { count: reservationScans } = await (supabase
        .from("reservation_scans") as any)
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("scanned_at", startDate.toISOString())
        .lte("scanned_at", endDate.toISOString());

      const visitsViaQR = offerScans + ticketCheckIns + (reservationScans || 0);

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
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
