import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUnreadCount = () => {
  const query = useQuery({
    queryKey: ['unread-count'],
    queryFn: async (): Promise<number> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase.rpc('get_unread_message_count');

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return data || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to new messages for realtime badge updates
  useEffect(() => {
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query]);

  return query;
};
