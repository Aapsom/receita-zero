#!/usr/bin/env node
/**
 * ltv-cruzado-18m.js — M18 (Integração): LTV cruzado projetado para 18m + retro HTML.
 *   node references/ltv-cruzado-18m.js --fixture [--out out.html]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function main() {
  const a = process.argv.slice(2);
  if (!a.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const mrrSite = 149, meses = 18, valorMedio = 149, tx = 0.7;
  const ltvVc = mrrSite * meses;
  const economia = Math.round(valorMedio * tx * meses * 100) / 100;
  const ltv = ltvVc + economia;
  const oi = a.indexOf('--out');
  const out = oi >= 0 ? a[oi + 1] : path.join(ROOT, 'references', '_retro-18m-integ.html');
  const html = `<!doctype html><meta charset=utf8><title>Retro 18m — Integração</title>
<h1>LTV Cruzado 18m (projecão)</h1>
<ul>
<li>LTV VC (site): R$ ${ltvVc}</li>
<li>Economia cobrança Avança: R$ ${economia}</li>
<li>LTV cruzado: R$ ${ltv}</li>
</ul>`;
  fs.writeFileSync(out, html);
  console.log(`✅ LTV_CRUZADO_18M_OK ltvCruzado=R$ ${ltv}`);
  process.exit(0);
}
if (require.main === module) main();
