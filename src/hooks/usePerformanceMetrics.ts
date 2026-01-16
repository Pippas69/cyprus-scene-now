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
    queryFn: async () => {
      const startDate = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = dateRange?.to?.toISOString() || new Date().toISOString();

      // Profile views from engagement_events
      const { data: profileViews } = await supabase
        .from("engagement_events")
        .select("id")
        .eq("business_id", businessId)
        .eq("event_type", "profile_view")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      // Profile interactions (follows, saves)
      const { data: profileInteractions } = await supabase
        .from("engagement_events")
        .select("id")
        .eq("business_id", businessId)
        .in("event_type", ["follow", "save", "share"])
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      // Profile visits = reservation scans (QR check-ins) for direct business reservations
      const { count: profileVisitsCount } = await (supabase
        .from("reservation_scans") as any)
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("scanned_at", startDate)
        .lte("scanned_at", endDate);

      // Offer views from discount_views
      const { data: businessOffers } = await supabase
        .from("discounts")
        .select("id")
        .eq("business_id", businessId);

      const offerIds = businessOffers?.map(o => o.id) || [];
      
      let offerViewsCount = 0;
      if (offerIds.length > 0) {
        const { count } = await supabase
          .from("discount_views")
          .select("id", { count: 'exact', head: true })
          .in("discount_id", offerIds)
          .gte("viewed_at", startDate)
          .lte("viewed_at", endDate);
        offerViewsCount = count || 0;
      }

      // Offer interactions = clicks on "Εξαργύρωσε" (intent)
      const { data: offerInteractions } = await supabase
        .from("engagement_events")
        .select("id")
        .eq("business_id", businessId)
        .eq("event_type", "offer_redeem_click")
        .in("entity_id", offerIds)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      // Offer visits (redemptions/scans)
      let offerVisitsCount = 0;
      if (offerIds.length > 0) {
        const { count } = await supabase
          .from("discount_scans")
          .select("id", { count: 'exact', head: true })
          .in("discount_id", offerIds)
          .eq("success", true)
          .gte("scanned_at", startDate)
          .lte("scanned_at", endDate);
        offerVisitsCount = count || 0;
      }

      // Event views
      const { data: businessEvents } = await supabase
        .from("events")
        .select("id")
        .eq("business_id", businessId);

      const eventIds = businessEvents?.map(e => e.id) || [];

      let eventViewsCount = 0;
      if (eventIds.length > 0) {
        const { count } = await supabase
          .from("event_views")
          .select("id", { count: 'exact', head: true })
          .in("event_id", eventIds)
          .gte("viewed_at", startDate)
          .lte("viewed_at", endDate);
        eventViewsCount = count || 0;
      }

      // Event interactions (RSVPs) - direct from rsvps table for accuracy
      let totalRsvps = 0;
      if (eventIds.length > 0) {
        const { count: rsvpCount } = await supabase
          .from("rsvps")
          .select("id", { count: 'exact', head: true })
          .in("event_id", eventIds)
          .in("status", ["interested", "going"])
          .gte("created_at", startDate)
          .lte("created_at", endDate);
        totalRsvps = rsvpCount || 0;
      }

      // Event visits = ticket check-ins (not engagement events)
      let eventVisitsCount = 0;
      if (eventIds.length > 0) {
        const { data: checkedInTickets } = await supabase
          .from("tickets")
          .select("id")
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .gte("created_at", startDate)
          .lte("created_at", endDate);
        eventVisitsCount = checkedInTickets?.length || 0;
      }
      
      // Add event-linked reservation scans
      if (eventIds.length > 0) {
        const { data: eventReservations } = await supabase
          .from("reservations")
          .select("id")
          .in("event_id", eventIds)
          .gte("created_at", startDate)
          .lte("created_at", endDate);
        
        const eventResIds = eventReservations?.map(r => r.id) || [];
        if (eventResIds.length > 0) {
          const { count: eventResScans } = await (supabase
            .from("reservation_scans") as any)
            .select("*", { count: "exact", head: true })
            .in("reservation_id", eventResIds);
          eventVisitsCount += eventResScans || 0;
        }
      }

      return {
        profile: {
          views: profileViews?.length || 0,
          interactions: profileInteractions?.length || 0,
          visits: profileVisitsCount || 0,
        },
        offers: {
          views: offerViewsCount,
          interactions: offerInteractions?.length || 0,
          visits: offerVisitsCount,
        },
        events: {
          views: eventViewsCount,
          interactions: totalRsvps,
          visits: eventVisitsCount,
        },
      };
    },
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  });
};
