/* Giappone 2027 — Service Worker
 * Strategia: cache-first per assets statici, network-first per tiles mappa (con fallback cache).
 * Assicura funzionamento offline dopo il primo caricamento.
 */
const CACHE_VERSION = 'giappone-2027-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Tiles OSM: network-first con fallback cache
  if (url.hostname.includes('tile.openstreetmap') || url.hostname.includes('tile.opentopomap') || url.hostname.includes('basemaps.cartocdn') || url.hostname.includes('arcgisonline')) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Static: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
      if (resp && resp.ok && event.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
      }
      return resp;
    }).catch(() => cached))
  );
});
