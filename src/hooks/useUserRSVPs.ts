import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchCurrentlyBoostedEventIds } from '@/lib/boostUtils';

interface RSVPWithEvent {
  id: string;
  status: 'interested' | 'going';
  notes: string | null;
  created_at: string;
  event: {
    id: string;
    title: string;
    start_at: string;
    end_at: string;
    location: string;
    category: string[];
    price_tier: string | null;
    cover_image_url: string | null;
    business_id?: string;
    business: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null;
  };
}

export const useUserRSVPs = (userId: string | null) => {
  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['user-rsvps', userId],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { upcoming: [], past: [] };

      const now = new Date().toISOString();

      // Fetch all RSVPs with event data
      const { data: allData, error } = await supabase
        .from('rsvps')
        .select(`
          id,
          status,
          notes,
          created_at,
          event:events(
            id,
            title,
            start_at,
            end_at,
            location,
            category,
            price_tier,
            cover_image_url,
            business_id,
            event_type,
            accepts_reservations,
            external_ticket_url,
            business:businesses(id, name, logo_url, city)
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching RSVPs:', error);
        return { upcoming: [], past: [] };
      }

      const validRsvps = (allData || []).filter(r => r.event !== null);
      const eventIds = Array.from(new Set(validRsvps.map((r: any) => r.event.id)));

      // Fetch counts and boosts IN PARALLEL
      if (eventIds.length > 0) {
        const [countsResult, boostedEventIds] = await Promise.all([
          supabase.rpc("get_event_rsvp_counts_bulk", { p_event_ids: eventIds }),
          fetchCurrentlyBoostedEventIds(eventIds),
        ]);

        if (!countsResult.error && countsResult.data) {
          const countsMap = new Map<string, { interested: number; going: number }>();
          countsResult.data.forEach((row: any) => {
            countsMap.set(row.event_id, {
              interested: Number(row.interested_count || 0),
              going: Number(row.going_count || 0),
            });
          });
          validRsvps.forEach((r: any) => {
            const c = countsMap.get(r.event.id) || { interested: 0, going: 0 };
            r.event.interested_count = c.interested;
            r.event.going_count = c.going;
          });
        }

        validRsvps.forEach((r: any) => {
          r.event.isBoosted = boostedEventIds.has(r.event.id);
        });
      }

      const upcoming = validRsvps.filter(r => new Date(r.event.end_at) >= new Date(now));
      const past = validRsvps.filter(r => new Date(r.event.end_at) < new Date(now));

      upcoming.sort((a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime());
      past.sort((a, b) => new Date(b.event.end_at).getTime() - new Date(a.event.end_at).getTime());

      return { upcoming, past };
    },
  });

  const upcomingRsvps = (data?.upcoming || []) as RSVPWithEvent[];
  const pastRsvps = (data?.past || []) as RSVPWithEvent[];

  const interested = upcomingRsvps.filter(r => r.status === 'interested');
  const going = upcomingRsvps.filter(r => r.status === 'going');
  const pastInterested = pastRsvps.filter(r => r.status === 'interested');
  const pastGoing = pastRsvps.filter(r => r.status === 'going');

  return {
    interested,
    going,
    pastInterested,
    pastGoing,
    loading,
    refetch,
  };
};
