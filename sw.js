const CACHE_NAME = 'safeEats-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.webmanifest'
];

// Install event
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache opened');
        return cache.addAll(urlsToCache).catch(() => {
          console.log('[SW] Some assets could not be cached (offline ok)');
          return Promise.resolve();
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  // Handle Share Target API POST requests
  if (event.request.method === 'POST' && event.request.url.includes('index.html')) {
    console.log('[SW] Handling Share Target POST');

    event.respondWith(
      event.request.formData()
        .then(formData => {
          console.log('[SW] Share Target data received');

          // Extract shared data
          const sharedTitle = formData.get('title') || '';
          const sharedText = formData.get('text') || '';
          const sharedUrl = formData.get('url') || '';

          console.log('[SW] Share data:', { sharedTitle, sharedText, sharedUrl });

          // Build query parameters for deep link
          const params = new URLSearchParams({
            title: sharedTitle,
            text: sharedText,
            url: sharedUrl,
            _shared: '1' // Flag to indicate this came from Share Target
          });

          // Redirect to index.html with parameters
          const redirectUrl = './index.html?' + params.toString();
          console.log('[SW] Redirecting to:', redirectUrl);

          // Return redirect response
          return new Response(null, {
            status: 303,
            statusText: 'See Other',
            headers: new Headers({
              'Location': redirectUrl
            })
          });
        })
        .catch(err => {
          console.error('[SW] Error handling Share Target:', err);
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Normal GET requests (original logic)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) return response;
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache))
              .catch(() => {});
            return response;
          });
      })
      .catch(() => {
        return caches.match('./index.html');
      })
  );
});
