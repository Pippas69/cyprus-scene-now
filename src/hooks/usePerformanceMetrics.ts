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
      const { count: profileViewsCount } = await supabase
        .from("engagement_events")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("event_type", "profile_view")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      // Profile interactions (follows, profile clicks ONLY - NO shares, not event clicks)
      const { count: profileInteractionsCount } = await supabase
        .from("engagement_events")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .in("event_type", ["follow", "favorite", "profile_click", "profile_interaction"])
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      
      // Also count business followers for interactions
      const { count: followerCount } = await supabase
        .from("business_followers")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .is("unfollowed_at", null)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      const totalProfileInteractions = (profileInteractionsCount || 0) + (followerCount || 0);

      // Profile visits = verified reservation check-ins for DIRECT business reservations only (reservation.event_id IS NULL)
      // + student discount redemptions (QR check-ins from student discounts)
      const { count: profileVisitsCount } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .is("event_id", null)
        .not("checked_in_at", "is", null)
        .gte("checked_in_at", startDate)
        .lte("checked_in_at", endDate);

      // Student discount redemptions (QR check-ins from student discounts)
      const { count: studentDiscountVisitsCount } = await supabase
        .from("student_discount_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      const totalProfileVisits = (profileVisitsCount || 0) + (studentDiscountVisitsCount || 0);

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
      let offerInteractionsCount = 0;
      if (offerIds.length > 0) {
        const { count } = await supabase
          .from("engagement_events")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("event_type", "offer_redeem_click")
          .in("entity_id", offerIds)
          .gte("created_at", startDate)
          .lte("created_at", endDate);
        offerInteractionsCount = count || 0;
      }

      // Offer visits = verified offer redemptions
      // IMPORTANT: We count offer_purchases.redeemed_at (1 row per redemption).
      let offerVisitsCount = 0;
      if (offerIds.length > 0) {
        const { count } = await supabase
          .from("offer_purchases")
          .select("id", { count: "exact", head: true })
          .in("discount_id", offerIds)
          .not("redeemed_at", "is", null)
          .gte("redeemed_at", startDate)
          .lte("redeemed_at", endDate);
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

      // Event visits = (1) ticket check-ins + (2) verified reservation check-ins for event-linked reservations
      let eventVisitsCount = 0;
      if (eventIds.length > 0) {
        const { count: ticketCheckins } = await supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", startDate)
          .lte("checked_in_at", endDate);

        eventVisitsCount = ticketCheckins || 0;

        const { count: eventReservationCheckins } = await supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", startDate)
          .lte("checked_in_at", endDate);

        eventVisitsCount += eventReservationCheckins || 0;
      }

      return {
        profile: {
          views: profileViewsCount || 0,
          interactions: totalProfileInteractions,
          visits: totalProfileVisits,
        },
        offers: {
          views: offerViewsCount,
          interactions: offerInteractionsCount,
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
