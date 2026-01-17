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
      const now = new Date().toISOString();

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
      
      // Profile views from engagement_events (same as Performance)
      const { data: profileViewEvents } = await supabase
        .from('engagement_events')
        .select('created_at')
        .eq('business_id', businessId)
        .eq('event_type', 'profile_view')
        .gte('created_at', thirtyDaysAgo)
        .lte('created_at', now);

      const profileViews = analyzeTimestamps(profileViewEvents?.map((e) => e.created_at));

      // Profile interactions (follows, shares, clicks) - same as Performance
      const { data: profileInteractionEvents } = await supabase
        .from('engagement_events')
        .select('created_at')
        .eq('business_id', businessId)
        .in('event_type', ['follow', 'favorite', 'share', 'click', 'profile_click'])
        .gte('created_at', thirtyDaysAgo)
        .lte('created_at', now);

      // Also count business followers for interactions - same as Performance
      const { data: followerData } = await supabase
        .from('business_followers')
        .select('created_at')
        .eq('business_id', businessId)
        .is('unfollowed_at', null)
        .gte('created_at', thirtyDaysAgo)
        .lte('created_at', now);

      const allProfileInteractionTimestamps = [
        ...(profileInteractionEvents?.map((e) => e.created_at) || []),
        ...(followerData?.map((f) => f.created_at) || []),
      ];
      const profileInteractions = analyzeTimestamps(allProfileInteractionTimestamps);

      // Profile visits = reservation scans (QR check-ins) for direct business reservations
      const { data: profileVisitScans } = await (supabase
        .from('reservation_scans') as any)
        .select('scanned_at')
        .eq('business_id', businessId)
        .gte('scanned_at', thirtyDaysAgo)
        .lte('scanned_at', now);

      const profileVisits = analyzeTimestamps((profileVisitScans || []).map((s: any) => s.scanned_at));

      // ========================================
      // OFFERS - Same algorithm as Performance
      // ========================================
      
      let offerViewTimestamps: string[] = [];
      let offerInteractionTimestamps: string[] = [];
      let offerVisitTimestamps: string[] = [];

      if (offerIds.length > 0) {
        // Offer views from discount_views
        const { data: offerViewsRes } = await supabase
          .from('discount_views')
          .select('viewed_at')
          .in('discount_id', offerIds)
          .gte('viewed_at', thirtyDaysAgo)
          .lte('viewed_at', now);
        offerViewTimestamps = (offerViewsRes || []).map((v) => v.viewed_at);

        // Offer interactions = clicks on "Εξαργύρωσε" (same as Performance)
        const { data: offerInteractionsRes } = await supabase
          .from('engagement_events')
          .select('created_at')
          .eq('business_id', businessId)
          .eq('event_type', 'offer_redeem_click')
          .in('entity_id', offerIds)
          .gte('created_at', thirtyDaysAgo)
          .lte('created_at', now);
        offerInteractionTimestamps = (offerInteractionsRes || []).map((v) => v.created_at);

        // Offer visits (redemptions/scans) - same as Performance
        const { data: offerScansRes } = await supabase
          .from('discount_scans')
          .select('scanned_at')
          .in('discount_id', offerIds)
          .eq('success', true)
          .gte('scanned_at', thirtyDaysAgo)
          .lte('scanned_at', now);
        offerVisitTimestamps = (offerScansRes || []).map((v) => v.scanned_at);
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
        // Event views from event_views
        const { data: eventViewsRes } = await supabase
          .from('event_views')
          .select('viewed_at')
          .in('event_id', eventIds)
          .gte('viewed_at', thirtyDaysAgo)
          .lte('viewed_at', now);
        eventViewTimestamps = (eventViewsRes || []).map((v) => v.viewed_at);

        // Event interactions (RSVPs) - same as Performance
        const { data: rsvpsRes } = await supabase
          .from('rsvps')
          .select('created_at')
          .in('event_id', eventIds)
          .in('status', ['interested', 'going'])
          .gte('created_at', thirtyDaysAgo)
          .lte('created_at', now);
        eventInteractionTimestamps = (rsvpsRes || []).map((v) => v.created_at);

        // Event visits = ticket check-ins + event reservation scans - same as Performance
        const { data: ticketCheckInsRes } = await supabase
          .from('tickets')
          .select('checked_in_at')
          .in('event_id', eventIds)
          .not('checked_in_at', 'is', null)
          .gte('created_at', thirtyDaysAgo)
          .lte('created_at', now);
        
        const ticketCheckIns = (ticketCheckInsRes || [])
          .filter((t) => t.checked_in_at)
          .map((t) => t.checked_in_at as string);

        // Add event-linked reservation scans
        const { data: eventReservations } = await supabase
          .from('reservations')
          .select('id')
          .in('event_id', eventIds)
          .gte('created_at', thirtyDaysAgo)
          .lte('created_at', now);

        const eventResIds = eventReservations?.map((r) => r.id) || [];
        let eventResScanTimestamps: string[] = [];
        
        if (eventResIds.length > 0) {
          const { data: eventResScansRes } = await (supabase
            .from('reservation_scans') as any)
            .select('scanned_at')
            .in('reservation_id', eventResIds);
          eventResScanTimestamps = (eventResScansRes || []).map((s: any) => s.scanned_at);
        }

        eventVisitTimestamps = [...ticketCheckIns, ...eventResScanTimestamps];
      }

      const eventViews = analyzeTimestamps(eventViewTimestamps);
      const eventInteractions = analyzeTimestamps(eventInteractionTimestamps);
      const eventVisits = analyzeTimestamps(eventVisitTimestamps);

      // ========================================
      // RECOMMENDED PLAN
      // Based on best times for interactions and visits across all content
      // ========================================
      
      // Combine all timestamps for best publish time (based on profile views - when people are looking)
      const allViewTimestamps = [
        ...(profileViewEvents?.map((e) => e.created_at) || []),
        ...offerViewTimestamps,
        ...eventViewTimestamps,
      ];
      const bestPublishWindows = analyzeTimestamps(allViewTimestamps);
      
      // Combine all interaction timestamps for best interaction time
      const allInteractionTimestamps = [
        ...allProfileInteractionTimestamps,
        ...offerInteractionTimestamps,
        ...eventInteractionTimestamps,
      ];
      const bestInteractionWindows = analyzeTimestamps(allInteractionTimestamps);
      
      // Combine all visit timestamps for best visit time
      const allVisitTimestamps = [
        ...((profileVisitScans || []).map((s: any) => s.scanned_at)),
        ...offerVisitTimestamps,
        ...eventVisitTimestamps,
      ];
      const bestVisitWindows = analyzeTimestamps(allVisitTimestamps);

      const bestPublish = bestPublishWindows[0] || { dayIndex: 5, hours: '17:00–19:00' };
      const bestInteractions = bestInteractionWindows[0] || { dayIndex: 5, hours: '18:00–21:00' };
      const bestVisits = bestVisitWindows[0] || { dayIndex: 5, hours: '20:00–23:00' };

      // Return data with defaults for empty sections
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
