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
    isLoading: false,
    permissionState: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      // Check basic support
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      
      console.log('[Push] Support check:', {
        serviceWorker: 'serviceWorker' in navigator,
        PushManager: 'PushManager' in window,
        Notification: 'Notification' in window,
        isSupported
      });

      if (!isSupported) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          permissionState: null,
          isLoading: false,
        }));
        return;
      }

      const currentPermission = Notification.permission;
      console.log('[Push] Current permission:', currentPermission);
      
      setState(prev => ({
        ...prev,
        isSupported: true,
        permissionState: currentPermission,
        isLoading: false,
      }));
      
      // Only check subscription if user is logged in and permission is granted
      if (userId && currentPermission === 'granted') {
        checkSubscription();
      }
    };

    checkSupport();
  }, [userId]);

  const checkSubscription = useCallback(async () => {
    if (!userId) return;
    
    console.log('[Push] Checking existing subscription...');
    
    try {
      // First check if service worker is registered
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      
      if (!registration) {
        console.log('[Push] No service worker registered');
        setState(prev => ({ ...prev, isSubscribed: false }));
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      console.log('[Push] Existing subscription:', !!subscription);
      
      if (subscription) {
        // Verify it's in our database
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint)
          .maybeSingle();
        
        setState(prev => ({
          ...prev,
          isSubscribed: !!data,
        }));
      } else {
        setState(prev => ({ ...prev, isSubscribed: false }));
      }
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
      setState(prev => ({ ...prev, isSubscribed: false }));
    }
  }, [userId]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      console.log('[Push] No user ID');
      toast({
        title: 'Σύνδεση απαιτείται',
        description: 'Παρακαλώ συνδεθείτε για να ενεργοποιήσετε τις ειδοποιήσεις.',
        variant: 'destructive',
      });
      return false;
    }

    if (!state.isSupported) {
      console.log('[Push] Not supported');
      toast({
        title: 'Δεν υποστηρίζονται',
        description: 'Ο browser σας δεν υποστηρίζει push ειδοποιήσεις.',
        variant: 'destructive',
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    console.log('[Push] Starting subscription process...');

    try {
      // Request permission
      console.log('[Push] Requesting permission...');
      const permission = await Notification.requestPermission();
      console.log('[Push] Permission result:', permission);
      
      setState(prev => ({ ...prev, permissionState: permission }));
      
      if (permission !== 'granted') {
        toast({
          title: 'Δεν δόθηκε άδεια',
          description: 'Ενεργοποιήστε τις ειδοποιήσεις στις ρυθμίσεις του browser.',
          variant: 'destructive',
        });
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Register service worker
      console.log('[Push] Registering service worker...');
      let registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[Push] Service worker registered');
      }
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready');

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      console.log('[Push] Existing subscription:', !!subscription);
      
      if (!subscription) {
        // Get VAPID key from edge function
        console.log('[Push] Fetching VAPID key...');
        const vapidKey = await getVapidPublicKey();
        
        if (!vapidKey) {
          throw new Error('VAPID key not configured');
        }
        console.log('[Push] VAPID key received');
        
        const applicationServerKey = urlBase64ToUint8Array(vapidKey);
        
        console.log('[Push] Creating push subscription...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
        console.log('[Push] Push subscription created');
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
      console.log('[Push] Saving subscription to database...');
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

      if (error) {
        console.error('[Push] Database error:', error);
        throw error;
      }

      console.log('[Push] Subscription saved successfully');
      setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      
      toast({
        title: 'Push ειδοποιήσεις ενεργοποιήθηκαν!',
        description: 'Θα λαμβάνετε άμεσες ειδοποιήσεις.',
      });
      
      return true;
    } catch (error) {
      console.error('[Push] Error subscribing:', error);
      toast({
        title: 'Αποτυχία ενεργοποίησης',
        description: error instanceof Error ? error.message : 'Παρακαλώ δοκιμάστε ξανά.',
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
