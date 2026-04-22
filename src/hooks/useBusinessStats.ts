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

      const { data: reservationRows } = eventIds.length > 0
        ? await supabase
            .from('reservations')
            .select('id, status, party_size, auto_created_from_tickets, seating_type_id, is_comp, parent_reservation_id')
            .in('event_id', eventIds)
        : { data: [] as any[] };

      const countedReservations = (reservationRows || []).filter((reservation: any) => {
        const isEligibleReservation = reservation.auto_created_from_tickets == null || reservation.auto_created_from_tickets === false || reservation.seating_type_id != null;
        const isCompGuest = reservation.is_comp === true || Boolean(reservation.parent_reservation_id);
        return isEligibleReservation && !isCompGuest;
      });

      // Count by party_size so comp guests added to a parent reservation are reflected in the totals
      const totalReservations = countedReservations.reduce((sum: number, r: any) => sum + (Number(r.party_size) || 1), 0);
      const pendingReservations = countedReservations
        .filter((reservation: any) => reservation.status === 'pending')
        .reduce((sum: number, r: any) => sum + (Number(r.party_size) || 1), 0);

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
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
};
