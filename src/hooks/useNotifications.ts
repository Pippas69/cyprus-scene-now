import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  event_type: string | null;
  deep_link: string | null;
  delivered_at: string | null;
  created_at: string;
}

type NotificationContext = 'user' | 'business';

export const useNotifications = (userId: string | undefined, context?: NotificationContext) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchNotifications();
    subscribeToNotifications();

    return () => {
      supabase.channel(`notifications-${context || 'all'}`).unsubscribe();
    };
  }, [userId, context]);

  const fetchNotifications = async () => {
    if (!userId) return;

    setLoading(true);
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Filter by context
    if (context === 'business') {
      query = query.eq('type', 'business');
    } else if (context === 'user') {
      query = query.neq('type', 'business');
    }
    // If no context provided, return all (backward compatible)

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } else {
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    }
    setLoading(false);
  };

  const subscribeToNotifications = () => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${context || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Filter by context if specified
          if (context === 'business' && newNotification.type !== 'business') return;
          if (context === 'user' && newNotification.type === 'business') return;
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
          });
        }
      )
      .subscribe();
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    // Optimistic UI update: remove the badge immediately, then sync to backend.
    const prevNotifications = notifications;
    const prevUnread = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      // Rollback if backend update fails
      setNotifications(prevNotifications);
      setUnreadCount(prevUnread);
      return;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
};
