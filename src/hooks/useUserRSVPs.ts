import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
    business: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null;
  };
}

export const useUserRSVPs = (userId: string | null) => {
  const [upcomingRsvps, setUpcomingRsvps] = useState<RSVPWithEvent[]>([]);
  const [pastRsvps, setPastRsvps] = useState<RSVPWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchRSVPs();
      subscribeToRSVPs();
    } else {
      setUpcomingRsvps([]);
      setPastRsvps([]);
      setLoading(false);
    }
  }, [userId]);

  const fetchRSVPs = async () => {
    if (!userId) return;

    setLoading(true);
    const now = new Date().toISOString();

    // Fetch all RSVPs for the user with event data
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
          business:businesses(id, name, logo_url)
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching RSVPs:', error);
      setLoading(false);
      return;
    }

    // Filter on the client side since Supabase JS doesn't support filtering on nested relations well
    const validRsvps = (allData || []).filter(r => r.event !== null);
    
    const upcoming = validRsvps.filter(r => new Date(r.event.end_at) >= new Date(now));
    const past = validRsvps.filter(r => new Date(r.event.end_at) < new Date(now));

    // Sort upcoming by start_at ascending
    upcoming.sort((a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime());
    
    // Sort past by end_at descending
    past.sort((a, b) => new Date(b.event.end_at).getTime() - new Date(a.event.end_at).getTime());

    setUpcomingRsvps(upcoming as any);
    setPastRsvps(past as any);
    setLoading(false);
  };

  const subscribeToRSVPs = () => {
    if (!userId) return;

    const channel = supabase
      .channel('user-rsvps')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvps',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchRSVPs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

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
    refetch: fetchRSVPs 
  };
};
