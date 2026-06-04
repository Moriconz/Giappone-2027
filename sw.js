/**
 * Service Worker 2026 — Giappone 2027
 * Advanced caching, offline-first, predictive prefetching, background sync
 * ✓ Core Web Vitals optimized
 * ✓ Predictive resource loading
 * ✓ Offline-first strategy
 */

const CACHE_NAME = 'giappone-2027-v7';
const CACHE_API = 'giappone-2027-api-v1';
const CACHE_IMG = 'giappone-2027-img-v1';
const OFFLINE_URL = '../index.html';

// Critical resources for install
const CRITICAL_RESOURCES = [
  '../',
  '../index.html',
  '../manifest.webmanifest',
  '../css/legacy-skin.css',
  '../css/modern-2026.css',
  '../css/base.css',
];

// Resources to predictively prefetch
const PREDICTIVE_PREFETCH = [
  '../js/sw.js',
  '../icon-192.png',
  '../icon-512.png',
];

// Install with predictive prefetching
self.addEventListener('install', (event) => {
  console.log('[SW] 📦 Installing Service Worker v5 (2026)...');
  event.waitUntil(
    (async () => {
      try {
        // Cache critical resources
        const cache = await caches.open(CACHE_NAME);
        console.log('[SW] ✓ Caching critical resources');

        await cache.addAll(CRITICAL_RESOURCES).catch(err => {
          console.warn('[SW] Some critical resources failed:', err);
        });

        // Predictive prefetch — load likely-needed resources
        console.log('[SW] 🔮 Starting predictive prefetch...');
        for (const url of PREDICTIVE_PREFETCH) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response.clone());
              console.log(`[SW] ✓ Prefetched: ${url}`);
            }
          } catch (e) {
            console.warn(`[SW] Could not prefetch ${url}`);
          }
        }

        // Notify existing clients that a new version is waiting (don't skipWaiting automatically)
        const clients = await self.clients.matchAll({ type: 'window' });
        if (clients.length > 0) {
          console.log('[SW] 📢 Notifying', clients.length, 'client(s) of pending update');
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATE_AVAILABLE' }));
        }
      } catch (err) {
        console.error('[SW] Install error:', err);
      }
    })()
  );
});

// Activate with cache cleanup
self.addEventListener('activate', (event) => {
  console.log('[SW] ⚡ Activating service worker...');
  event.waitUntil(
    (async () => {
      try {
        // Clean old caches
        const cacheNames = await caches.keys();
        const validCaches = [CACHE_NAME, CACHE_API, CACHE_IMG];

        await Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCaches.includes(cacheName)) {
              console.log(`[SW] 🗑️ Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );

        // Claim all clients
        await self.clients.claim();
        console.log('[SW] ✓ Service worker activated');
      } catch (err) {
        console.error('[SW] Activate error:', err);
      }
    })()
  );
});

// Fetch with smart caching strategy
// Cache-first for static assets, Network-first for API/dynamic
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const { url } = event.request;

  // API requests — Network-first strategy with API cache
  if (url.includes('/api/') || url.includes('open-meteo.com')) {
    event.respondWith(networkFirstStrategy(event.request, CACHE_API));
    return;
  }

  // Images — Cache-first strategy
  if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
    event.respondWith(cacheFirstStrategy(event.request, CACHE_IMG));
    return;
  }

  // Static assets (HTML, CSS, JS) — Cache-first with network fallback
  if (url.match(/\.(html|css|js|json|webmanifest)$/i) ||
      url.startsWith(self.location.origin)) {
    event.respondWith(cacheFirstStrategy(event.request, CACHE_NAME));
    return;
  }
});

// Cache-first strategy: prefer cache, fallback to network
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline fallback
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response('Offline - resource not available', {
      status: 503,
      headers: new Headers({ 'Content-Type': 'text/plain' })
    });
  }
}

// Network-first strategy: prefer network, fallback to cache
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Network failed, try cache
    const cached = await caches.match(request);
    if (cached) return cached;

    console.warn(`[SW] Network failed for ${request.url}, no cache available`);
    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
  }
}

// Push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  let notificationData = {
    title: '💬 Nuovo messaggio',
    body: 'Hai un nuovo messaggio nel gruppo',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23FF1493" width="192" height="192"/><text x="96" y="130" font-size="100" font-weight="bold" text-anchor="middle" fill="white">💬</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23FF1493"/></svg>',
    tag: 'group-chat',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: '📖 Leggi' },
      { action: 'close', title: 'Chiudi' }
    ]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData.title = data.title || notificationData.title;
      notificationData.body = data.body || notificationData.body;
      notificationData.data = data;
      console.log('[SW] Parsed push data:', data);
    } catch (e) {
      const text = event.data.text();
      notificationData.body = text;
      console.log('[SW] Push text:', text);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      actions: notificationData.actions,
      data: notificationData.data,
    }).then(() => {
      console.log('[SW] Notification shown');
    }).catch(err => {
      console.error('[SW] Notification error:', err);
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked, action:', event.action);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let client of clientList) {
        if (client.url.includes('index.html') || client.url === '/') {
          if ('focus' in client) {
            client.focus();
          }
          // Send message to show chat
          client.postMessage({
            type: 'OPEN_CHAT',
            from: 'notification'
          });
          return;
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});

// Notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// Background Sync — triggered by browser when connectivity returns
// Client registers 'replay-queue' tag via navigator.serviceWorker.ready.then(r => r.sync.register(...))
self.addEventListener('sync', (event) => {
  if (event.tag === 'replay-queue') {
    console.log('[SW] Background sync: replay-queue');
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clientList => {
        clientList.forEach(client => client.postMessage({ type: 'REPLAY_QUEUE' }));
      })
    );
  }
});

// Page-triggered update: apply waiting SW immediately
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Applying update (skipWaiting)');
    self.skipWaiting();
  }
});

console.log('[SW] Service worker script loaded');
