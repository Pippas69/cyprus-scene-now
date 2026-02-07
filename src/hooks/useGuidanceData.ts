import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DateRange {
  from: Date;
  to: Date;
}

interface TimeWindow {
  dayIndex: number;
  hours: string;
  count: number;
}

// Totals to match Performance tab exactly
interface SectionTotals {
  views: number;
  interactions: number;
  visits: number;
}

interface GuidanceSection {
  views: TimeWindow[];
  interactions: TimeWindow[];
  visits: TimeWindow[];
}

interface GuidanceData {
  profile: GuidanceSection;
  offers: GuidanceSection;
  events: GuidanceSection;
  // NEW: Total counts matching Performance tab
  profileTotals: SectionTotals;
  offerTotals: SectionTotals;
  eventTotals: SectionTotals;
  recommendedPlan: {
    publish: { dayIndex: number; hours: string };
    interactions: { dayIndex: number; hours: string };
    visits: { dayIndex: number; hours: string };
  };
}

const formatHourRange = (hour: number): string => {
  const start = hour.toString().padStart(2, '0');
  const end = ((hour + 2) % 24).toString().padStart(2, '0');
  return `${start}:00–${end}:00`;
};

export const useGuidanceData = (businessId: string, dateRange?: DateRange) => {
  return useGuidanceDataWithRange(businessId, dateRange);
};

export function useGuidanceDataWithRange(businessId: string, dateRange?: DateRange) {
  return useQuery<GuidanceData>({
    queryKey: ["guidance-data", businessId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const startDate = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = dateRange?.to?.toISOString() || new Date().toISOString();

      // Avoid the 1000-row cap when we need full-fidelity totals.
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

      const analyzeTimestamps = (timestamps: string[] | null | undefined) => {
        const hourCounts: Record<number, Record<number, number>> = {};

        (timestamps || []).forEach((ts) => {
          const date = new Date(ts);
          const day = date.getDay();
          const hour = date.getHours();
          if (!Number.isFinite(day) || !Number.isFinite(hour) || day < 0 || day > 6) return;

          const slot = Math.floor(hour / 2) * 2;
          if (!hourCounts[day]) hourCounts[day] = {};
          hourCounts[day][slot] = (hourCounts[day][slot] || 0) + 1;
        });

        const windows: { day: number; hour: number; count: number }[] = [];
        Object.entries(hourCounts).forEach(([day, hours]) => {
          Object.entries(hours).forEach(([hour, count]) => {
            windows.push({ day: parseInt(day), hour: parseInt(hour), count });
          });
        });

        windows.sort((a, b) => b.count - a.count);
        const top2 = windows.slice(0, 2);

        if (top2.length === 0) {
          return [
            { dayIndex: 5, hours: '18:00–20:00', count: 0 },
            { dayIndex: 6, hours: '19:00–21:00', count: 0 },
          ];
        }

        return top2.map((w) => ({
          dayIndex: w.day,
          hours: formatHourRange(w.hour),
          count: w.count,
        }));
      };

      // Fetch IDs
      const [{ data: offers }, { data: events }] = await Promise.all([
        supabase.from('discounts').select('id').eq('business_id', businessId),
        supabase.from('events').select('id').eq('business_id', businessId),
      ]);

      const offerIds = offers?.map((o) => o.id) || [];
      const eventIds = events?.map((e) => e.id) || [];

      // ========================================
      // PROFILE - Same algorithm as Performance
      // ========================================

      const profileViewEvents = await fetchAll<{ created_at: string }>(async (from, to) => {
        const { data } = await supabase
          .from('engagement_events')
          .select('created_at')
          .eq('business_id', businessId)
          .eq('event_type', 'profile_view')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .range(from, to);
        return (data || []) as any;
      });

      const profileViews = analyzeTimestamps(profileViewEvents?.map((e) => e.created_at));

      const profileInteractionEvents = await fetchAll<{ created_at: string }>(async (from, to) => {
        const { data } = await supabase
          .from('engagement_events')
          .select('created_at')
          .eq('business_id', businessId)
          .in('event_type', ['follow', 'favorite', 'profile_click', 'profile_interaction'])
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .range(from, to);
        return (data || []) as any;
      });

      const followerData = await fetchAll<{ created_at: string }>(async (from, to) => {
        const { data } = await supabase
          .from('business_followers')
          .select('created_at')
          .eq('business_id', businessId)
          .is('unfollowed_at', null)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .range(from, to);
        return (data || []) as any;
      });

      const allProfileInteractionTimestamps = [
        ...(profileInteractionEvents?.map((e) => e.created_at) || []),
        ...(followerData?.map((f) => f.created_at) || []),
      ];
      const profileInteractions = analyzeTimestamps(allProfileInteractionTimestamps);

      const profileVisitCheckins = await fetchAll<{ id: string; checked_in_at: string | null }>(async (from, to) => {
        const { data } = await supabase
          .from('reservations')
          .select('id, checked_in_at')
          .eq('business_id', businessId)
          .is('event_id', null)
          .not('checked_in_at', 'is', null)
          .gte('checked_in_at', startDate)
          .lte('checked_in_at', endDate)
          .range(from, to);
        return (data || []) as any;
      });

      const reservationIds = (profileVisitCheckins || []).map((r) => r.id).filter(Boolean) as string[];

      // Offer-linked reservations also have event_id = NULL; exclude them from *profile* visits.
      let offerLinkedReservationIds = new Set<string>();
      if (reservationIds.length > 0) {
        const { data: offerLinks } = await supabase
          .from('offer_purchases')
          .select('reservation_id')
          .in('reservation_id', reservationIds)
          .not('reservation_id', 'is', null);

        offerLinkedReservationIds = new Set(
          (offerLinks || [])
            .map((o) => (o as { reservation_id: string | null }).reservation_id)
            .filter(Boolean) as string[]
        );
      }

      const profileVisitTimestamps = (profileVisitCheckins || [])
        .filter((r) => r.checked_in_at && !offerLinkedReservationIds.has(r.id))
        .map((r) => r.checked_in_at as string);

      // Student discount redemptions (QR check-ins from student discounts)
      const studentDiscountCheckins = await fetchAll<{ created_at: string }>(async (from, to) => {
        const { data } = await supabase
          .from('student_discount_redemptions')
          .select('created_at')
          .eq('business_id', businessId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .range(from, to);
        return (data || []) as any;
      });

      const studentDiscountTimestamps = (studentDiscountCheckins || []).map((r) => r.created_at);
      const allProfileVisitTimestamps = [...profileVisitTimestamps, ...studentDiscountTimestamps];

      const profileVisits = analyzeTimestamps(allProfileVisitTimestamps);

      // ========================================
      // OFFERS - Same algorithm as Performance
      // ========================================

      let offerViewTimestamps: string[] = [];
      let offerInteractionTimestamps: string[] = [];
      let offerVisitTimestamps: string[] = [];

      if (offerIds.length > 0) {
        const offerViewsRes = await fetchAll<{ viewed_at: string }>(async (from, to) => {
          const { data } = await supabase
            .from('discount_views')
            .select('viewed_at')
            .in('discount_id', offerIds)
            .gte('viewed_at', startDate)
            .lte('viewed_at', endDate)
            .range(from, to);
          return (data || []) as any;
        });
        offerViewTimestamps = (offerViewsRes || []).map((v) => v.viewed_at);

        const offerInteractionsRes = await fetchAll<{ created_at: string }>(async (from, to) => {
          const { data } = await supabase
            .from('engagement_events')
            .select('created_at')
            .eq('business_id', businessId)
            .eq('event_type', 'offer_redeem_click')
            .in('entity_id', offerIds)
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .range(from, to);
          return (data || []) as any;
        });
        offerInteractionTimestamps = (offerInteractionsRes || []).map((v) => v.created_at);

        const offerRedemptionsRes = await fetchAll<{ redeemed_at: string | null }>(async (from, to) => {
          const { data } = await supabase
            .from('offer_purchases')
            .select('redeemed_at')
            .in('discount_id', offerIds)
            .not('redeemed_at', 'is', null)
            .gte('redeemed_at', startDate)
            .lte('redeemed_at', endDate)
            .range(from, to);
          return (data || []) as any;
        });
        offerVisitTimestamps = (offerRedemptionsRes || [])
          .filter((v) => v.redeemed_at)
          .map((v) => v.redeemed_at as string);
      }

      const offerViews = analyzeTimestamps(offerViewTimestamps);
      const offerInteractions = analyzeTimestamps(offerInteractionTimestamps);
      const offerVisits = analyzeTimestamps(offerVisitTimestamps);

      // ========================================
      // EVENTS - Same algorithm as Performance
      // ========================================

      let eventViewTimestamps: string[] = [];
      let eventInteractionTimestamps: string[] = [];
      let eventVisitTimestamps: string[] = [];

      if (eventIds.length > 0) {
        const eventViewsRes = await fetchAll<{ viewed_at: string }>(async (from, to) => {
          const { data } = await supabase
            .from('event_views')
            .select('viewed_at')
            .in('event_id', eventIds)
            .gte('viewed_at', startDate)
            .lte('viewed_at', endDate)
            .range(from, to);
          return (data || []) as any;
        });
        eventViewTimestamps = (eventViewsRes || []).map((v) => v.viewed_at);

        const rsvpsRes = await fetchAll<{ created_at: string }>(async (from, to) => {
          const { data } = await supabase
            .from('rsvps')
            .select('created_at')
            .in('event_id', eventIds)
            .in('status', ['interested', 'going'])
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .range(from, to);
          return (data || []) as any;
        });
        eventInteractionTimestamps = (rsvpsRes || []).map((v) => v.created_at);

        const ticketCheckInsRes = await fetchAll<{ checked_in_at: string | null }>(async (from, to) => {
          const { data } = await supabase
            .from('tickets')
            .select('checked_in_at')
            .in('event_id', eventIds)
            .not('checked_in_at', 'is', null)
            .gte('checked_in_at', startDate)
            .lte('checked_in_at', endDate)
            .range(from, to);
          return (data || []) as any;
        });

        const ticketCheckIns = (ticketCheckInsRes || [])
          .filter((t) => t.checked_in_at)
          .map((t) => t.checked_in_at as string);

        const eventReservationCheckinsRes = await fetchAll<{ checked_in_at: string | null }>(async (from, to) => {
          const { data } = await supabase
            .from('reservations')
            .select('checked_in_at')
            .in('event_id', eventIds)
            .not('checked_in_at', 'is', null)
            .gte('checked_in_at', startDate)
            .lte('checked_in_at', endDate)
            .range(from, to);
          return (data || []) as any;
        });

        const eventReservationCheckins = (eventReservationCheckinsRes || [])
          .filter((r) => r.checked_in_at)
          .map((r) => r.checked_in_at as string);

        eventVisitTimestamps = [...ticketCheckIns, ...eventReservationCheckins];
      }

      const eventViews = analyzeTimestamps(eventViewTimestamps);
      const eventInteractions = analyzeTimestamps(eventInteractionTimestamps);
      const eventVisits = analyzeTimestamps(eventVisitTimestamps);

      // Recommended plan windows
      const allViewTimestamps = [
        ...(profileViewEvents?.map((e) => e.created_at) || []),
        ...offerViewTimestamps,
        ...eventViewTimestamps,
      ];
      const bestPublishWindows = analyzeTimestamps(allViewTimestamps);

      const allInteractionTimestamps = [
        ...allProfileInteractionTimestamps,
        ...offerInteractionTimestamps,
        ...eventInteractionTimestamps,
      ];
      const bestInteractionWindows = analyzeTimestamps(allInteractionTimestamps);

      const allVisitTimestamps = [
        ...profileVisitTimestamps,
        ...offerVisitTimestamps,
        ...eventVisitTimestamps,
      ];
      const bestVisitWindows = analyzeTimestamps(allVisitTimestamps);

      const bestPublish = bestPublishWindows[0] || { dayIndex: 5, hours: '17:00–19:00' };
      const bestInteractions = bestInteractionWindows[0] || { dayIndex: 5, hours: '18:00–21:00' };
      const bestVisits = bestVisitWindows[0] || { dayIndex: 5, hours: '20:00–23:00' };

      return {
        profile: {
          views: profileViews.length > 0 && profileViews[0].count > 0 ? profileViews : [
            { dayIndex: 5, hours: '17:00–19:00', count: 0 },
            { dayIndex: 6, hours: '17:00–19:00', count: 0 },
          ],
          interactions: profileInteractions.length > 0 && profileInteractions[0].count > 0 ? profileInteractions : [
            { dayIndex: 5, hours: '18:00–21:00', count: 0 },
            { dayIndex: 6, hours: '18:00–21:00', count: 0 },
          ],
          visits: profileVisits.length > 0 && profileVisits[0].count > 0 ? profileVisits : [
            { dayIndex: 5, hours: '20:00–23:00', count: 0 },
            { dayIndex: 6, hours: '20:00–23:00', count: 0 },
          ],
        },
        offers: {
          views: offerViews.length > 0 && offerViews[0].count > 0 ? offerViews : [
            { dayIndex: 5, hours: '17:00–19:00', count: 0 },
            { dayIndex: 6, hours: '17:00–19:00', count: 0 },
          ],
          interactions: offerInteractions.length > 0 && offerInteractions[0].count > 0 ? offerInteractions : [
            { dayIndex: 5, hours: '18:00–21:00', count: 0 },
            { dayIndex: 6, hours: '18:00–21:00', count: 0 },
          ],
          visits: offerVisits.length > 0 && offerVisits[0].count > 0 ? offerVisits : [
            { dayIndex: 5, hours: '20:00–23:00', count: 0 },
            { dayIndex: 6, hours: '20:00–23:00', count: 0 },
          ],
        },
        events: {
          views: eventViews.length > 0 && eventViews[0].count > 0 ? eventViews : [
            { dayIndex: 3, hours: '19:00–21:00', count: 0 },
            { dayIndex: 4, hours: '19:00–21:00', count: 0 },
          ],
          interactions: eventInteractions.length > 0 && eventInteractions[0].count > 0 ? eventInteractions : [
            { dayIndex: 4, hours: '20:00–23:00', count: 0 },
            { dayIndex: 5, hours: '19:00–22:00', count: 0 },
          ],
          visits: eventVisits.length > 0 && eventVisits[0].count > 0 ? eventVisits : [
            { dayIndex: 5, hours: '23:00–03:00', count: 0 },
            { dayIndex: 6, hours: '23:00–03:00', count: 0 },
          ],
        },
        profileTotals: {
          views: profileViewEvents?.length || 0,
          interactions: allProfileInteractionTimestamps.length,
          visits: allProfileVisitTimestamps.length,
        },
        offerTotals: {
          views: offerViewTimestamps.length,
          interactions: offerInteractionTimestamps.length,
          visits: offerVisitTimestamps.length,
        },
        eventTotals: {
          views: eventViewTimestamps.length,
          interactions: eventInteractionTimestamps.length,
          visits: eventVisitTimestamps.length,
        },
        recommendedPlan: {
          publish: { dayIndex: bestPublish.dayIndex, hours: bestPublish.hours },
          interactions: { dayIndex: bestInteractions.dayIndex, hours: bestInteractions.hours },
          visits: { dayIndex: bestVisits.dayIndex, hours: bestVisits.hours },
        },
      };
    },
    enabled: !!businessId,
    staleTime: 10 * 60 * 1000,
  });
}
