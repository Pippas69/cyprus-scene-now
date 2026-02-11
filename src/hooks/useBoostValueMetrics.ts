import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeBoostWindow, isTimestampWithinWindow } from "@/lib/boostWindow";

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
  windowStart: string;
  windowEnd: string;
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
  return boostPeriods.some((period) => {
    if (period.entityId !== entityId) return false;
    return isTimestampWithinWindow(timestamp, {
      start: period.windowStart,
      end: period.windowEnd,
    });
  });
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
      const paidSlugs = new Set(["basic", "pro", "elite"]);

      // IMPORTANT: Plan history intervals are stored as [valid_from, valid_to] where
      // our trigger may set valid_to and the next valid_from to the exact same timestamp.
      // To avoid double-counting events at the boundary, we treat CLOSED intervals as
      // half-open: [from, to) (i.e. use < to). Open-ended intervals remain inclusive.
      type HalfOpenInterval = { from: string; to: string; endInclusive: boolean };

      // Pull plan history so attribution is based on the plan at the exact moment
      // (supports multiple upgrades/downgrades within the selected date range)
      const { data: planHistory } = await supabase
        .from("business_subscription_plan_history")
        .select("plan_slug, valid_from, valid_to")
        .eq("business_id", businessId)
        .lte("valid_from", endDate)
        .or(`valid_to.is.null,valid_to.gte.${startDate}`)
        .order("valid_from", { ascending: true });

      const paidIntervals = (planHistory || [])
        .filter((h) => paidSlugs.has(h.plan_slug))
        .map((h): HalfOpenInterval => {
          const rawFrom = new Date(h.valid_from).toISOString();
          const rawTo = new Date(h.valid_to || endDate).toISOString();

          const from = rawFrom < startDate ? startDate : rawFrom;
          const to = rawTo > endDate ? endDate : rawTo;

          // If valid_to is NULL, the interval is open-ended and should be inclusive.
          // Otherwise, treat it as half-open to prevent boundary double-counts.
          const endInclusive = h.valid_to == null;
          return { from, to, endInclusive };
        })
        .filter((i) => new Date(i.from) <= new Date(i.to));

      const sumCountsOverIntervals = async (
        countFn: (from: string, to: string, endInclusive: boolean) => Promise<number>
      ) => {
        let sum = 0;
        for (const interval of paidIntervals) {
          sum += await countFn(interval.from, interval.to, interval.endInclusive);
        }
        return sum;
      };

      // Get business events for visit calculations
      const { data: businessEventsForVisits } = await supabase
        .from("events")
        .select("id")
        .eq("business_id", businessId);
      
      const allEventIds = businessEventsForVisits?.map(e => e.id) || [];

      // Profile metrics - split into two periods so that (without + with) always equals Performance totals
      let profileWithout = { views: 0, interactions: 0, visits: 0 };
      let profileWith = { views: 0, interactions: 0, visits: 0 };

      const countProfileViews = async (
        rangeStart: string,
        rangeEnd: string,
        endInclusive: boolean
      ) => {
        let q = supabase
          .from("engagement_events")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("event_type", "profile_view")
          .gte("created_at", rangeStart);

        q = endInclusive ? q.lte("created_at", rangeEnd) : q.lt("created_at", rangeEnd);
        const { count } = await q;
        return count || 0;
      };

      const countProfileInteractions = async (
        rangeStart: string,
        rangeEnd: string,
        endInclusive: boolean
      ) => {
        let eventsQ = supabase
          .from("engagement_events")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("event_type", ["follow", "favorite", "profile_click", "profile_interaction"])
          .gte("created_at", rangeStart);

        eventsQ = endInclusive
          ? eventsQ.lte("created_at", rangeEnd)
          : eventsQ.lt("created_at", rangeEnd);

        const { count: eventsCount } = await eventsQ;

        let followersQ = supabase
          .from("business_followers")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId)
          .is("unfollowed_at", null)
          .gte("created_at", rangeStart);

        followersQ = endInclusive
          ? followersQ.lte("created_at", rangeEnd)
          : followersQ.lt("created_at", rangeEnd);

        const { count: followerCount } = await followersQ;

        return (eventsCount || 0) + (followerCount || 0);
      };

       // Profile visits attribution: based on RESERVATION CREATION TIME, not check-in time.
       // A visit is "Featured" if the reservation was created while the business had a paid plan,
       // regardless of what plan they have at the time of the actual check-in.
       const isWithinPaidInterval = (timestamp: string): boolean => {
         const ts = new Date(timestamp).getTime();
         return paidIntervals.some((interval) => {
           const from = new Date(interval.from).getTime();
           const to = new Date(interval.to).getTime();
           if (interval.endInclusive) {
             return ts >= from && ts <= to;
           }
           return ts >= from && ts < to;
         });
       };

       const computeProfileVisitAttribution = async () => {
         // Fetch ALL profile reservation check-ins in the date range (filtered by checked_in_at for date range)
         const fetchAllReservations = async () => {
           const pageSize = 1000;
           const out: { id: string; created_at: string; special_requests: string | null }[] = [];
           for (let from = 0; ; from += pageSize) {
             const { data } = await supabase
               .from("reservations")
               .select("id, created_at, special_requests")
               .eq("business_id", businessId)
               .is("event_id", null)
               .not("checked_in_at", "is", null)
               .gte("checked_in_at", startDate)
               .lte("checked_in_at", endDate)
               .range(from, from + pageSize - 1);

             const page = (data || []) as { id: string; created_at: string; special_requests: string | null }[];
             out.push(...page);
             if (page.length < pageSize) break;
           }
           return out;
         };

         const checkedInReservations = await fetchAllReservations();

         // Exclude offer-linked reservations
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

         const directReservations = checkedInReservations.filter(
           (r) => !offerLinkedReservationIds.has(r.id) && !offerMarkedReservationIds.has(r.id)
         );

         let featured = 0;
         let nonFeatured = 0;

         directReservations.forEach((r) => {
           // Attribution: was the business on a paid plan when the RESERVATION was created?
           if (isWithinPaidInterval(r.created_at)) {
             featured++;
           } else {
             nonFeatured++;
           }
         });

         // Student discount redemptions: attribute based on their creation time
         const allStudentRedemptions = await fetchAll<{ id: string; created_at: string }>(
           async (from, to) => {
             const { data } = await supabase
               .from("student_discount_redemptions")
               .select("id, created_at")
               .eq("business_id", businessId)
               .gte("created_at", startDate)
               .lte("created_at", endDate)
               .range(from, from + 999);
             return (data || []) as any;
           }
         );

         allStudentRedemptions.forEach((s) => {
           if (isWithinPaidInterval(s.created_at)) {
             featured++;
           } else {
             nonFeatured++;
           }
         });

         return { featured, nonFeatured };
       };

      // We compute totals for the whole range, then compute "featured" by summing counts
      // only within paid intervals; non-featured = total - featured.
      const totalViews = await countProfileViews(startDate, endDate, true);
      const featuredViews = await sumCountsOverIntervals(countProfileViews);

      const totalInteractions = await countProfileInteractions(startDate, endDate, true);
      const featuredInteractions = await sumCountsOverIntervals(countProfileInteractions);

      // Profile visits: attribution based on reservation creation time, not check-in time
      const visitAttribution = await computeProfileVisitAttribution();

      profileWith = {
        views: featuredViews,
        interactions: featuredInteractions,
        visits: visitAttribution.featured,
      };

      profileWithout = {
        views: Math.max(0, totalViews - featuredViews),
        interactions: Math.max(0, totalInteractions - featuredInteractions),
        visits: visitAttribution.nonFeatured,
      };

      // ========================================
      // OFFERS - Get ALL boost periods (not just active ones)
      // Split based on whether the view happened during a boost period
      // ========================================
      
      const { data: businessOffers } = await supabase
        .from("discounts")
        .select("id")
        .eq("business_id", businessId);

      const businessOfferIds = businessOffers?.map(o => o.id) || [];

       // Get ALL offer boosts that actually ran (active/completed/deactivated)
       const { data: allOfferBoosts } = await supabase
         .from("offer_boosts")
         .select("discount_id, start_date, end_date, created_at, duration_mode, duration_hours, status, updated_at")
         .eq("business_id", businessId)
         .in("status", ["active", "completed", "deactivated"]);

      const offerBoostPeriods: BoostPeriod[] = (allOfferBoosts || [])
        .map((b) => {
           const window = computeBoostWindow({
             start_date: b.start_date,
             end_date: b.end_date,
             created_at: b.created_at,
             duration_mode: b.duration_mode,
             duration_hours: b.duration_hours,
             deactivated_at: b.status === 'deactivated' ? b.updated_at : null,
           });
          if (!window) return null;
          return {
            entityId: b.discount_id,
            windowStart: window.start,
            windowEnd: window.end,
          };
        })
        .filter(Boolean) as BoostPeriod[];

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

      // Offer visits (redemptions) — attribution based on CLAIM time (created_at), not redemption time
      let boostedOfferVisits = 0;
      let nonBoostedOfferVisits = 0;

      if (businessOfferIds.length > 0) {
        const allOfferRedemptions = await fetchAll<{ discount_id: string; created_at: string; redeemed_at: string | null }>(
          async (from, to) => {
            const { data } = await supabase
              .from("offer_purchases")
              .select("discount_id, created_at, redeemed_at")
              .in("discount_id", businessOfferIds)
              .not("redeemed_at", "is", null)
              .gte("redeemed_at", startDate)
              .lte("redeemed_at", endDate)
              .range(from, to);
            return (data || []) as any;
          }
        );

        (allOfferRedemptions || []).forEach(redemption => {
          // Attribution: was the offer boosted when the user CLAIMED it?
          if (redemption.created_at && isWithinBoostPeriod(redemption.created_at, redemption.discount_id, offerBoostPeriods)) {
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

       // Get ALL event boosts that actually ran (active/completed/canceled/deactivated)
       const { data: allEventBoosts } = await supabase
         .from("event_boosts")
         .select("event_id, start_date, end_date, created_at, duration_mode, duration_hours, status, updated_at")
         .eq("business_id", businessId)
         .in("status", ["active", "completed", "canceled", "deactivated"]);

      const eventBoostPeriods: BoostPeriod[] = (allEventBoosts || [])
        .map((b) => {
           const window = computeBoostWindow({
             start_date: b.start_date,
             end_date: b.end_date,
             created_at: b.created_at,
             duration_mode: b.duration_mode,
             duration_hours: b.duration_hours,
             deactivated_at: b.status === 'deactivated' ? b.updated_at : null,
           });
          if (!window) return null;
          return {
            entityId: b.event_id,
            windowStart: window.start,
            windowEnd: window.end,
          };
        })
        .filter(Boolean) as BoostPeriod[];

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

      // Event visits = ticket CHECK-INS + event reservation CHECK-INS
      // IMPORTANT: 
      // 1. Visits must match Performance tab logic (based on checked_in_at, not created_at)
      // 2. Boosted attribution is based on when the ticket was PURCHASED or reservation was CREATED,
      //    but we only count it as a visit if check-in actually happened.
      // 3. FREE ENTRY events are EXCLUDED from visit counts (no way to verify attendance)
      let boostedEventVisits = 0;
      let nonBoostedEventVisits = 0;

      if (businessEventIds.length > 0) {
        // First, get free entry event IDs to exclude them
        const { data: freeEntryEvents } = await supabase
          .from("events")
          .select("id")
          .in("id", businessEventIds)
          .eq("free_entry_declaration", true);

        const freeEntryEventIds = new Set(
          (freeEntryEvents || []).map((e) => e.id)
        );

        // Filter out free entry events for visit counting
        const paidEventIds = businessEventIds.filter(
          (id) => !freeEntryEventIds.has(id)
        );

        if (paidEventIds.length > 0) {
          // Ticket check-ins (only count tickets that were actually checked in)
          const ticketCheckins = await fetchAll<{ event_id: string; created_at: string; checked_in_at: string | null }>(
            async (from, to) => {
              const { data } = await supabase
                .from("tickets")
                .select("event_id, created_at, checked_in_at")
                .in("event_id", paidEventIds)
                .not("checked_in_at", "is", null)
                .gte("checked_in_at", startDate)
                .lte("checked_in_at", endDate)
                .range(from, to);
              return (data || []) as any;
            }
          );

          (ticketCheckins || []).forEach((ticket) => {
            // Attribution based on PURCHASE time (created_at), but only if checked in
            if (ticket.created_at && isWithinBoostPeriod(ticket.created_at, ticket.event_id, eventBoostPeriods)) {
              boostedEventVisits++;
            } else {
              nonBoostedEventVisits++;
            }
          });

          // Event reservation check-ins (only count reservations that were actually checked in)
          const eventReservationCheckins = await fetchAll<{ event_id: string | null; created_at: string; checked_in_at: string | null }>(
            async (from, to) => {
              const { data } = await supabase
                .from("reservations")
                .select("event_id, created_at, checked_in_at")
                .in("event_id", paidEventIds)
                .not("checked_in_at", "is", null)
                .gte("checked_in_at", startDate)
                .lte("checked_in_at", endDate)
                .range(from, to);
              return (data || []) as any;
            }
          );

          (eventReservationCheckins || []).forEach((r) => {
            // Attribution based on RESERVATION time (created_at), but only if checked in
            if (r.event_id && r.created_at && isWithinBoostPeriod(r.created_at, r.event_id, eventBoostPeriods)) {
              boostedEventVisits++;
            } else {
              nonBoostedEventVisits++;
            }
          });
        }
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
    // Analytics should reflect plan changes quickly; also helps avoid seeing cached numbers.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });
};
