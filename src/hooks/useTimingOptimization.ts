import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TimingInsight {
  type: "reservation" | "ticket" | "event" | "engagement";
  bestDay: string;
  bestHour: number;
  peakPeriod: string;
}

export interface TimingOptimizationData {
  reservations: TimingInsight | null;
  tickets: TimingInsight | null;
  eventPosting: TimingInsight | null;
  peakEngagement: { hour: number; period: string } | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_EL = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];

const getHourPeriod = (hour: number): string => {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

const findPeak = (data: Array<{ day: number; hour: number }>): { bestDay: number; bestHour: number } | null => {
  if (!data || data.length === 0) return null;

  const dayCounts: Record<number, number> = {};
  const hourCounts: Record<number, number> = {};

  data.forEach(({ day, hour }) => {
    dayCounts[day] = (dayCounts[day] || 0) + 1;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const bestDay = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0];
  const bestHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];

  if (!bestDay || !bestHour) return null;

  return {
    bestDay: parseInt(bestDay[0]),
    bestHour: parseInt(bestHour[0]),
  };
};

export const useTimingOptimization = (businessId: string) => {
  return useQuery({
    queryKey: ["timing-optimization", businessId],
    queryFn: async (): Promise<TimingOptimizationData> => {
      // Get events for this business
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .eq("business_id", businessId);
      const eventIds = events?.map(e => e.id) || [];

      // Reservation timing
      const { data: reservations } = await supabase
        .from("reservations")
        .select("created_at")
        .in("event_id", eventIds);

      const reservationTimes = reservations?.map(r => {
        const d = new Date(r.created_at);
        return { day: d.getDay(), hour: d.getHours() };
      }) || [];

      const reservationPeak = findPeak(reservationTimes);
      const reservationInsight: TimingInsight | null = reservationPeak ? {
        type: "reservation",
        bestDay: DAYS[reservationPeak.bestDay],
        bestHour: reservationPeak.bestHour,
        peakPeriod: getHourPeriod(reservationPeak.bestHour),
      } : null;

      // Ticket timing
      const { data: ticketOrders } = await supabase
        .from("ticket_orders")
        .select("created_at")
        .eq("business_id", businessId);

      const ticketTimes = ticketOrders?.map(t => {
        const d = new Date(t.created_at);
        return { day: d.getDay(), hour: d.getHours() };
      }) || [];

      const ticketPeak = findPeak(ticketTimes);
      const ticketInsight: TimingInsight | null = ticketPeak ? {
        type: "ticket",
        bestDay: DAYS[ticketPeak.bestDay],
        bestHour: ticketPeak.bestHour,
        peakPeriod: getHourPeriod(ticketPeak.bestHour),
      } : null;

      // Event posting (when events get most views)
      const { data: eventViews } = await supabase
        .from("event_views")
        .select("created_at")
        .in("event_id", eventIds);

      const eventViewTimes = eventViews?.map(ev => {
        const d = new Date(ev.created_at);
        return { day: d.getDay(), hour: d.getHours() };
      }) || [];

      const eventPeak = findPeak(eventViewTimes);
      const eventInsight: TimingInsight | null = eventPeak ? {
        type: "event",
        bestDay: DAYS[eventPeak.bestDay],
        bestHour: eventPeak.bestHour,
        peakPeriod: getHourPeriod(eventPeak.bestHour),
      } : null;

      // Peak engagement
      const { data: engagement } = await supabase
        .from("engagement_events")
        .select("created_at")
        .eq("business_id", businessId);

      const engagementTimes = engagement?.map(e => {
        const d = new Date(e.created_at);
        return { day: d.getDay(), hour: d.getHours() };
      }) || [];

      const engagementPeak = findPeak(engagementTimes);
      const peakEngagement = engagementPeak ? {
        hour: engagementPeak.bestHour,
        period: getHourPeriod(engagementPeak.bestHour),
      } : null;

      return {
        reservations: reservationInsight,
        tickets: ticketInsight,
        eventPosting: eventInsight,
        peakEngagement,
      };
    },
    enabled: !!businessId,
  });
};

export { DAYS, DAYS_EL };
