import { useQuery } from '@tanstack/react-query';
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
  return useQuery({
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
};
