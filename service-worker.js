const CACHE_NAME = 'samsanders-cache-v5';
const CACHE_PREFIX = 'samsanders-cache-';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/images/portrait-2026-09.webp',
  '/robots.txt',
  '/sitemap.xml',
  '/security.txt'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestURL = new URL(event.request.url);
  if (requestURL.origin !== location.origin) return;

  // Same-origin static assets: cache-first
  if (
    requestURL.pathname.startsWith('/images/') ||
    requestURL.pathname.endsWith('.woff2') ||
    requestURL.pathname.endsWith('.png') ||
    requestURL.pathname.endsWith('.jpg') ||
    requestURL.pathname.endsWith('.webp') ||
    requestURL.pathname.endsWith('.json')
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(event.request, networkResponse.clone());
            } catch {
              // A cache write failure should not hide a successful network response.
            }
          }
          return networkResponse;
        } catch {
          return new Response('This resource is unavailable offline.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
      })()
    );
    return;
  }

  // Default: network-first, fallback to cache
  event.respondWith(
    (async () => {
      try {
        return await fetch(event.request);
      } catch {
        const cached = await caches.match(event.request);
        return cached || new Response('This resource is unavailable offline.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })()
  );
});
