// Service Worker — Vitrine Certa (cache offline básico, non-blocking)
const CACHE = 'vc-static-v1';
const PRECACHE = [
  '/receita-zero/index.html',
  '/receita-zero/checkout.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // stale-while-revalidate para HTML; cache-first para assets estáticos
  if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }
  e.respondWith(caches.match(req).then((cached) => cached || fetch(req).then((res) => {
    if (res.ok && (req.url.endsWith('.png') || req.url.endsWith('.css') || req.url.endsWith('.js'))) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  }).catch(() => cached || caches.match('/receita-zero/index.html'))));
});
