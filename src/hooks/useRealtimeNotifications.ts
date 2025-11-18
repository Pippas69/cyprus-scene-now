import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

export const useRealtimeNotifications = (businessId: string | null, userId: string | null) => {
  const queryClient = useQueryClient();
  const notificationShownRef = useRef(new Set<string>());

  useEffect(() => {
    if (!businessId || !userId) return;

    // Subscribe to new reservations
    const reservationsChannel = supabase
      .channel('business-reservations-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations'
        },
        async (payload) => {
          // Check if this reservation is for this business's events
          const { data: event } = await supabase
            .from('events')
            .select('business_id')
            .eq('id', payload.new.event_id)
            .single();

          if (event?.business_id === businessId && !notificationShownRef.current.has(payload.new.id)) {
            notificationShownRef.current.add(payload.new.id);
            
            toast('New Reservation! 🎉', {
              description: `${payload.new.reservation_name} reserved for ${payload.new.party_size} people`,
            });

            queryClient.invalidateQueries({ queryKey: ['business-stats', businessId] });
          }
        }
      )
      .subscribe();

    // Subscribe to new RSVPs
    const rsvpsChannel = supabase
      .channel('business-rsvps-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rsvps'
        },
        async (payload) => {
          const { data: event } = await supabase
            .from('events')
            .select('business_id, title')
            .eq('id', payload.new.event_id)
            .single();

          if (event?.business_id === businessId && !notificationShownRef.current.has(payload.new.id)) {
            notificationShownRef.current.add(payload.new.id);
            
            const status = payload.new.status === 'going' ? 'will attend' : 'is interested in';
            toast(`New RSVP for ${event.title}! 👥`, {
              description: `Someone ${status} your event`,
            });

            queryClient.invalidateQueries({ queryKey: ['business-stats', businessId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(rsvpsChannel);
    };
  }, [businessId, userId, queryClient]);
};
