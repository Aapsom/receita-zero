// service worker gerado por references/pwa.js (offline-first, deterministico)
const CACHE = 'vc-pwa-v1';
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => self.clients.claim());
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request).then((r) => r || fetch(e.request).then((fr) => { c.put(e.request, fr.clone()); return fr; }))));
});
