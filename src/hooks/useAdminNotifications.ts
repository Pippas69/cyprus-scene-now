import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AdminNotification {
  id: string;
  type: 'business_registration' | 'new_report' | 'system_error';
  message: string;
  timestamp: string;
  read: boolean;
}

/**
 * Hook to manage real-time admin notifications
 */
export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to new businesses
    const businessChannel = supabase
      .channel('admin-business-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'businesses',
        },
        (payload) => {
          const newNotification: AdminNotification = {
            id: payload.new.id as string,
            type: 'business_registration',
            message: `New business registration: ${payload.new.name}`,
            timestamp: new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          toast({
            title: "New Business Registration",
            description: `${payload.new.name} has registered`,
          });
        }
      )
      .subscribe();

    // Subscribe to new reports
    const reportsChannel = supabase
      .channel('admin-reports-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports',
        },
        (payload) => {
          const newNotification: AdminNotification = {
            id: payload.new.id as string,
            type: 'new_report',
            message: `New report submitted: ${payload.new.entity_type}`,
            timestamp: new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          toast({
            title: "New Report",
            description: `A new ${payload.new.entity_type} has been reported`,
            variant: "destructive",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(businessChannel);
      supabase.removeChannel(reportsChannel);
    };
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};
