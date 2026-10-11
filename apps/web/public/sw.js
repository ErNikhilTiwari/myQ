// Service Worker for Healthcare Queue App Interactive Web Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: '🏥 Your Turn Has Arrived!',
    body: 'Your token is now being called. Please proceed to the doctor chamber.',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'token-alert',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: '/'
    }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/vite.svg',
    badge: data.badge || '/vite.svg',
    tag: data.tag || 'token-call',
    vibrate: data.vibrate || [300, 100, 300],
    requireInteraction: true,
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: '👀 View Token' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
