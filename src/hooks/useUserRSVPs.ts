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
  const [rsvps, setRsvps] = useState<RSVPWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchRSVPs();
      subscribeToRSVPs();
    } else {
      setRsvps([]);
      setLoading(false);
    }
  }, [userId]);

  const fetchRSVPs = async () => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRsvps(data as any);
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

  const interested = rsvps.filter(r => r.status === 'interested');
  const going = rsvps.filter(r => r.status === 'going');

  return { rsvps, interested, going, loading, refetch: fetchRSVPs };
};
