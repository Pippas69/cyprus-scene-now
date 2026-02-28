import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { isNativePlatform } from '@/lib/platform';

// ── Web-only helpers ────────────────────────────────────────────────

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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const cleanedKey = base64String
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s/g, '');

  const padding = '='.repeat((4 - (cleanedKey.length % 4)) % 4);
  const base64 = (cleanedKey + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── State type ──────────────────────────────────────────────────────

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permissionState: NotificationPermission | null;
}

// ── Hook ────────────────────────────────────────────────────────────

export function usePushNotifications(userId: string | null) {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    permissionState: null,
  });

  const native = isNativePlatform();

  // ─── Support check ──────────────────────────────────────────────
  useEffect(() => {
    const checkSupport = async () => {
      if (native) {
        // Capacitor native — always supported
        setState(prev => ({
          ...prev,
          isSupported: true,
          permissionState: null,
          isLoading: false,
        }));
        if (userId) checkSubscription();
        return;
      }

      // Web fallback
      const isSupported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      console.log('[Push] Support check:', {
        serviceWorker: 'serviceWorker' in navigator,
        PushManager: 'PushManager' in window,
        Notification: 'Notification' in window,
        isSupported,
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

      if (userId && currentPermission === 'granted') {
        checkSubscription();
      }
    };

    checkSupport();
  }, [userId]);

  // ─── Check existing subscription (DB lookup) ───────────────────
  const checkSubscription = useCallback(async () => {
    if (!userId) return;

    console.log('[Push] Checking existing subscription...');

    try {
      if (native) {
        // On native we stored a device token – check if it's in DB
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        setState(prev => ({ ...prev, isSubscribed: !!data }));
        return;
      }

      // Web fallback
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        setState(prev => ({ ...prev, isSubscribed: false }));
        return;
      }

      const subscription = await (registration as any).pushManager.getSubscription();
      console.log('[Push] Existing subscription:', !!subscription);

      if (subscription) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint)
          .maybeSingle();

        setState(prev => ({ ...prev, isSubscribed: !!data }));
      } else {
        setState(prev => ({ ...prev, isSubscribed: false }));
      }
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
      setState(prev => ({ ...prev, isSubscribed: false }));
    }
  }, [userId, native]);

  // ─── Subscribe ──────────────────────────────────────────────────
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      toast({
        title: 'Σύνδεση απαιτείται',
        description: 'Παρακαλώ συνδεθείτε για να ενεργοποιήσετε τις ειδοποιήσεις.',
        variant: 'destructive',
      });
      return false;
    }

    if (!state.isSupported) {
      toast({
        title: 'Δεν υποστηρίζονται',
        description: 'Ο browser σας δεν υποστηρίζει push ειδοποιήσεις.',
        variant: 'destructive',
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      if (native) {
        return await subscribeNative(userId);
      }
      return await subscribeWeb(userId);
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
  }, [userId, state.isSupported, native]);

  // ─── Native (Capacitor) subscribe ───────────────────────────────
  const subscribeNative = async (uid: string): Promise<boolean> => {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    console.log('[Push][Native] Permission result:', permResult.receive);

    if (permResult.receive !== 'granted') {
      toast({
        title: 'Δεν δόθηκε άδεια',
        description: 'Ενεργοποιήστε τις ειδοποιήσεις στις Ρυθμίσεις.',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }

    // Register for push — this triggers the 'registration' event
    return new Promise<boolean>((resolve) => {
      PushNotifications.addListener('registration', async (token) => {
        console.log('[Push][Native] Device token received:', token.value.substring(0, 20) + '...');

        try {
          // Store the device token in our database
          const { error } = await supabase
            .from('push_subscriptions')
            .upsert(
              {
                user_id: uid,
                endpoint: `apns://${token.value}`, // prefix to distinguish from web endpoints
                p256dh_key: '', // not used for native
                auth_key: token.value, // store actual token here
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,endpoint' }
            );

          if (error) throw error;

          // Enable push in user preferences
          await supabase
            .from('user_preferences')
            .upsert(
              {
                user_id: uid,
                notification_push_enabled: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );

          setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
          toast({
            title: 'Push ειδοποιήσεις ενεργοποιήθηκαν!',
            description: 'Θα λαμβάνετε άμεσες ειδοποιήσεις.',
          });
          resolve(true);
        } catch (err) {
          console.error('[Push][Native] Save error:', err);
          setState(prev => ({ ...prev, isLoading: false }));
          resolve(false);
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[Push][Native] Registration error:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        resolve(false);
      });

      PushNotifications.register();
    });
  };

  // ─── Web subscribe (existing logic) ─────────────────────────────
  const subscribeWeb = async (uid: string): Promise<boolean> => {
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

    // Register / update service worker
    console.log('[Push] Registering service worker...');
    const existingReg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (existingReg) {
      await existingReg.update();
      console.log('[Push] Service worker updated');
    }
    const registration =
      existingReg || (await navigator.serviceWorker.register('/sw.js', { scope: '/' }));
    console.log('[Push] Service worker registered');

    await navigator.serviceWorker.ready;
    console.log('[Push] Service worker ready');

    let subscription = await (registration as any).pushManager.getSubscription();
    console.log('[Push] Existing subscription:', !!subscription);

    if (!subscription) {
      console.log('[Push] Fetching VAPID key...');
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) throw new Error('VAPID key not configured');

      console.log('[Push] VAPID key received');
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      console.log('[Push] Creating push subscription...');
      subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
      console.log('[Push] Push subscription created');
    }

    // Extract keys
    const p256dh = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');
    if (!p256dh || !auth) throw new Error('Failed to get subscription keys');

    const p256dhKey = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh))));
    const authKey = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth))));

    // Save to database
    console.log('[Push] Saving subscription to database...');
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: uid,
        endpoint: subscription.endpoint,
        p256dh_key: p256dhKey,
        auth_key: authKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    );

    if (error) throw error;
    console.log('[Push] Subscription saved successfully');

    // Enable push in preferences
    const { error: prefError } = await supabase.from('user_preferences').upsert(
      {
        user_id: uid,
        notification_push_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (prefError) {
      console.warn('[Push] Failed to update preferences:', prefError);
    }

    setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
    toast({
      title: 'Push ειδοποιήσεις ενεργοποιήθηκαν!',
      description: 'Θα λαμβάνετε άμεσες ειδοποιήσεις.',
    });

    return true;
  };

  // ─── Unsubscribe ────────────────────────────────────────────────
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      if (native) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await PushNotifications.removeAllListeners();

        // Remove all native subscriptions for this user
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .like('endpoint', 'apns://%');
      } else {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await (registration as any).pushManager.getSubscription();

        if (subscription) {
          await subscription.unsubscribe();
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', subscription.endpoint);
        }
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
  }, [userId, native]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
