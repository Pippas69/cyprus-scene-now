import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to realtime changes on tables that affect CRM guest data
 * (crm_guests, reservations, reservation_guests, tickets)
 * and automatically invalidates the CRM query cache for instant UI updates.
 */
export function useRealtimeCrm(businessId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!businessId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['crm-guests', businessId] });
    };

    // Debounce: coalesce rapid-fire changes into a single invalidation
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debouncedInvalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(invalidate, 300);
    };

    const channel = supabase
      .channel(`crm-realtime-${businessId}`)
      // crm_guests changes (new guest created, profile updated, merged)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_guests',
          filter: `business_id=eq.${businessId}`,
        },
        debouncedInvalidate
      )
      // Reservation changes (check-in, status change, spend update)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations',
        },
        async (payload) => {
          // Only invalidate if this reservation belongs to this business
          // Check direct business_id first, then event ownership
          if (payload.new.business_id === businessId) {
            debouncedInvalidate();
          } else if (payload.new.event_id) {
            const { data: event } = await supabase
              .from('events')
              .select('business_id')
              .eq('id', payload.new.event_id)
              .single();
            if (event?.business_id === businessId) {
              debouncedInvalidate();
            }
          }
        }
      )
      // Reservation guest changes (individual guest check-in)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_guests',
        },
        debouncedInvalidate
      )
      // Ticket status changes (used/checked-in)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
        },
        debouncedInvalidate
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);
}
