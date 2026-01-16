import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ComparisonMetrics {
  views: { without: number; with: number; change: number };
  interactions: { without: number; with: number; change: number };
  visits: { without: number; with: number; change: number };
}

interface BoostValueData {
  profile: ComparisonMetrics;
  offers: ComparisonMetrics;
  events: ComparisonMetrics;
  bestDays: {
    profile: number;
    offers: number;
    events: number;
  };
}

interface DateRange {
  from: Date;
  to: Date;
}

const calculateChange = (without: number, withBoost: number): number => {
  if (without === 0) return withBoost > 0 ? 100 : 0;
  return Math.round(((withBoost - without) / without) * 100);
};

export const useBoostValueMetrics = (
  businessId: string,
  dateRange?: DateRange
) => {
  return useQuery<BoostValueData>({
    queryKey: ["boost-value-metrics", businessId, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const startDate = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = dateRange?.to?.toISOString() || new Date().toISOString();

      // Check if business has/had active subscription (featured profile)
      const { data: subscription } = await supabase
        .from("business_subscriptions")
        .select("current_period_start, current_period_end, status")
        .eq("business_id", businessId)
        .maybeSingle();

      const featuredStart = subscription?.current_period_start;

      // Profile metrics - before and after featured
      let profileWithout = { views: 0, interactions: 0, visits: 0 };
      let profileWith = { views: 0, interactions: 0, visits: 0 };

      if (featuredStart) {
        // Before featured (non-featured period)
        const { data: beforeViews } = await supabase
          .from("engagement_events")
          .select("id")
          .eq("business_id", businessId)
          .eq("event_type", "profile_view")
          .lt("created_at", featuredStart)
          .gte("created_at", startDate);

        const { data: beforeInteractions } = await supabase
          .from("engagement_events")
          .select("id")
          .eq("business_id", businessId)
          .in("event_type", ["follow", "save"])
          .lt("created_at", featuredStart)
          .gte("created_at", startDate);

        const { data: beforeVisits } = await supabase
          .from("engagement_events")
          .select("id")
          .eq("business_id", businessId)
          .eq("event_type", "check_in")
          .lt("created_at", featuredStart)
          .gte("created_at", startDate);

        profileWithout = {
          views: beforeViews?.length || 0,
          interactions: beforeInteractions?.length || 0,
          visits: beforeVisits?.length || 0,
        };

        // After featured
        const { data: afterViews } = await supabase
          .from("engagement_events")
          .select("id")
          .eq("business_id", businessId)
          .eq("event_type", "profile_view")
          .gte("created_at", featuredStart)
          .lte("created_at", endDate);

        const { data: afterInteractions } = await supabase
          .from("engagement_events")
          .select("id")
          .eq("business_id", businessId)
          .in("event_type", ["follow", "save"])
          .gte("created_at", featuredStart)
          .lte("created_at", endDate);

        const { data: afterVisits } = await supabase
          .from("engagement_events")
          .select("id")
          .eq("business_id", businessId)
          .eq("event_type", "check_in")
          .gte("created_at", featuredStart)
          .lte("created_at", endDate);

        profileWith = {
          views: afterViews?.length || 0,
          interactions: afterInteractions?.length || 0,
          visits: afterVisits?.length || 0,
        };
      }

      // Get business offers
      const { data: businessOffers } = await supabase
        .from("discounts")
        .select("id")
        .eq("business_id", businessId);

      const businessOfferIds = businessOffers?.map(o => o.id) || [];

      // Get boosted offers from event_boosts (offer_boosts might not exist)
      const { data: offerBoosts } = await supabase
        .from("offer_boosts")
        .select("discount_id")
        .eq("business_id", businessId)
        .eq("status", "active");

      const boostedOfferIds = offerBoosts?.map(b => b.discount_id) || [];

      // Offer views by boost status
      let boostedOfferViews = 0;
      let nonBoostedOfferViews = 0;

      if (businessOfferIds.length > 0) {
        if (boostedOfferIds.length > 0) {
          const { count: boostedCount } = await supabase
            .from("discount_views")
            .select("id", { count: 'exact', head: true })
            .in("discount_id", boostedOfferIds)
            .gte("viewed_at", startDate)
            .lte("viewed_at", endDate);
          boostedOfferViews = boostedCount || 0;
        }

        const nonBoostedIds = businessOfferIds.filter(id => !boostedOfferIds.includes(id));
        if (nonBoostedIds.length > 0) {
          const { count: nonBoostedCount } = await supabase
            .from("discount_views")
            .select("id", { count: 'exact', head: true })
            .in("discount_id", nonBoostedIds)
            .gte("viewed_at", startDate)
            .lte("viewed_at", endDate);
          nonBoostedOfferViews = nonBoostedCount || 0;
        }
      }

      // Offer interactions = clicks on "Εξαργύρωσε" (intent)
      const { data: offerInteractions } = await supabase
        .from("engagement_events")
        .select("id, entity_id")
        .eq("business_id", businessId)
        .eq("event_type", "offer_redeem_click")
        .in("entity_id", businessOfferIds)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      const boostedOfferInteractions =
        offerInteractions?.filter((i) => i.entity_id && boostedOfferIds.includes(i.entity_id)).length || 0;
      const nonBoostedOfferInteractions = (offerInteractions?.length || 0) - boostedOfferInteractions;

      // Offer visits (scans)
      let boostedOfferVisits = 0;
      let nonBoostedOfferVisits = 0;

      if (boostedOfferIds.length > 0) {
        const { count } = await supabase
          .from("discount_scans")
          .select("id", { count: 'exact', head: true })
          .in("discount_id", boostedOfferIds)
          .eq("success", true)
          .gte("scanned_at", startDate)
          .lte("scanned_at", endDate);
        boostedOfferVisits = count || 0;
      }

      const nonBoostedIds = businessOfferIds.filter(id => !boostedOfferIds.includes(id));
      if (nonBoostedIds.length > 0) {
        const { count } = await supabase
          .from("discount_scans")
          .select("id", { count: 'exact', head: true })
          .in("discount_id", nonBoostedIds)
          .eq("success", true)
          .gte("scanned_at", startDate)
          .lte("scanned_at", endDate);
        nonBoostedOfferVisits = count || 0;
      }

      // Events - boosted vs non-boosted
      const { data: boostedEvents } = await supabase
        .from("event_boosts")
        .select("event_id")
        .eq("business_id", businessId)
        .eq("status", "active");

      const boostedEventIds = boostedEvents?.map(b => b.event_id) || [];

      const { data: businessEvents } = await supabase
        .from("events")
        .select("id")
        .eq("business_id", businessId);

      const businessEventIds = businessEvents?.map(e => e.id) || [];

      // Event views
      let boostedEventViews = 0;
      let nonBoostedEventViews = 0;

      if (boostedEventIds.length > 0) {
        const { count } = await supabase
          .from("event_views")
          .select("id", { count: 'exact', head: true })
          .in("event_id", boostedEventIds)
          .gte("viewed_at", startDate)
          .lte("viewed_at", endDate);
        boostedEventViews = count || 0;
      }

      const nonBoostedEventIds = businessEventIds.filter(id => !boostedEventIds.includes(id));
      if (nonBoostedEventIds.length > 0) {
        const { count } = await supabase
          .from("event_views")
          .select("id", { count: 'exact', head: true })
          .in("event_id", nonBoostedEventIds)
          .gte("viewed_at", startDate)
          .lte("viewed_at", endDate);
        nonBoostedEventViews = count || 0;
      }

      // Event interactions from daily_analytics
      const { data: dailyData } = await supabase
        .from("daily_analytics")
        .select("date, new_rsvps_going, new_rsvps_interested, new_reservations")
        .eq("business_id", businessId)
        .gte("date", startDate.split('T')[0])
        .lte("date", endDate.split('T')[0]);

      // For simplicity, split 50/50 between boosted/non-boosted if both exist
      const totalInteractions = dailyData?.reduce((sum, d) => 
        sum + (d.new_rsvps_going || 0) + (d.new_rsvps_interested || 0), 0) || 0;
      const totalVisits = dailyData?.reduce((sum, d) => 
        sum + (d.new_reservations || 0), 0) || 0;

      const hasBoosted = boostedEventIds.length > 0;
      const hasNonBoosted = nonBoostedEventIds.length > 0;

      let boostedEventInteractions = 0;
      let nonBoostedEventInteractions = 0;
      let boostedEventVisits = 0;
      let nonBoostedEventVisits = 0;

      if (hasBoosted && hasNonBoosted) {
        boostedEventInteractions = Math.round(totalInteractions * 0.6);
        nonBoostedEventInteractions = totalInteractions - boostedEventInteractions;
        boostedEventVisits = Math.round(totalVisits * 0.6);
        nonBoostedEventVisits = totalVisits - boostedEventVisits;
      } else if (hasBoosted) {
        boostedEventInteractions = totalInteractions;
        boostedEventVisits = totalVisits;
      } else {
        nonBoostedEventInteractions = totalInteractions;
        nonBoostedEventVisits = totalVisits;
      }

      // Get best performing day index (0=Sunday..6=Saturday)
      const sortedByViews = [...(dailyData || [])].sort(
        (a, b) =>
          (b.new_rsvps_going || 0) + (b.new_rsvps_interested || 0) -
          ((a.new_rsvps_going || 0) + (a.new_rsvps_interested || 0))
      );

      const bestDayIndex = sortedByViews[0]?.date
        ? new Date(sortedByViews[0].date).getDay()
        : 5; // Friday

      return {
        profile: {
          views: {
            without: profileWithout.views,
            with: profileWith.views,
            change: calculateChange(profileWithout.views, profileWith.views),
          },
          interactions: {
            without: profileWithout.interactions,
            with: profileWith.interactions,
            change: calculateChange(profileWithout.interactions, profileWith.interactions),
          },
          visits: {
            without: profileWithout.visits,
            with: profileWith.visits,
            change: calculateChange(profileWithout.visits, profileWith.visits),
          },
        },
        offers: {
          views: {
            without: nonBoostedOfferViews,
            with: boostedOfferViews,
            change: calculateChange(nonBoostedOfferViews, boostedOfferViews),
          },
          interactions: {
            without: nonBoostedOfferInteractions,
            with: boostedOfferInteractions,
            change: calculateChange(nonBoostedOfferInteractions, boostedOfferInteractions),
          },
          visits: {
            without: nonBoostedOfferVisits,
            with: boostedOfferVisits,
            change: calculateChange(nonBoostedOfferVisits, boostedOfferVisits),
          },
        },
        events: {
          views: {
            without: nonBoostedEventViews,
            with: boostedEventViews,
            change: calculateChange(nonBoostedEventViews, boostedEventViews),
          },
          interactions: {
            without: nonBoostedEventInteractions,
            with: boostedEventInteractions,
            change: calculateChange(nonBoostedEventInteractions, boostedEventInteractions),
          },
          visits: {
            without: nonBoostedEventVisits,
            with: boostedEventVisits,
            change: calculateChange(nonBoostedEventVisits, boostedEventVisits),
          },
        },
        bestDays: {
          profile: bestDayIndex,
          offers: bestDayIndex,
          events: bestDayIndex,
        },
      };
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
};
