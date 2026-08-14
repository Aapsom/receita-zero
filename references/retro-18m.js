#!/usr/bin/env node
/**
 * retro-18m.js — M18: gerador de retrospectiva 18m (HTML/JSON) a partir de métricas locais.
 *   node references/retro-18m.js [--metricas m.json] [--out out.html]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function main() {
  const a = process.argv.slice(2);
  const i = a.indexOf('--metricas');
  const m = i >= 0 ? JSON.parse(fs.readFileSync(a[i + 1], 'utf8'))
    : { sites: 40, nichos: 10, mrr: 3960, clientes: 24, uptime: 99.9 };
  const o = a.indexOf('--out');
  const out = o >= 0 ? a[o + 1] : path.join(ROOT, 'references', '_retro-18m.html');
  const html = `<!doctype html><meta charset=utf8><title>Retro 18m VC</title>
<h1>Vitrine Certa — Retrospectiva 18m</h1>
<ul>
<li>Sites publicados: ${m.sites}</li>
<li>Nichos: ${m.nichos}</li>
<li>MRR: R$ ${m.mrr}</li>
<li>Clientes ativos: ${m.clientes}</li>
<li>Uptime: ${m.uptime}%</li>
</ul>`;
  fs.writeFileSync(out, html);
  fs.writeFileSync(out.replace('.html', '.json'), JSON.stringify(m, null, 2));
  console.log(`✅ RETRO_18M_GERADO ${out}`);
  process.exit(0);
}
if (require.main === module) main();
