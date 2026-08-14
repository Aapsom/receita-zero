#!/usr/bin/env node
/**
 * analytics-local.js — M21: eventos de clique (scroll/reveal) em JSONL local + dashboard.
 *   node references/analytics-local.js track --event scroll --pagina pizzaria [--out log.jsonl]
 *   node references/analytics-local.js dash --log log.jsonl
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function main() {
  const a = process.argv.slice(2);
  const cmd = a[0];
  const oi = a.indexOf('--out');
  const log = oi >= 0 ? a[oi + 1] : path.join(ROOT, 'references', '_analytics.jsonl');
  if (cmd === 'track') {
    const ei = a.indexOf('--event'), pi = a.indexOf('--pagina');
    const evt = { ts: Date.now(), evento: a[ei + 1], pagina: a[pi + 1] };
    fs.appendFileSync(log, JSON.stringify(evt) + '\n');
    console.log(`✅ TRACK_OK ${evt.evento}/${evt.pagina}`);
    process.exit(0);
  }
  if (cmd === 'dash') {
    if (!fs.existsSync(log)) { console.log('✅ DASH_OK (vazio)'); process.exit(0); }
    const linhas = fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean);
    const porPag = {};
    for (const l of linhas) { const e = JSON.parse(l); porPag[e.pagina] = (porPag[e.pagina] || 0) + 1; }
    console.log(`✅ DASH_OK eventos=${linhas.length} paginas=${Object.keys(porPag).length}`);
    process.exit(0);
  }
  console.error('uso: track | dash'); process.exit(2);
}
if (require.main === module) main();
