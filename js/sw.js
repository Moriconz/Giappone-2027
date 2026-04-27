/* Giappone 2027 — Service Worker
 * Strategie:
 *   - /api/*                 → network-only (mai cache, foto/geocoding sempre fresche)
 *   - index.html / *.js / *.css → network-first (aggiornamenti propagano subito)
 *   - icons / manifest / leaflet CDN → cache-first (asset immutabili)
 *   - tiles mappa            → network-first con fallback cache (offline OK)
 *
 * IMPORTANT: bumpa CACHE_VERSION a ogni deploy che cambia HTML/JS, così
 * la cache vecchia viene invalidata.
 */
const CACHE_VERSION = 'giappone-2027-v3';

// Solo asset davvero immutabili (icone, CDN versionati, manifest)
const STATIC_ASSETS = [
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Helper: network-first with cache fallback
function networkFirst(event) {
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp && resp.ok && event.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
}

// Helper: cache-first with network fallback
function cacheFirst(event) {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
      if (resp && resp.ok && event.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
      }
      return resp;
    }).catch(() => cached))
  );
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1) /api/* → network-only, MAI cache (geocoding + Unsplash devono essere live)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response(
      JSON.stringify({ error: 'offline', results: [] }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  // 2) Map tiles → network-first con fallback cache
  if (url.hostname.includes('tile.openstreetmap') ||
      url.hostname.includes('tile.opentopomap') ||
      url.hostname.includes('basemaps.cartocdn') ||
      url.hostname.includes('arcgisonline')) {
    networkFirst(event);
    return;
  }

  // 3) HTML / JS / CSS della stessa origine → network-first (aggiornamenti subito)
  const isSameOrigin = url.origin === self.location.origin;
  const isAppCode = isSameOrigin && (
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js')   ||
    url.pathname.endsWith('.css')  ||
    url.pathname === '/'
  );
  if (isAppCode) {
    networkFirst(event);
    return;
  }

  // 4) Tutto il resto (immagini, icone, CDN) → cache-first
  cacheFirst(event);
});
