/**
 * Service Worker Minimale — Giappone 2027
 * Registrato per soddisfare i requisiti PWA
 * Supporta caching offline e installazione app
 */

const CACHE_NAME = 'giappone-2027-v4';
const OFFLINE_URL = '../index.html';

// Installa il service worker e crea la cache
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened:', CACHE_NAME);
        // Cache solo le risorse essenziali
        return cache.addAll([
          '../',
          '../index.html',
          '../manifest.webmanifest',
          '../y2k-override.css',
        ]).catch(err => {
          console.warn('[SW] Some resources could not be cached:', err);
          // Non fallire completamente se alcuni file non possono essere cachati
        });
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Attiva il service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercetta le richieste per il caching
self.addEventListener('fetch', (event) => {
  // Salta le richieste non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Salta le richieste a domini esterni (CDN, API)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Se la risorsa è in cache, restituiscila
        if (response) {
          return response;
        }

        // Altrimenti, fetcha dalla rete
        return fetch(event.request).then((response) => {
          // Verifica se la risposta è valida
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clona la risposta
          const responseToCache = response.clone();

          // Cachala per usi futuri
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch(() => {
          // Se la rete fallisce, restituisci la versione cachata
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || new Response('Offline - resource not cached', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
        });
      })
  );
});

console.log('[SW] Service worker script loaded');
