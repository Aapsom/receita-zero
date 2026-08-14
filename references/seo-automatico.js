#!/usr/bin/env node
/**
 * seo-automatico.js — M14: gera sitemap.xml + robots.txt + meta OG/SEO por nicho.
 *   node references/seo-automatico.js [--out site-dfy]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site-dfy');
const BASE = 'https://vitrinecerta.app';

function descobrir() {
  const nichos = fs.readdirSync(SITE).filter((n) => fs.statSync(path.join(SITE, n)).isDirectory());
  const urls = [];
  for (const n of nichos) {
    for (const t of ['', 'plus', 'premium']) {
      const p = t ? `${n}/${t}/index.html` : `${n}/index.html`;
      if (fs.existsSync(path.join(SITE, p))) urls.push(`${BASE}/site-dfy/${p}`);
    }
  }
  return urls;
}

function main() {
  const i = process.argv.indexOf('--out');
  const out = i >= 0 ? process.argv[i + 1] : SITE;
  const urls = descobrir();
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n';
  const robots = `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`;
  fs.writeFileSync(path.join(out, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(out, 'robots.txt'), robots);
  // meta OG injetado em cada index existente (deterministico)
  let injetados = 0;
  for (const u of urls) {
    const f = path.join(ROOT, u.replace(BASE + '/', ''));
    if (fs.existsSync(f)) {
      let h = fs.readFileSync(f, 'utf8');
      if (!/property="og:title"/.test(h)) {
        h = h.replace('</head>', `  <meta property="og:title" content="Vitrine Certa">\n  <meta property="og:type" content="website">\n  <meta name="description" content="Site profissional R$0">\n</head>`);
        fs.writeFileSync(f, h);
        injetados++;
      }
    }
  }
  console.log(`✅ SEO_OK sitemap=${urls.length} urls, robots.txt, ${injetados} meta OG injetadas`);
  process.exit(0);
}
if (require.main === module) main();
