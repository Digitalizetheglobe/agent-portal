// Service worker for the installable portal (PWA).
// It only speeds up and keeps the app shell available: the built scripts, styles, fonts and icons.
// Student, invoice and agent data is never cached here: API calls and anything that is not a plain
// same-origin GET always go straight to the network.
const CACHE = 'qstudy-shell-v1';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/manifest.json', '/icons/icon-192.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // the API and other sites are never cached
  if (url.pathname.startsWith('/api')) return;

  // Page loads: the network first, so users always get the latest version; the cached shell when offline
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Built files have a hash in their name, so a cached copy never goes stale
  if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
