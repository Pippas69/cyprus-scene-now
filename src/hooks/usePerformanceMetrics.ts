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

      // Profile visits (check-ins at business)
      const { data: profileVisits } = await supabase
        .from("engagement_events")
        .select("id")
        .eq("business_id", businessId)
        .eq("event_type", "check_in")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

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

      // Event interactions (RSVPs) from event_rsvp_counts view or daily_analytics
      const { data: dailyData } = await supabase
        .from("daily_analytics")
        .select("new_rsvps_going, new_rsvps_interested, new_reservations")
        .eq("business_id", businessId)
        .gte("date", startDate.split('T')[0])
        .lte("date", endDate.split('T')[0]);

      const totalRsvps = dailyData?.reduce((sum, d) => 
        sum + (d.new_rsvps_going || 0) + (d.new_rsvps_interested || 0), 0) || 0;

      // Event visits (reservations + check-ins)
      const totalReservations = dailyData?.reduce((sum, d) => 
        sum + (d.new_reservations || 0), 0) || 0;

      const { data: eventCheckIns } = await supabase
        .from("engagement_events")
        .select("id")
        .eq("business_id", businessId)
        .eq("event_type", "event_check_in")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      return {
        profile: {
          views: profileViews?.length || 0,
          interactions: profileInteractions?.length || 0,
          visits: profileVisits?.length || 0,
        },
        offers: {
          views: offerViewsCount,
          interactions: offerInteractions?.length || 0,
          visits: offerVisitsCount,
        },
        events: {
          views: eventViewsCount,
          interactions: totalRsvps,
          visits: totalReservations + (eventCheckIns?.length || 0),
        },
      };
    },
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  });
};
