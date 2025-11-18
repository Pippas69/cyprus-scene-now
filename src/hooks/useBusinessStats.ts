import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BusinessStats {
  totalEvents: number;
  activeOffers: number;
  totalReservations: number;
  pendingReservations: number;
  totalRSVPs: number;
  followers: number;
  upcomingEvents: number;
}

export const useBusinessStats = (businessId: string | null) => {
  return useQuery({
    queryKey: ['business-stats', businessId],
    queryFn: async (): Promise<BusinessStats> => {
      if (!businessId) throw new Error('No business ID');

      // Get total events
      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);

      // Get upcoming events
      const { count: upcomingEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('start_at', new Date().toISOString());

      // Get active offers
      const { count: activeOffers } = await supabase
        .from('discounts')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('active', true)
        .lte('start_at', new Date().toISOString())
        .gte('end_at', new Date().toISOString());

      // Get total reservations
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('business_id', businessId);

      const eventIds = events?.map(e => e.id) || [];

      const { count: totalReservations } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .in('event_id', eventIds);

      const { count: pendingReservations } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .in('event_id', eventIds)
        .eq('status', 'pending');

      // Get total RSVPs
      const { count: totalRSVPs } = await supabase
        .from('rsvps')
        .select('*', { count: 'exact', head: true })
        .in('event_id', eventIds);

      // Get followers
      const { count: followers } = await supabase
        .from('business_followers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);

      return {
        totalEvents: totalEvents || 0,
        activeOffers: activeOffers || 0,
        totalReservations: totalReservations || 0,
        pendingReservations: pendingReservations || 0,
        totalRSVPs: totalRSVPs || 0,
        followers: followers || 0,
        upcomingEvents: upcomingEvents || 0
      };
    },
    enabled: !!businessId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
};
