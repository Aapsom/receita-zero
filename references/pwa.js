#!/usr/bin/env node
/**
 * pwa.js — M17: gera service worker + manifest.json para app offline-first do cliente.
 *   node references/pwa.js [--site site-dfy/pet/index.html] [--out dir]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SW = `// service worker gerado por references/pwa.js (offline-first, deterministico)
const CACHE = 'vc-pwa-v1';
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => self.clients.claim());
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request).then((r) => r || fetch(e.request).then((fr) => { c.put(e.request, fr.clone()); return fr; }))));
});
`;

function main() {
  const a = process.argv.slice(2);
  const si = a.indexOf('--site');
  const oi = a.indexOf('--out');
  const site = si >= 0 ? path.resolve(ROOT, a[si + 1]) : path.join(ROOT, 'site-dfy', 'pet', 'index.html');
  const out = oi >= 0 ? a[oi + 1] : path.dirname(site);
  fs.writeFileSync(path.join(out, 'sw.js'), SW);
  const manifest = { name: 'Vitrine Certa', short_name: 'VC', start_url: '.', display: 'standalone', background_color: '#0B0714', theme_color: '#A78BFA' };
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`✅ PWA_OK sw.js + manifest.json em ${out}`);
  process.exit(0);
}
if (require.main === module) main();
