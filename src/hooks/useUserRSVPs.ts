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

    // Fetch upcoming RSVPs (events not ended)
    const { data: upcomingData, error: upcomingError } = await supabase
      .from('rsvps')
      .select(`
        id,
        status,
        notes,
        created_at,
        event:events!inner(
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
      .eq('user_id', userId)
      .gte('events.end_at', now)
      .order('events.start_at', { ascending: true });

    // Fetch past RSVPs (events ended)
    const { data: pastData, error: pastError } = await supabase
      .from('rsvps')
      .select(`
        id,
        status,
        notes,
        created_at,
        event:events!inner(
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
      .eq('user_id', userId)
      .lt('events.end_at', now)
      .order('events.end_at', { ascending: false });

    if (!upcomingError && upcomingData) {
      setUpcomingRsvps(upcomingData as any);
    }
    if (!pastError && pastData) {
      setPastRsvps(pastData as any);
    }
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
