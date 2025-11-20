import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EventAttendee {
  user_id: string;
  status: 'interested' | 'going';
  name: string | null;
  avatar_url: string | null;
  city: string | null;
  town: string | null;
}

export const useEventRSVPs = (eventId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['event-rsvps', eventId],
    queryFn: async () => {
      if (!eventId) return { interested: [], going: [] };
      
      // Fetch RSVPs with profile data, filtering by profile_visibility
      const { data, error } = await supabase
        .from('rsvps')
        .select(`
          user_id,
          status,
          profiles!inner(
            name,
            avatar_url,
            city,
            town
          ),
          user_preferences!inner(profile_visibility)
        `)
        .eq('event_id', eventId)
        .eq('user_preferences.profile_visibility', 'public');

      if (error) throw error;

      const attendees: EventAttendee[] = (data || []).map((rsvp: any) => ({
        user_id: rsvp.user_id,
        status: rsvp.status,
        name: rsvp.profiles.name,
        avatar_url: rsvp.profiles.avatar_url,
        city: rsvp.profiles.city,
        town: rsvp.profiles.town,
      }));

      return {
        interested: attendees.filter(a => a.status === 'interested'),
        going: attendees.filter(a => a.status === 'going'),
      };
    },
    enabled: !!eventId,
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-rsvps-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvps',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Invalidate and refetch the query when RSVPs change
          queryClient.invalidateQueries({ queryKey: ['event-rsvps', eventId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  return query;
};
