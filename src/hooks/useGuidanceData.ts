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
      // Get engagement events with timestamps for the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: engagementEvents } = await supabase
        .from("engagement_events")
        .select("event_type, created_at, entity_type")
        .eq("business_id", businessId)
        .gte("created_at", thirtyDaysAgo);

      // Analyze by day and hour
      const analyzeByTime = (events: typeof engagementEvents, eventTypes: string[]) => {
        const hourCounts: Record<string, Record<number, number>> = {};
        
        events?.filter(e => eventTypes.includes(e.event_type)).forEach(event => {
          const date = new Date(event.created_at);
          const day = date.getDay();
          const hour = date.getHours();
          const key = `${day}-${Math.floor(hour / 2) * 2}`; // Group by 2-hour slots
          
          if (!hourCounts[day]) hourCounts[day] = {};
          hourCounts[day][Math.floor(hour / 2) * 2] = (hourCounts[day][Math.floor(hour / 2) * 2] || 0) + 1;
        });

        // Find top 2 time windows
        const windows: { day: number; hour: number; count: number }[] = [];
        Object.entries(hourCounts).forEach(([day, hours]) => {
          Object.entries(hours).forEach(([hour, count]) => {
            windows.push({ day: parseInt(day), hour: parseInt(hour), count });
          });
        });

        windows.sort((a, b) => b.count - a.count);
        const top2 = windows.slice(0, 2);

        if (top2.length === 0) {
          // Default to Friday/Saturday evenings
          return [
            { dayIndex: 5, hours: '18:00–20:00', count: 0 },
            { dayIndex: 6, hours: '19:00–21:00', count: 0 },
          ];
        }

        return top2.map(w => ({
          dayIndex: w.day,
          hours: formatHourRange(w.hour),
          count: w.count,
        }));
      };

      // Profile analysis
      const profileViews = analyzeByTime(engagementEvents, ['profile_view']);
      const profileInteractions = analyzeByTime(engagementEvents, ['follow', 'save', 'share']);
      const profileVisits = analyzeByTime(engagementEvents, ['check_in']);

      // Offer analysis
      const offerViews = analyzeByTime(
        engagementEvents?.filter(e => e.entity_type === 'offer'),
        ['view']
      );
      const offerInteractions = analyzeByTime(engagementEvents, ['offer_save', 'offer_interest']);
      const offerVisits = analyzeByTime(engagementEvents, ['offer_redeem', 'scan']);

      // Event analysis
      const eventViews = analyzeByTime(
        engagementEvents?.filter(e => e.entity_type === 'event'),
        ['view']
      );
      const eventInteractions = analyzeByTime(engagementEvents, ['rsvp_going', 'rsvp_interested', 'event_save']);
      const eventVisits = analyzeByTime(engagementEvents, ['event_check_in', 'ticket_validated']);

      // Generate recommended plan based on best performing times
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
