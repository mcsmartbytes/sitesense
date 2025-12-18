const CACHE_NAME = 'sitesense-v1';
const STATIC_CACHE = 'sitesense-static-v1';
const DYNAMIC_CACHE = 'sitesense-dynamic-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/jobs',
  '/estimates',
  '/time-tracking',
  '/tools',
  '/contacts',
  '/crew',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('SiteSense: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => console.log('Cache install error:', err))
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external URLs
  if (request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin)) return;

  // Skip API calls - always fetch from network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // For pages - network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Clone and cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline fallback for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Handle push notifications (for future use - tool return reminders, etc.)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New notification',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    vibrate: [100, 50, 100],
  };
  event.waitUntil(
    self.registration.showNotification('SiteSense', options)
  );
});
