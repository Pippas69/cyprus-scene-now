import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PerformanceMetrics {
  profile: {
    views: number;
    interactions: number;
    visits: number;
  };
  offers: {
    views: number;
    interactions: number;
    visits: number;
  };
  events: {
    views: number;
    interactions: number;
    visits: number;
  };
}

interface DateRange {
  from: Date;
  to: Date;
}

export const usePerformanceMetrics = (
  businessId: string,
  dateRange?: DateRange
) => {
  return useQuery<PerformanceMetrics>({
    queryKey: ["performance-metrics", businessId, dateRange?.from, dateRange?.to],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    queryFn: async () => {
      const startDate = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = dateRange?.to?.toISOString() || new Date().toISOString();

      // ===== PHASE 1: Get events + discounts + all independent counts in parallel =====
      const [
        businessEventsRes,
        businessOffersRes,
        profileViewsRes,
        profileInteractionsRes,
        followerCountRes,
        studentDiscountVisitsRes,
      ] = await Promise.all([
        supabase.from("events").select("id").eq("business_id", businessId),
        supabase.from("discounts").select("id").eq("business_id", businessId),
        // Profile views
        supabase
          .from("engagement_events")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("event_type", "profile_view")
          .gte("created_at", startDate)
          .lte("created_at", endDate),
        // Profile interactions
        supabase
          .from("engagement_events")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("event_type", ["follow", "favorite", "profile_click", "profile_interaction"])
          .gte("created_at", startDate)
          .lte("created_at", endDate),
        // Follower count
        supabase
          .from("business_followers")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId)
          .is("unfollowed_at", null)
          .gte("created_at", startDate)
          .lte("created_at", endDate),
        // Student discount visits
        supabase
          .from("student_discount_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("created_at", startDate)
          .lte("created_at", endDate),
      ]);

      const totalProfileInteractions = (profileInteractionsRes.count || 0) + (followerCountRes.count || 0);
      const offerIds = (businessOffersRes.data || []).map(o => o.id);
      const eventIds = (businessEventsRes.data || []).map(e => e.id);

      // ===== PHASE 2: All queries that depend on offerIds/eventIds, fired in parallel =====
      const [
        checkedInReservationsRes,
        offerViewsRes,
        offerInteractionsRes,
        offerVisitsRes,
        eventViewsRes,
        rsvpCountRes,
        ticketCheckinsRes,
        eventResCheckinsRes,
      ] = await Promise.all([
        // Profile visits: checked-in direct reservations
        (async () => {
          const pageSize = 1000;
          const out: { id: string; special_requests: string | null }[] = [];
          for (let from = 0; ; from += pageSize) {
            const { data } = await supabase
              .from("reservations")
              .select("id,special_requests")
              .eq("business_id", businessId)
              .is("event_id", null)
              .not("checked_in_at", "is", null)
              .gte("checked_in_at", startDate)
              .lte("checked_in_at", endDate)
              .range(from, from + pageSize - 1);
            const page = (data || []) as { id: string; special_requests: string | null }[];
            out.push(...page);
            if (page.length < pageSize) break;
          }
          return out;
        })(),
        // Offer views
        offerIds.length > 0
          ? supabase
              .from("discount_views")
              .select("id", { count: 'exact', head: true })
              .in("discount_id", offerIds)
              .gte("viewed_at", startDate)
              .lte("viewed_at", endDate)
          : Promise.resolve({ count: 0 }),
        // Offer interactions
        offerIds.length > 0
          ? supabase
              .from("engagement_events")
              .select("id", { count: "exact", head: true })
              .eq("business_id", businessId)
              .eq("event_type", "offer_redeem_click")
              .in("entity_id", offerIds)
              .gte("created_at", startDate)
              .lte("created_at", endDate)
          : Promise.resolve({ count: 0 }),
        // Offer visits (verified redemptions)
        offerIds.length > 0
          ? supabase
              .from("offer_purchases")
              .select("id", { count: "exact", head: true })
              .in("discount_id", offerIds)
              .not("redeemed_at", "is", null)
              .gte("redeemed_at", startDate)
              .lte("redeemed_at", endDate)
          : Promise.resolve({ count: 0 }),
        // Event views
        eventIds.length > 0
          ? supabase
              .from("event_views")
              .select("id", { count: 'exact', head: true })
              .in("event_id", eventIds)
              .gte("viewed_at", startDate)
              .lte("viewed_at", endDate)
          : Promise.resolve({ count: 0 }),
        // RSVPs
        eventIds.length > 0
          ? supabase
              .from("rsvps")
              .select("id", { count: 'exact', head: true })
              .in("event_id", eventIds)
              .in("status", ["interested", "going"])
              .gte("created_at", startDate)
              .lte("created_at", endDate)
          : Promise.resolve({ count: 0 }),
        // Ticket check-ins (with user_id, event_id for dedup)
        eventIds.length > 0
          ? supabase
              .from("tickets")
              .select("id, user_id, event_id")
              .in("event_id", eventIds)
              .not("checked_in_at", "is", null)
              .gte("checked_in_at", startDate)
              .lte("checked_in_at", endDate)
          : Promise.resolve({ data: [] }),
        // Event reservation check-ins
        eventIds.length > 0
          ? supabase
              .from("reservations")
              .select("id, user_id, event_id")
              .in("event_id", eventIds)
              .not("checked_in_at", "is", null)
              .neq("auto_created_from_tickets", true)
              .gte("checked_in_at", startDate)
              .lte("checked_in_at", endDate)
          : Promise.resolve({ data: [] }),
      ]);

      // ===== PROCESS PROFILE VISITS =====
      const checkedInReservations = checkedInReservationsRes as { id: string; special_requests: string | null }[];
      const offerMarkedReservationIds = new Set(
        checkedInReservations
          .filter((r) => (r.special_requests || "").toLowerCase().includes("offer claim:"))
          .map((r) => r.id)
      );
      const reservationIds = checkedInReservations.map((r) => r.id);

      let offerLinkedReservationIds = new Set<string>();
      if (reservationIds.length > 0) {
        const { data: offerLinks } = await supabase
          .from("offer_purchases")
          .select("reservation_id")
          .in("reservation_id", reservationIds)
          .not("reservation_id", "is", null);
        offerLinkedReservationIds = new Set(
          (offerLinks || [])
            .map((o) => (o as { reservation_id: string | null }).reservation_id)
            .filter(Boolean) as string[]
        );
      }

      const directProfileReservationVisits = reservationIds.filter(
        (id) => !offerLinkedReservationIds.has(id) && !offerMarkedReservationIds.has(id)
      ).length;

      const totalProfileVisits = directProfileReservationVisits + (studentDiscountVisitsRes.count || 0);

      // ===== PROCESS EVENT VISITS (dedup ticket + reservation check-ins) =====
      const ticketCheckins = ((ticketCheckinsRes as any).data || []) as { id: string; user_id: string | null; event_id: string }[];
      let eventVisitsCount = ticketCheckins.length;

      const eventResCheckins = ((eventResCheckinsRes as any).data || []) as { id: string; user_id: string | null; event_id: string | null }[];

      if (eventResCheckins.length > 0) {
        const ticketCheckinPairs = new Set<string>();
        ticketCheckins.forEach((t) => {
          if (t.user_id && t.event_id) {
            ticketCheckinPairs.add(`${t.user_id}:${t.event_id}`);
          }
        });

        const eventResIds = eventResCheckins.map((r) => r.id);
        
        const { data: linkedRows } = await supabase
          .from("ticket_orders")
          .select("linked_reservation_id")
          .in("linked_reservation_id", eventResIds)
          .not("linked_reservation_id", "is", null);

        const linkedReservationIds = new Set(
          (linkedRows || [])
            .map((row) => (row as { linked_reservation_id: string | null }).linked_reservation_id)
            .filter(Boolean) as string[]
        );

        const dedupedEventResVisits = eventResCheckins.filter((r) => {
          if (linkedReservationIds.has(r.id)) return false;
          if (r.user_id && r.event_id && ticketCheckinPairs.has(`${r.user_id}:${r.event_id}`)) return false;
          return true;
        });

        eventVisitsCount += dedupedEventResVisits.length;
      }

      return {
        profile: {
          views: profileViewsRes.count || 0,
          interactions: totalProfileInteractions,
          visits: totalProfileVisits,
        },
        offers: {
          views: (offerViewsRes as any).count || 0,
          interactions: (offerInteractionsRes as any).count || 0,
          visits: (offerVisitsRes as any).count || 0,
        },
        events: {
          views: (eventViewsRes as any).count || 0,
          interactions: (rsvpCountRes as any).count || 0,
          visits: eventVisitsCount,
        },
      };
    },
    enabled: !!businessId,
  });
};
