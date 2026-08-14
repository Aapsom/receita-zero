#!/usr/bin/env node
/**
 * retro-36m.js — M36: gerador de retrospectiva 36m (HTML/JSON) a partir de métricas locais.
 *   node references/retro-36m.js [--metricas m.json] [--out out.html]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
function main() {
  const a = process.argv.slice(2);
  const i = a.indexOf('--metricas');
  const m = i >= 0 ? JSON.parse(fs.readFileSync(a[i + 1], 'utf8'))
    : { sites: 100, nichos: 12, mrr: 39600, clientes: 150, uptime: 99.99 };
  const o = a.indexOf('--out');
  const out = o >= 0 ? a[o + 1] : path.join(ROOT, 'references', '_retro-36m.html');
  const html = `<!doctype html><meta charset=utf8><title>Retro 36m VC</title>
<h1>Vitrine Certa — Retrospectiva 36m</h1>
<ul><li>Sites: ${m.sites}</li><li>Nichos: ${m.nichos}</li><li>MRR: R$ ${m.mrr}</li>
<li>Clientes: ${m.clientes}</li><li>Uptime: ${m.uptime}%</li></ul>`;
  fs.writeFileSync(out, html);
  fs.writeFileSync(out.replace('.html', '.json'), JSON.stringify(m, null, 2));
  console.log(`✅ RETRO_36M_GERADO ${out}`);
  process.exit(0);
}
if (require.main === module) main();
