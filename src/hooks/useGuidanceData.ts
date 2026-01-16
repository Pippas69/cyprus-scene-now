import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TimeWindow {
  dayIndex: number;
  hours: string;
  count: number;
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

export const useGuidanceData = (businessId: string) => {
  return useQuery<GuidanceData>({
    queryKey: ["guidance-data", businessId],
    queryFn: async () => {
      // Last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

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

      // PROFILE (from engagement_events)
      const { data: engagementEvents } = await supabase
        .from('engagement_events')
        .select('event_type, created_at')
        .eq('business_id', businessId)
        .gte('created_at', thirtyDaysAgo);

      const profileViews = analyzeTimestamps(
        engagementEvents?.filter((e) => e.event_type === 'profile_view').map((e) => e.created_at)
      );
      const profileInteractions = analyzeTimestamps(
        engagementEvents
          ?.filter((e) => ['follow', 'save', 'share'].includes(e.event_type))
          .map((e) => e.created_at)
      );
      const profileVisits = analyzeTimestamps(
        engagementEvents?.filter((e) => e.event_type === 'check_in').map((e) => e.created_at)
      );

      // OFFERS
      const [offerViewsRes, offerInteractionsRes, offerScansRes] = await Promise.all([
        offerIds.length
          ? supabase
              .from('discount_views')
              .select('viewed_at')
              .in('discount_id', offerIds)
              .gte('viewed_at', thirtyDaysAgo)
          : Promise.resolve({ data: [] as any[] }),
        offerIds.length
          ? supabase
              .from('engagement_events')
              .select('created_at')
              .eq('business_id', businessId)
              .eq('event_type', 'offer_redeem_click')
              .in('entity_id', offerIds)
              .gte('created_at', thirtyDaysAgo)
          : Promise.resolve({ data: [] as any[] }),
        offerIds.length
          ? supabase
              .from('discount_scans')
              .select('scanned_at')
              .in('discount_id', offerIds)
              .eq('success', true)
              .gte('scanned_at', thirtyDaysAgo)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const offerViews = analyzeTimestamps((offerViewsRes.data || []).map((v: any) => v.viewed_at));
      const offerInteractions = analyzeTimestamps(
        (offerInteractionsRes.data || []).map((v: any) => v.created_at)
      );
      const offerVisits = analyzeTimestamps((offerScansRes.data || []).map((v: any) => v.scanned_at));

      // EVENTS
      const [eventViewsRes, rsvpsRes, reservationsRes, ticketCheckInsRes] = await Promise.all([
        eventIds.length
          ? supabase
              .from('event_views')
              .select('viewed_at')
              .in('event_id', eventIds)
              .gte('viewed_at', thirtyDaysAgo)
          : Promise.resolve({ data: [] as any[] }),
        eventIds.length
          ? supabase
              .from('rsvps')
              .select('created_at')
              .in('event_id', eventIds)
              .in('status', ['interested', 'going'])
              .gte('created_at', thirtyDaysAgo)
          : Promise.resolve({ data: [] as any[] }),
        eventIds.length
          ? supabase
              .from('reservations')
              .select('created_at')
              .in('event_id', eventIds)
              .gte('created_at', thirtyDaysAgo)
          : Promise.resolve({ data: [] as any[] }),
        eventIds.length
          ? supabase
              .from('tickets')
              .select('checked_in_at')
              .in('event_id', eventIds)
              .not('checked_in_at', 'is', null)
              .gte('checked_in_at', thirtyDaysAgo)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const eventViews = analyzeTimestamps((eventViewsRes.data || []).map((v: any) => v.viewed_at));
      const eventInteractions = analyzeTimestamps((rsvpsRes.data || []).map((v: any) => v.created_at));
      const eventVisits = analyzeTimestamps([
        ...(reservationsRes.data || []).map((v: any) => v.created_at),
        ...(ticketCheckInsRes.data || []).map((v: any) => v.checked_in_at),
      ]);

      // Generate recommended plan based on profile best times
      const bestPublish = profileViews[0] || { dayIndex: 5, hours: '17:00–19:00' };
      const bestInteractions = profileInteractions[0] || { dayIndex: 5, hours: '18:00–21:00' };
      const bestVisits = profileVisits[0] || { dayIndex: 5, hours: '20:00–23:00' };

      return {
        profile: {
          views: profileViews,
          interactions: profileInteractions,
          visits: profileVisits,
        },
        offers: {
          views: offerViews.length > 0 ? offerViews : [
            { dayIndex: 5, hours: '17:00–19:00', count: 0 },
            { dayIndex: 6, hours: '17:00–19:00', count: 0 },
          ],
          interactions: offerInteractions.length > 0 ? offerInteractions : [
            { dayIndex: 5, hours: '18:00–21:00', count: 0 },
            { dayIndex: 6, hours: '18:00–21:00', count: 0 },
          ],
          visits: offerVisits.length > 0 ? offerVisits : [
            { dayIndex: 5, hours: '20:00–23:00', count: 0 },
            { dayIndex: 6, hours: '20:00–23:00', count: 0 },
          ],
        },
        events: {
          views: eventViews.length > 0 ? eventViews : [
            { dayIndex: 3, hours: '19:00–21:00', count: 0 },
            { dayIndex: 4, hours: '19:00–21:00', count: 0 },
          ],
          interactions: eventInteractions.length > 0 ? eventInteractions : [
            { dayIndex: 4, hours: '20:00–23:00', count: 0 },
            { dayIndex: 5, hours: '19:00–22:00', count: 0 },
          ],
          visits: eventVisits.length > 0 ? eventVisits : [
            { dayIndex: 5, hours: '23:00–03:00', count: 0 },
            { dayIndex: 6, hours: '23:00–03:00', count: 0 },
          ],
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
};
