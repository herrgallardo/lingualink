// Service Worker for LinguaLink push notifications

const CACHE_NAME = 'lingualink-v1';
const urlsToCache = [
  '/',
  '/icon-192.png',
  '/badge-72.png',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event
self.addEventListener('push', (event) => {
  let options = {
    body: 'You have a new message',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      options = {
        ...options,
        body: payload.body || options.body,
        data: payload.data || options.data,
        tag: payload.tag,
        icon: payload.icon || options.icon,
        badge: payload.badge || options.badge,
      };
    } catch (err) {
      console.error('Error parsing push payload:', err);
    }
  }

  event.waitUntil(
    self.registration.showNotification('LinguaLink', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Handle notification click
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('lingualink') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        const data = event.notification.data || {};
        let url = '/';
        
        if (data.chatId) {
          url = `/chat/${data.chatId}`;
          if (data.messageId) {
            url += `#${data.messageId}`;
          }
        }
        
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync (for offline support)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync
      console.log('Background sync triggered')
    );
  }
});