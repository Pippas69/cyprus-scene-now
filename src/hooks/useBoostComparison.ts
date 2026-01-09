import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BoostMetrics {
  views: number;
  interested: number;
  toGo: number;
  visits: number;
  ticketsAndCheckIn?: number;
}

export interface BoostComparisonData {
  profile: { withBoost: BoostMetrics; withoutBoost: BoostMetrics };
  offers: { withBoost: BoostMetrics; withoutBoost: BoostMetrics };
  events: { withBoost: BoostMetrics & { ticketsAndCheckIn: number }; withoutBoost: BoostMetrics & { ticketsAndCheckIn: number } };
}

export const useBoostComparison = (businessId: string, dateRange?: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ["boost-comparison", businessId, dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<BoostComparisonData> => {
      const startDate = dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = dateRange?.to || new Date();

      // Get boost periods
      const { data: profileBoosts } = await supabase
        .from("profile_boosts")
        .select("start_date, end_date")
        .eq("business_id", businessId)
        .eq("status", "active");

      const { data: eventBoosts } = await supabase
        .from("event_boosts")
        .select("event_id, start_date, end_date")
        .eq("business_id", businessId)
        .eq("status", "active");

      const { data: offerBoosts } = await supabase
        .from("offer_boosts")
        .select("discount_id, start_date, end_date")
        .eq("business_id", businessId)
        .eq("status", "active");

      // Get events and offers for this business
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .eq("business_id", businessId);
      const eventIds = events?.map(e => e.id) || [];

      const { data: discounts } = await supabase
        .from("discounts")
        .select("id")
        .eq("business_id", businessId);
      const discountIds = discounts?.map(d => d.id) || [];

      // Helper to check if a date is within any boost period
      const isWithinBoostPeriod = (date: string, boostPeriods: Array<{ start_date: string; end_date: string }> | null) => {
        if (!boostPeriods || boostPeriods.length === 0) return false;
        const d = new Date(date);
        return boostPeriods.some(bp => d >= new Date(bp.start_date) && d <= new Date(bp.end_date));
      };

      // PROFILE METRICS
      const { data: profileEngagement } = await supabase
        .from("engagement_events")
        .select("event_type, created_at")
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data: profileFavorites } = await supabase
        .from("favorite_discounts")
        .select("created_at, discount_id")
        .in("discount_id", discountIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data: businessRsvps } = await supabase
        .from("rsvps")
        .select("status, created_at, event_id")
        .in("event_id", eventIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data: reservations } = await supabase
        .from("reservations")
        .select("created_at, event_id")
        .in("event_id", eventIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Calculate profile metrics
      const profileWithBoost: BoostMetrics = { views: 0, interested: 0, toGo: 0, visits: 0 };
      const profileWithoutBoost: BoostMetrics = { views: 0, interested: 0, toGo: 0, visits: 0 };

      profileEngagement?.forEach(e => {
        const isBoosted = isWithinBoostPeriod(e.created_at, profileBoosts);
        const target = isBoosted ? profileWithBoost : profileWithoutBoost;
        if (e.event_type === "profile_view") target.views++;
      });

      profileFavorites?.forEach(f => {
        const isBoosted = isWithinBoostPeriod(f.created_at, profileBoosts);
        const target = isBoosted ? profileWithBoost : profileWithoutBoost;
        target.interested++;
      });

      businessRsvps?.forEach(r => {
        const isBoosted = isWithinBoostPeriod(r.created_at, profileBoosts);
        const target = isBoosted ? profileWithBoost : profileWithoutBoost;
        if (r.status === "going") target.toGo++;
        else if (r.status === "interested") target.interested++;
      });

      reservations?.forEach(r => {
        const isBoosted = isWithinBoostPeriod(r.created_at, profileBoosts);
        const target = isBoosted ? profileWithBoost : profileWithoutBoost;
        target.visits++;
      });

      // OFFER METRICS
      const { data: discountViews } = await supabase
        .from("discount_views")
        .select("discount_id, created_at")
        .in("discount_id", discountIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data: offerPurchases } = await supabase
        .from("offer_purchases")
        .select("discount_id, created_at")
        .in("discount_id", discountIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const offersWithBoost: BoostMetrics = { views: 0, interested: 0, toGo: 0, visits: 0 };
      const offersWithoutBoost: BoostMetrics = { views: 0, interested: 0, toGo: 0, visits: 0 };

      const getOfferBoostPeriods = (discountId: string) => 
        offerBoosts?.filter(ob => ob.discount_id === discountId) || [];

      discountViews?.forEach(dv => {
        const isBoosted = isWithinBoostPeriod(dv.created_at, getOfferBoostPeriods(dv.discount_id));
        const target = isBoosted ? offersWithBoost : offersWithoutBoost;
        target.views++;
      });

      offerPurchases?.forEach(op => {
        const isBoosted = isWithinBoostPeriod(op.created_at, getOfferBoostPeriods(op.discount_id));
        const target = isBoosted ? offersWithBoost : offersWithoutBoost;
        target.visits++;
      });

      // EVENT METRICS
      const { data: eventViews } = await supabase
        .from("event_views")
        .select("event_id, created_at")
        .in("event_id", eventIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data: eventRsvps } = await supabase
        .from("rsvps")
        .select("event_id, status, created_at")
        .in("event_id", eventIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data: tickets } = await supabase
        .from("tickets")
        .select("event_id, checked_in_at, created_at")
        .in("event_id", eventIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const eventsWithBoost = { views: 0, interested: 0, toGo: 0, visits: 0, ticketsAndCheckIn: 0 };
      const eventsWithoutBoost = { views: 0, interested: 0, toGo: 0, visits: 0, ticketsAndCheckIn: 0 };

      const getEventBoostPeriods = (eventId: string) => 
        eventBoosts?.filter(eb => eb.event_id === eventId) || [];

      eventViews?.forEach(ev => {
        const isBoosted = isWithinBoostPeriod(ev.created_at, getEventBoostPeriods(ev.event_id));
        const target = isBoosted ? eventsWithBoost : eventsWithoutBoost;
        target.views++;
      });

      eventRsvps?.forEach(r => {
        const isBoosted = isWithinBoostPeriod(r.created_at, getEventBoostPeriods(r.event_id));
        const target = isBoosted ? eventsWithBoost : eventsWithoutBoost;
        if (r.status === "going") target.toGo++;
        else if (r.status === "interested") target.interested++;
      });

      tickets?.forEach(t => {
        const isBoosted = isWithinBoostPeriod(t.created_at, getEventBoostPeriods(t.event_id));
        const target = isBoosted ? eventsWithBoost : eventsWithoutBoost;
        target.ticketsAndCheckIn++;
        if (t.checked_in_at) target.visits++;
      });

      return {
        profile: { withBoost: profileWithBoost, withoutBoost: profileWithoutBoost },
        offers: { withBoost: offersWithBoost, withoutBoost: offersWithoutBoost },
        events: { withBoost: eventsWithBoost, withoutBoost: eventsWithoutBoost },
      };
    },
    enabled: !!businessId,
  });
};
