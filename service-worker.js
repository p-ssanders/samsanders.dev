const CACHE_NAME = 'samsanders-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/images/portrait.webp',
  '/images/portrait.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestURL = new URL(event.request.url);

  // Same-origin static assets: cache-first
  if (requestURL.origin === location.origin && (
    requestURL.pathname.startsWith('/images/') ||
    requestURL.pathname.endsWith('.woff2') ||
    requestURL.pathname.endsWith('.png') ||
    requestURL.pathname.endsWith('.jpg') ||
    requestURL.pathname.endsWith('.webp') ||
    requestURL.pathname.endsWith('.json')
  )) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(networkRes => {
        const copy = networkRes.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        return networkRes;
      })).catch(() => caches.match('/images/portrait.webp'))
    );
    return;
  }

  // Default: network-first, fallback to cache
  event.respondWith(
    fetch(event.request).then(res => res).catch(() => caches.match(event.request))
  );
});
