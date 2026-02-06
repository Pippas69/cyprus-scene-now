// Service Worker for Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/fomo-logo-new.png',
    badge: '/fomo-logo-new.png',
    tag: undefined,
    data: { url: '/' },
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/fomo-logo-new.png',
    badge: data.badge || '/fomo-logo-new.png',
    // If the same push arrives twice (Safari/iOS quirks), tag lets us collapse to 1.
    tag: data.tag,
    renotify: false,
    vibrate: [100, 50, 100],
    data: data.data || { url: '/' },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: true,
  };

  event.waitUntil(
    (async () => {
      try {
        if (data.tag) {
          const existing = await self.registration.getNotifications({ tag: data.tag });
          for (const n of existing) n.close();
        }
      } catch (e) {
        // Non-fatal: still show notification
        console.warn('[SW] Failed to close existing notifications:', e);
      }

      await self.registration.showNotification(data.title, options);
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard-business/ticket-sales';
  
  if (event.action === 'dismiss') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed');
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});
