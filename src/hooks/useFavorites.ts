import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFavorites = (userId: string | null) => {
  const [favoriteEventIds, setFavoriteEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchFavorites();
      subscribeToFavorites();
    } else {
      setFavoriteEventIds(new Set());
    }
  }, [userId]);

  const fetchFavorites = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('favorites')
      .select('event_id')
      .eq('user_id', userId);

    if (!error && data) {
      setFavoriteEventIds(new Set(data.map(f => f.event_id)));
    }
  };

  const subscribeToFavorites = () => {
    if (!userId) return;

    const channel = supabase
      .channel('user-favorites')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleFavorite = async (eventId: string) => {
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please login to save events",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const isFavorited = favoriteEventIds.has(eventId);

    if (isFavorited) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove from favorites",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Removed",
          description: "Event removed from favorites",
        });
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, event_id: eventId });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save event",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Saved!",
          description: "Event saved to favorites",
        });
      }
    }

    setLoading(false);
  };

  const isFavorited = (eventId: string) => favoriteEventIds.has(eventId);

  return { favoriteEventIds, toggleFavorite, isFavorited, loading };
};
