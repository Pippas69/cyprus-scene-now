import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Fetch VAPID public key from edge function
async function getVapidPublicKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-key');
    if (error) throw error;
    return data?.publicKey || null;
  } catch (e) {
    console.error('Failed to fetch VAPID key:', e);
    return null;
  }
}

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permissionState: NotificationPermission | null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId: string | null) {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permissionState: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    
    setState(prev => ({
      ...prev,
      isSupported,
      permissionState: isSupported ? Notification.permission : null,
    }));
    
    if (isSupported && userId) {
      checkSubscription();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId]);

  const checkSubscription = useCallback(async () => {
    if (!userId) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Verify it's in our database
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint)
          .single();
        
        setState(prev => ({
          ...prev,
          isSubscribed: !!data,
          isLoading: false,
        }));
      } else {
        setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      }
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!userId || !state.isSupported) {
      toast({
        title: 'Push notifications not supported',
        description: 'Your browser does not support push notifications.',
        variant: 'destructive',
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permissionState: permission }));
      
      if (permission !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const vapidKey = await getVapidPublicKey();
        if (!vapidKey) {
          throw new Error('VAPID public key not configured');
        }
        
        const applicationServerKey = urlBase64ToUint8Array(vapidKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      }

      // Extract keys from subscription
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      
      if (!p256dh || !auth) {
        throw new Error('Failed to get subscription keys');
      }

      const p256dhArray = new Uint8Array(p256dh);
      const authArray = new Uint8Array(auth);
      
      const p256dhKey = btoa(String.fromCharCode.apply(null, Array.from(p256dhArray)));
      const authKey = btoa(String.fromCharCode.apply(null, Array.from(authArray)));

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh_key: p256dhKey,
          auth_key: authKey,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) throw error;

      // Update preference
      await supabase
        .from('user_preferences')
        .update({ notification_push_enabled: true })
        .eq('user_id', userId);

      setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      
      toast({
        title: 'Push notifications enabled',
        description: 'You will receive instant notifications for ticket sales.',
      });
      
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: 'Failed to enable push notifications',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [userId, state.isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint);
      }

      // Update preference
      await supabase
        .from('user_preferences')
        .update({ notification_push_enabled: false })
        .eq('user_id', userId);

      setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      
      toast({
        title: 'Push notifications disabled',
        description: 'You will no longer receive push notifications.',
      });
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: 'Failed to disable push notifications',
        description: 'Please try again.',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [userId]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
