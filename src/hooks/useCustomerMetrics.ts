import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface CustomerMetrics {
  totalCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  averageSpend: number;
  cityBreakdown: Array<{ city: string; count: number }>;
  busiestDay: string | null;
  peakTime: string | null;
}

export const useCustomerMetrics = (businessId: string, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['customer-metrics', businessId, dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<CustomerMetrics> => {
      const startDate = dateRange?.from || startOfMonth(new Date());
      const endDate = dateRange?.to || endOfMonth(new Date());

      // Get ticket orders for this business
      const { data: ticketOrders } = await supabase
        .from('ticket_orders')
        .select('user_id, total_cents, created_at')
        .eq('business_id', businessId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get offer purchases for this business
      const { data: offerPurchases } = await supabase
        .from('offer_purchases')
        .select('user_id, final_price_cents, created_at')
        .eq('business_id', businessId)
        .eq('status', 'paid')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Combine all purchases
      const allPurchases = [
        ...(ticketOrders || []).map(o => ({
          user_id: o.user_id,
          amount: o.total_cents,
          created_at: o.created_at,
        })),
        ...(offerPurchases || []).map(p => ({
          user_id: p.user_id,
          amount: p.final_price_cents,
          created_at: p.created_at,
        })),
      ];

      // Calculate unique customers
      const uniqueCustomers = new Set(allPurchases.map(p => p.user_id));
      const totalCustomers = uniqueCustomers.size;

      // Calculate repeat customers (2+ purchases)
      const purchaseCountByUser: Record<string, number> = {};
      allPurchases.forEach(p => {
        purchaseCountByUser[p.user_id] = (purchaseCountByUser[p.user_id] || 0) + 1;
      });
      const repeatCustomers = Object.values(purchaseCountByUser).filter(count => count >= 2).length;
      const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

      // Calculate average spend
      const totalRevenue = allPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
      const averageSpend = totalCustomers > 0 ? totalRevenue / totalCustomers / 100 : 0;

      // Get city breakdown from profiles
      const userIds = Array.from(uniqueCustomers);
      let cityBreakdown: Array<{ city: string; count: number }> = [];

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('city')
          .in('id', userIds);

        if (profiles) {
          const cityCounts: Record<string, number> = {};
          profiles.forEach(p => {
            const city = p.city || 'Unknown';
            cityCounts[city] = (cityCounts[city] || 0) + 1;
          });

          cityBreakdown = Object.entries(cityCounts)
            .map(([city, count]) => ({ city, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        }
      }

      // Calculate busiest day and peak time
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayCounts: Record<number, number> = {};
      const hourCounts: Record<number, number> = {};

      allPurchases.forEach(p => {
        if (p.created_at) {
          const date = new Date(p.created_at);
          const day = date.getDay();
          const hour = date.getHours();
          dayCounts[day] = (dayCounts[day] || 0) + 1;
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });

      let busiestDay: string | null = null;
      let maxDayCount = 0;
      Object.entries(dayCounts).forEach(([day, count]) => {
        if (count > maxDayCount) {
          maxDayCount = count;
          busiestDay = dayNames[parseInt(day)];
        }
      });

      let peakTime: string | null = null;
      let maxHourCount = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > maxHourCount) {
          maxHourCount = count;
          const h = parseInt(hour);
          const nextH = (h + 3) % 24;
          peakTime = `${h.toString().padStart(2, '0')}:00 - ${nextH.toString().padStart(2, '0')}:00`;
        }
      });

      return {
        totalCustomers,
        repeatCustomers,
        repeatRate,
        averageSpend,
        cityBreakdown,
        busiestDay,
        peakTime,
      };
    },
    enabled: !!businessId,
  });
};
