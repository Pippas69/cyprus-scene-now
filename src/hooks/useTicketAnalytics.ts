import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { format, eachDayOfInterval, subDays } from "date-fns";

interface TicketAnalyticsData {
  totalRevenue: number;
  totalCommission: number;
  netRevenue: number;
  ticketsSold: number;
  totalTickets: number;
  checkedIn: number;
  checkInRate: number;
  avgTicketPrice: number;
  eventBreakdown: Array<{
    eventId: string;
    eventTitle: string;
    revenue: number;
    ticketsSold: number;
    checkedIn: number;
  }>;
  tierBreakdown: Array<{
    tierName: string;
    revenue: number;
    sold: number;
    total: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    tickets: number;
  }>;
}

export function useTicketAnalytics(businessId: string, dateRange?: DateRange) {
  return useQuery({
    queryKey: ["ticket-analytics", businessId, dateRange?.from, dateRange?.to],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    queryFn: async (): Promise<TicketAnalyticsData> => {
      const startDate = dateRange?.from || subDays(new Date(), 30);
      const endDate = dateRange?.to || new Date();

      // Get all events for this business
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, title")
        .eq("business_id", businessId);

      if (eventsError) throw eventsError;
      if (!events || events.length === 0) {
        return getEmptyData(startDate, endDate);
      }

      const eventIds = events.map((e) => e.id);

      // Fetch ticket orders within date range
      const { data: orders, error: ordersError } = await supabase
        .from("ticket_orders")
        .select("*")
        .in("event_id", eventIds)
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (ordersError) throw ordersError;

      // Fetch all ticket tiers for these events
      const { data: tiers, error: tiersError } = await supabase
        .from("ticket_tiers")
        .select("*")
        .in("event_id", eventIds);

      if (tiersError) throw tiersError;

      // Fetch tickets for check-in data
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("id, status, tier_id, event_id, checked_in_at, order_id, created_at")
        .in("event_id", eventIds);

      if (ticketsError) throw ticketsError;

      // Calculate totals
      const totalRevenue = orders?.reduce((sum, o) => sum + o.subtotal_cents, 0) || 0;
      const totalCommission = orders?.reduce((sum, o) => sum + o.commission_cents, 0) || 0;
      const netRevenue = totalRevenue - totalCommission;
      const ticketsSold = tiers?.reduce((sum, t) => sum + t.quantity_sold, 0) || 0;
      const totalTickets = tiers?.reduce((sum, t) => sum + t.quantity_total, 0) || 0;
      const checkedIn = tickets?.filter((t) => t.status === "used").length || 0;
      const checkInRate = ticketsSold > 0 ? (checkedIn / ticketsSold) * 100 : 0;
      const avgTicketPrice = ticketsSold > 0 ? totalRevenue / ticketsSold : 0;

      // Event breakdown
      const eventBreakdown = events.map((event) => {
        const eventOrders = orders?.filter((o) => o.event_id === event.id) || [];
        const eventTickets = tickets?.filter((t) => t.event_id === event.id) || [];
        const eventTiers = tiers?.filter((t) => t.event_id === event.id) || [];

        return {
          eventId: event.id,
          eventTitle: event.title,
          revenue: eventOrders.reduce((sum, o) => sum + o.subtotal_cents, 0),
          ticketsSold: eventTiers.reduce((sum, t) => sum + t.quantity_sold, 0),
          checkedIn: eventTickets.filter((t) => t.status === "used").length,
        };
      }).filter((e) => e.ticketsSold > 0 || e.revenue > 0);

      // Tier breakdown (aggregate across all events)
      const tierMap = new Map<string, { revenue: number; sold: number; total: number }>();
      tiers?.forEach((tier) => {
        const existing = tierMap.get(tier.name) || { revenue: 0, sold: 0, total: 0 };
        existing.revenue += tier.price_cents * tier.quantity_sold;
        existing.sold += tier.quantity_sold;
        existing.total += tier.quantity_total;
        tierMap.set(tier.name, existing);
      });

      const tierBreakdown = Array.from(tierMap.entries()).map(([tierName, data]) => ({
        tierName,
        ...data,
      }));

      // Daily revenue
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyRevenue = days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayOrders = orders?.filter(
          (o) => format(new Date(o.created_at), "yyyy-MM-dd") === dayStr
        ) || [];
        const dayTickets = tickets?.filter(
          (t) => {
            const order = orders?.find((o) => o.id === t.order_id);
            return order && format(new Date(order.created_at), "yyyy-MM-dd") === dayStr;
          }
        ) || [];

        return {
          date: dayStr,
          revenue: dayOrders.reduce((sum, o) => sum + o.subtotal_cents, 0),
          tickets: dayTickets.length,
        };
      });

      return {
        totalRevenue,
        totalCommission,
        netRevenue,
        ticketsSold,
        totalTickets,
        checkedIn,
        checkInRate,
        avgTicketPrice,
        eventBreakdown,
        tierBreakdown,
        dailyRevenue,
      };
    },
    enabled: !!businessId,
  });
}

function getEmptyData(startDate: Date, endDate: Date): TicketAnalyticsData {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return {
    totalRevenue: 0,
    totalCommission: 0,
    netRevenue: 0,
    ticketsSold: 0,
    totalTickets: 0,
    checkedIn: 0,
    checkInRate: 0,
    avgTicketPrice: 0,
    eventBreakdown: [],
    tierBreakdown: [],
    dailyRevenue: days.map((day) => ({
      date: format(day, "yyyy-MM-dd"),
      revenue: 0,
      tickets: 0,
    })),
  };
}
