import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to realtime changes that affect business event metrics
 * (tickets, reservations, scans, ticket orders, rsvps) and invalidates
 * the relevant React Query caches so dashboards update instantly.
 *
 * - businessId: required, scopes the subscription channel
 * - eventId: optional, when provided we still listen broadly but invalidations
 *   stay cheap because we debounce.
 *
 * Zero behavior change: only triggers cache invalidations.
 */
export function useRealtimeEventCheckins(
  businessId: string | null | undefined,
  eventId?: string | null,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!businessId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const eventCache = new Map<string, string>(); // event_id -> business_id

    const invalidateAll = () => {
      // Invalidate every query key that any of the 4 dashboards rely on.
      // React Query will only refetch active queries, so this is cheap.
      const keys = [
        'business-stats',
        'business-events',
        'ticket-sales',
        'event-checkins',
        'combined-overview',
        'event-reservation-overview',
        'events-with-tickets',
        'event-tickets',
        'event-reservations',
        'business-dashboard',
        'business-overview',
        'ticket-overview',
        'reservation-overview',
      ];
      keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      }
    };

    const debouncedInvalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(invalidateAll, 300);
    };

    // Resolve business ownership of an event id (with tiny in-memory cache)
    const eventBelongsToBusiness = async (evId?: string | null) => {
      if (!evId) return false;
      const cached = eventCache.get(evId);
      if (cached !== undefined) return cached === businessId;
      const { data } = await supabase
        .from('events')
        .select('business_id')
        .eq('id', evId)
        .maybeSingle();
      const owner = data?.business_id ?? '';
      eventCache.set(evId, owner);
      return owner === businessId;
    };

    const handleEventScopedChange = async (payload: any) => {
      const evId = payload.new?.event_id ?? payload.old?.event_id;
      if (await eventBelongsToBusiness(evId)) debouncedInvalidate();
    };

    const handleReservationChange = async (payload: any) => {
      if (payload.new?.business_id === businessId || payload.old?.business_id === businessId) {
        debouncedInvalidate();
        return;
      }
      const evId = payload.new?.event_id ?? payload.old?.event_id;
      if (await eventBelongsToBusiness(evId)) debouncedInvalidate();
    };

    const channel = supabase
      .channel(`realtime-event-checkins-${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        handleEventScopedChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_orders' },
        handleEventScopedChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rsvps' },
        handleEventScopedChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        handleReservationChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservation_scans' },
        debouncedInvalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservation_guests' },
        debouncedInvalidate,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [businessId, eventId, queryClient]);
}
