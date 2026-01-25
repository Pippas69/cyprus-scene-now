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

interface BoostPeriod {
  entityId: string;
  startDate: string;
  endDate: string;
}

const calculateChange = (without: number, withBoost: number): number => {
  if (without === 0) return withBoost > 0 ? 100 : 0;
  return Math.round(((withBoost - without) / without) * 100);
};

// Helper to check if a timestamp falls within any boost period for an entity
const isWithinBoostPeriod = (
  timestamp: string,
  entityId: string,
  boostPeriods: BoostPeriod[]
): boolean => {
  const date = new Date(timestamp);
  return boostPeriods.some(
    (period) =>
      period.entityId === entityId &&
      date >= new Date(period.startDate) &&
      date <= new Date(period.endDate + "T23:59:59.999Z")
  );
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

      // NOTE: We must avoid the 1000-row cap for analytics accuracy.
      const fetchAll = async <T,>(
        fetchPage: (from: number, to: number) => Promise<T[]>
      ): Promise<T[]> => {
        const pageSize = 1000;
        const out: T[] = [];
        for (let from = 0; ; from += pageSize) {
          const page = await fetchPage(from, from + pageSize - 1);
          out.push(...page);
          if (page.length < pageSize) break;
        }
        return out;
      };

      // ========================================
      // PROFILE - Featured vs Non-Featured (based on subscription)
      // ========================================
      
      // Check if business has/had active subscription (featured profile)
      const { data: subscription } = await supabase
        .from("business_subscriptions")
        .select("current_period_start, current_period_end, status")
        .eq("business_id", businessId)
        .maybeSingle();

      const featuredStart = subscription?.current_period_start;

      // Get business events for visit calculations
      const { data: businessEventsForVisits } = await supabase
        .from("events")
        .select("id")
        .eq("business_id", businessId);
      
      const allEventIds = businessEventsForVisits?.map(e => e.id) || [];

      // Profile metrics - split into two periods so that (without + with) always equals Performance totals
      let profileWithout = { views: 0, interactions: 0, visits: 0 };
      let profileWith = { views: 0, interactions: 0, visits: 0 };

      const countProfileViews = async (rangeStart: string, rangeEnd: string) => {
        const { count } = await supabase
          .from("engagement_events")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("event_type", "profile_view")
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd);
        return count || 0;
      };

      const countProfileInteractions = async (rangeStart: string, rangeEnd: string) => {
        const { count: eventsCount } = await supabase
          .from("engagement_events")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("event_type", ["follow", "favorite", "profile_click", "profile_interaction"])
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd);

        const { count: followerCount } = await supabase
          .from("business_followers")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId)
          .is("unfollowed_at", null)
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd);

        return (eventsCount || 0) + (followerCount || 0);
      };

      const countProfileVisits = async (rangeStart: string, rangeEnd: string) => {
        const { count } = await supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .is("event_id", null)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", rangeStart)
          .lte("checked_in_at", rangeEnd);

        return count || 0;
      };

      // Determine how the featuredStart splits the selected date range
      const hasFeaturedStart = !!featuredStart;
      const featuredStartIso = featuredStart ? new Date(featuredStart).toISOString() : null;

      if (!hasFeaturedStart || !featuredStartIso) {
        // No featured period at all
        profileWithout = {
          views: await countProfileViews(startDate, endDate),
          interactions: await countProfileInteractions(startDate, endDate),
          visits: await countProfileVisits(startDate, endDate),
        };
      } else if (featuredStartIso <= startDate) {
        // Entire range is within featured period
        profileWith = {
          views: await countProfileViews(startDate, endDate),
          interactions: await countProfileInteractions(startDate, endDate),
          visits: await countProfileVisits(startDate, endDate),
        };
      } else if (featuredStartIso >= endDate) {
        // Entire range is before featured period
        profileWithout = {
          views: await countProfileViews(startDate, endDate),
          interactions: await countProfileInteractions(startDate, endDate),
          visits: await countProfileVisits(startDate, endDate),
        };
      } else {
        // Split range: [startDate, featuredStart) and [featuredStart, endDate]
        // Without (non-featured)
        const { count: withoutViewsCount } = await supabase
          .from("engagement_events")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("event_type", "profile_view")
          .gte("created_at", startDate)
          .lt("created_at", featuredStartIso);

        const { count: withoutInteractionsEventsCount } = await supabase
          .from("engagement_events")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("event_type", ["follow", "favorite", "share", "profile_click"])
          .gte("created_at", startDate)
          .lt("created_at", featuredStartIso);

        const { count: withoutFollowerCount } = await supabase
          .from("business_followers")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId)
          .is("unfollowed_at", null)
          .gte("created_at", startDate)
          .lt("created_at", featuredStartIso);

        const { count: withoutResCheckins } = await supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .is("event_id", null)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", startDate)
          .lt("checked_in_at", featuredStartIso);

        profileWithout = {
          views: withoutViewsCount || 0,
          interactions: (withoutInteractionsEventsCount || 0) + (withoutFollowerCount || 0),
          visits: withoutResCheckins || 0,
        };

        // With (featured)
        profileWith = {
          views: await countProfileViews(featuredStartIso, endDate),
          interactions: await countProfileInteractions(featuredStartIso, endDate),
          visits: await countProfileVisits(featuredStartIso, endDate),
        };
      }

      // ========================================
      // OFFERS - Get ALL boost periods (not just active ones)
      // Split based on whether the view happened during a boost period
      // ========================================
      
      const { data: businessOffers } = await supabase
        .from("discounts")
        .select("id")
        .eq("business_id", businessId);

      const businessOfferIds = businessOffers?.map(o => o.id) || [];

      // Get ALL offer boosts (any status) with their date ranges
      const { data: allOfferBoosts } = await supabase
        .from("offer_boosts")
        .select("discount_id, start_date, end_date")
        .eq("business_id", businessId)
        .in("status", ["active", "completed", "paused"]);

      const offerBoostPeriods: BoostPeriod[] = (allOfferBoosts || []).map(b => ({
        entityId: b.discount_id,
        startDate: b.start_date,
        endDate: b.end_date,
      }));

      // Get ALL offer views with timestamps
      let boostedOfferViews = 0;
      let nonBoostedOfferViews = 0;

      if (businessOfferIds.length > 0) {
        const allOfferViews = await fetchAll<{ discount_id: string; viewed_at: string }>(
          async (from, to) => {
            const { data } = await supabase
              .from("discount_views")
              .select("discount_id, viewed_at")
              .in("discount_id", businessOfferIds)
              .gte("viewed_at", startDate)
              .lte("viewed_at", endDate)
              .range(from, to);
            return (data || []) as any;
          }
        );

        // Split views based on whether they occurred during a boost period
        (allOfferViews || []).forEach(view => {
          if (isWithinBoostPeriod(view.viewed_at, view.discount_id, offerBoostPeriods)) {
            boostedOfferViews++;
          } else {
            nonBoostedOfferViews++;
          }
        });
      }

      // Offer interactions = clicks on "Εξαργύρωσε" (intent)
      const { data: offerInteractions } = await supabase
        .from("engagement_events")
        .select("id, entity_id, created_at")
        .eq("business_id", businessId)
        .eq("event_type", "offer_redeem_click")
        .in("entity_id", businessOfferIds.length > 0 ? businessOfferIds : ['00000000-0000-0000-0000-000000000000'])
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      let boostedOfferInteractions = 0;
      let nonBoostedOfferInteractions = 0;
      (offerInteractions || []).forEach(interaction => {
        if (interaction.entity_id && isWithinBoostPeriod(interaction.created_at, interaction.entity_id, offerBoostPeriods)) {
          boostedOfferInteractions++;
        } else {
          nonBoostedOfferInteractions++;
        }
      });

      // Offer visits (redemptions)
      let boostedOfferVisits = 0;
      let nonBoostedOfferVisits = 0;

      if (businessOfferIds.length > 0) {
        const allOfferRedemptions = await fetchAll<{ discount_id: string; redeemed_at: string | null }>(
          async (from, to) => {
            const { data } = await supabase
              .from("offer_purchases")
              .select("discount_id, redeemed_at")
              .in("discount_id", businessOfferIds)
              .not("redeemed_at", "is", null)
              .gte("redeemed_at", startDate)
              .lte("redeemed_at", endDate)
              .range(from, to);
            return (data || []) as any;
          }
        );

        (allOfferRedemptions || []).forEach(redemption => {
          if (redemption.redeemed_at && isWithinBoostPeriod(redemption.redeemed_at, redemption.discount_id, offerBoostPeriods)) {
            boostedOfferVisits++;
          } else {
            nonBoostedOfferVisits++;
          }
        });
      }

      // ========================================
      // EVENTS - Same logic: split by boost period timing
      // ========================================
      
      const { data: businessEvents } = await supabase
        .from("events")
        .select("id")
        .eq("business_id", businessId);

      const businessEventIds = businessEvents?.map(e => e.id) || [];

      // Get ALL event boosts (any status) with their date ranges
      const { data: allEventBoosts } = await supabase
        .from("event_boosts")
        .select("event_id, start_date, end_date")
        .eq("business_id", businessId)
        .in("status", ["active", "completed", "canceled", "pending", "scheduled"]);

      const eventBoostPeriods: BoostPeriod[] = (allEventBoosts || []).map(b => ({
        entityId: b.event_id,
        startDate: b.start_date,
        endDate: b.end_date,
      }));

      // Event views
      let boostedEventViews = 0;
      let nonBoostedEventViews = 0;

      if (businessEventIds.length > 0) {
        const allEventViews = await fetchAll<{ event_id: string; viewed_at: string }>(
          async (from, to) => {
            const { data } = await supabase
              .from("event_views")
              .select("event_id, viewed_at")
              .in("event_id", businessEventIds)
              .gte("viewed_at", startDate)
              .lte("viewed_at", endDate)
              .range(from, to);
            return (data || []) as any;
          }
        );

        (allEventViews || []).forEach(view => {
          if (isWithinBoostPeriod(view.viewed_at, view.event_id, eventBoostPeriods)) {
            boostedEventViews++;
          } else {
            nonBoostedEventViews++;
          }
        });
      }

      // Event interactions (RSVPs)
      let boostedEventInteractions = 0;
      let nonBoostedEventInteractions = 0;

      if (businessEventIds.length > 0) {
        const { data: allRsvps } = await supabase
          .from("rsvps")
          .select("event_id, created_at")
          .in("event_id", businessEventIds)
          .in("status", ["interested", "going"])
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        (allRsvps || []).forEach(rsvp => {
          if (isWithinBoostPeriod(rsvp.created_at, rsvp.event_id, eventBoostPeriods)) {
            boostedEventInteractions++;
          } else {
            nonBoostedEventInteractions++;
          }
        });
      }

      // Event visits = ticket check-ins + event reservation check-ins
      let boostedEventVisits = 0;
      let nonBoostedEventVisits = 0;

      if (businessEventIds.length > 0) {
        // Ticket check-ins
        const ticketCheckins = await fetchAll<{ event_id: string; checked_in_at: string | null }>(
          async (from, to) => {
            const { data } = await supabase
              .from("tickets")
              .select("event_id, checked_in_at")
              .in("event_id", businessEventIds)
              .not("checked_in_at", "is", null)
              .gte("checked_in_at", startDate)
              .lte("checked_in_at", endDate)
              .range(from, to);
            return (data || []) as any;
          }
        );

        (ticketCheckins || []).forEach(ticket => {
          if (ticket.checked_in_at && isWithinBoostPeriod(ticket.checked_in_at, ticket.event_id, eventBoostPeriods)) {
            boostedEventVisits++;
          } else {
            nonBoostedEventVisits++;
          }
        });

        // Event reservation check-ins
        const eventResCheckins = await fetchAll<{ event_id: string | null; checked_in_at: string | null }>(
          async (from, to) => {
            const { data } = await supabase
              .from("reservations")
              .select("event_id, checked_in_at")
              .in("event_id", businessEventIds)
              .not("checked_in_at", "is", null)
              .gte("checked_in_at", startDate)
              .lte("checked_in_at", endDate)
              .range(from, to);
            return (data || []) as any;
          }
        );

        (eventResCheckins || []).forEach(res => {
          if (res.event_id && res.checked_in_at && isWithinBoostPeriod(res.checked_in_at, res.event_id, eventBoostPeriods)) {
            boostedEventVisits++;
          } else {
            nonBoostedEventVisits++;
          }
        });
      }

      // Get best performing day from RSVPs
      const { data: rsvpDays } = await supabase
        .from("rsvps")
        .select("created_at")
        .in("event_id", businessEventIds.length > 0 ? businessEventIds : ['00000000-0000-0000-0000-000000000000'])
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      // Get best performing day index (0=Sunday..6=Saturday) from RSVPs
      const dayCounts: Record<number, number> = {};
      (rsvpDays || []).forEach((r: { created_at: string }) => {
        const day = new Date(r.created_at).getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });

      const bestDayIndex = Object.entries(dayCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0]
        ? parseInt(Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0])
        : 5; // Default Friday

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
