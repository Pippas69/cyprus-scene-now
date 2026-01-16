import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OverviewMetrics {
  profileViews: number;
  customersThruFomo: number;
  repeatCustomers: number;
  bookings: number;
  tickets: number;
  visitsViaQR: number;
}

export const useOverviewMetrics = (businessId: string, dateRange?: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ["overview-metrics", businessId, dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<OverviewMetrics> => {
      const startDate = dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = dateRange?.to || new Date();

      // Get business events for filtering
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .eq("business_id", businessId);
      
      const eventIds = events?.map(e => e.id) || [];

      // 1. Profile Views
      const { count: profileViews } = await supabase
        .from("engagement_events")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("event_type", "profile_view")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // 2. Customers through FOMO (unique users from reservations + ticket orders)
      // Note: reservations can be linked via event_id OR direct business_id
      const { data: reservationUsers } = await supabase
        .from("reservations")
        .select("user_id")
        .or(`business_id.eq.${businessId}${eventIds.length > 0 ? `,event_id.in.(${eventIds.join(',')})` : ''}`)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data: ticketUsers } = await supabase
        .from("ticket_orders")
        .select("user_id")
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const allUserIds = new Set([
        ...(reservationUsers?.map(r => r.user_id) || []),
        ...(ticketUsers?.map(t => t.user_id) || [])
      ].filter(Boolean));
      
      const customersThruFomo = allUserIds.size;

      // 3. Repeat Customers (users with 2+ transactions)
      const userCounts: Record<string, number> = {};
      reservationUsers?.forEach(r => {
        if (r.user_id) userCounts[r.user_id] = (userCounts[r.user_id] || 0) + 1;
      });
      ticketUsers?.forEach(t => {
        if (t.user_id) userCounts[t.user_id] = (userCounts[t.user_id] || 0) + 1;
      });
      const repeatCustomers = Object.values(userCounts).filter(c => c >= 2).length;

      // 4. Bookings (accepted reservations) - both event-linked and direct
      const { count: bookings } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .or(`business_id.eq.${businessId}${eventIds.length > 0 ? `,event_id.in.(${eventIds.join(',')})` : ''}`)
        .eq("status", "accepted")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // 5. Tickets issued
      const { count: tickets } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // 6. Visits via QR (reservation scans + ticket check-ins)
      // Type assertion to avoid TS2589 deep instantiation error
      const { count: reservationScans } = await (supabase
        .from("reservation_scans") as any)
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("scanned_at", startDate.toISOString())
        .lte("scanned_at", endDate.toISOString());

      let ticketCheckIns = 0;
      if (eventIds.length > 0) {
        const { data: checkedInTickets } = await supabase
          .from("tickets")
          .select("id")
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
        ticketCheckIns = checkedInTickets?.length || 0;
      }

      return {
        profileViews: profileViews || 0,
        customersThruFomo,
        repeatCustomers,
        bookings: bookings || 0,
        tickets: tickets || 0,
        visitsViaQR: (reservationScans || 0) + (ticketCheckIns || 0),
      };
    },
    enabled: !!businessId,
  });
};
