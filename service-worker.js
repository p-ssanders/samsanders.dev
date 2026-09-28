const CACHE_NAME = 'samsanders-cache-v8';
const CACHE_PREFIX = 'samsanders-cache-';
const PORTRAIT_FALLBACK = '/images/portrait-v2-280.webp';
const ASSETS = [
  '/',
  '/index.html',
  '/portrait.js',
  '/fonts/newsreader-name-500-v1.woff2',
  '/manifest.json',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  // Keep a small offline fallback, not an extra full-size portrait download.
  PORTRAIT_FALLBACK,
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
          // A first visit may load its responsive image before this worker takes
          // control. The small precached portrait also covers offline resizing.
          if (/^\/images\/portrait-v2-(280|390|560|780)\.webp$/.test(requestURL.pathname)) {
            const fallback = await caches.match(PORTRAIT_FALLBACK);
            if (fallback) return fallback;
          }
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
