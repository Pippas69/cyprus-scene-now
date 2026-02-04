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

type CheckinEvent = {
  user_id: string;
  created_at: string;
};

export const useCustomerMetrics = (businessId: string, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['customer-metrics', businessId, dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<CustomerMetrics> => {
      const startDate = dateRange?.from || startOfMonth(new Date());
      const endDate = dateRange?.to || endOfMonth(new Date());

      // =====================================================
      // Customers + Repeat Customers MUST be based on verified QR check-ins
      // (reservations, tickets, offer redemptions, student discounts)
      // =====================================================

      // Get business events for ticket/reservation filtering
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('business_id', businessId);
      const eventIds = events?.map(e => e.id) || [];

      const checkinEvents: CheckinEvent[] = [];

      // A) Offer check-ins = offer purchases that were redeemed at venue (QR verified)
      const { data: offerCheckins } = await supabase
        .from('offer_purchases')
        .select('user_id, redeemed_at')
        .eq('business_id', businessId)
        .not('redeemed_at', 'is', null)
        .gte('redeemed_at', startDate.toISOString())
        .lte('redeemed_at', endDate.toISOString());

      (offerCheckins || []).forEach((o: any) => {
        if (o?.user_id && o?.redeemed_at) {
          checkinEvents.push({ user_id: o.user_id, created_at: o.redeemed_at });
        }
      });

      // B) Ticket check-ins
      if (eventIds.length > 0) {
        const { data: ticketCheckins } = await supabase
          .from('tickets')
          .select('user_id, checked_in_at')
          .in('event_id', eventIds)
          .not('checked_in_at', 'is', null)
          .gte('checked_in_at', startDate.toISOString())
          .lte('checked_in_at', endDate.toISOString());

        (ticketCheckins || []).forEach((t: any) => {
          if (t?.user_id && t?.checked_in_at) {
            checkinEvents.push({ user_id: t.user_id, created_at: t.checked_in_at });
          }
        });
      }

      // C) Reservation check-ins (direct + event)
      const { data: directReservationCheckins } = await supabase
        .from('reservations')
        .select('user_id, checked_in_at')
        .eq('business_id', businessId)
        .is('event_id', null)
        .not('checked_in_at', 'is', null)
        .gte('checked_in_at', startDate.toISOString())
        .lte('checked_in_at', endDate.toISOString());

      (directReservationCheckins || []).forEach((r: any) => {
        if (r?.user_id && r?.checked_in_at) {
          checkinEvents.push({ user_id: r.user_id, created_at: r.checked_in_at });
        }
      });

      if (eventIds.length > 0) {
        const { data: eventReservationCheckins } = await supabase
          .from('reservations')
          .select('user_id, checked_in_at')
          .in('event_id', eventIds)
          .not('checked_in_at', 'is', null)
          .gte('checked_in_at', startDate.toISOString())
          .lte('checked_in_at', endDate.toISOString());

        (eventReservationCheckins || []).forEach((r: any) => {
          if (r?.user_id && r?.checked_in_at) {
            checkinEvents.push({ user_id: r.user_id, created_at: r.checked_in_at });
          }
        });
      }

      // D) Student discount check-ins (student QR)
      // NOTE: scanned_by is the staff user who scans (NOT the student), so we always resolve via student_verifications.
      const { data: studentDiscountData } = await supabase
        .from('student_discount_redemptions')
        .select('student_verification_id, created_at')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const verificationIds: string[] = (studentDiscountData || [])
        .map((s: any) => s?.student_verification_id)
        .filter(Boolean);

      if (verificationIds.length > 0) {
        const uniqueVerificationIds = Array.from(new Set(verificationIds));
        const { data: verifications } = await supabase
          .from('student_verifications')
          .select('id, user_id')
          .in('id', uniqueVerificationIds);

        const mapByVerificationId = new Map<string, string>();
        (verifications || []).forEach((v: any) => {
          if (v?.id && v?.user_id) mapByVerificationId.set(v.id, v.user_id);
        });

        // Preserve multiplicity: one event per redemption
        (studentDiscountData || []).forEach((s: any) => {
          if (!s?.created_at) return;
          const userId = mapByVerificationId.get(s?.student_verification_id);
          if (userId) checkinEvents.push({ user_id: userId, created_at: s.created_at });
        });
      }

      // Calculate unique customers from verified check-ins
      const uniqueCustomers = new Set(checkinEvents.map(e => e.user_id));
      const totalCustomers = uniqueCustomers.size;

      // Repeat customers (2+ check-ins total across ALL sources)
      const checkinCountByUser: Record<string, number> = {};
      checkinEvents.forEach(e => {
        checkinCountByUser[e.user_id] = (checkinCountByUser[e.user_id] || 0) + 1;
      });
      const repeatCustomers = Object.values(checkinCountByUser).filter(count => count >= 2).length;
      const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

      // =====================================================
      // Average spend still based on purchases (not check-ins)
      // but divided by unique verified customers to stay consistent
      // =====================================================
      const { data: ticketOrders } = await supabase
        .from('ticket_orders')
        .select('total_cents')
        .eq('business_id', businessId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { data: offerPurchases } = await supabase
        .from('offer_purchases')
        .select('final_price_cents')
        .eq('business_id', businessId)
        .eq('status', 'paid')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const totalRevenueCents =
        (ticketOrders || []).reduce((sum: number, o: any) => sum + (o?.total_cents || 0), 0) +
        (offerPurchases || []).reduce((sum: number, p: any) => sum + (p?.final_price_cents || 0), 0);
      const averageSpend = totalCustomers > 0 ? totalRevenueCents / totalCustomers / 100 : 0;

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

      checkinEvents.forEach(e => {
        if (e.created_at) {
          const date = new Date(e.created_at);
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
