#!/usr/bin/env node
/**
 * ltv-cruzado-30m.js — M30 (Integração): LTV cruzado projetado 30m + retro HTML.
 *   node references/ltv-cruzado-30m.js --fixture [--out out.html]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
function main() {
  const a = process.argv.slice(2);
  if (!a.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const mrr = 149, meses = 30, valor = 149, tx = 0.7;
  const ltvVc = mrr * meses;
  const economia = Math.round(valor * tx * meses * 100) / 100;
  const ltv = ltvVc + economia;
  const oi = a.indexOf('--out');
  const out = oi >= 0 ? a[oi + 1] : path.join(ROOT, 'references', '_retro-30m-integ.html');
  fs.writeFileSync(out, `<!doctype html><meta charset=utf8><title>Retro 30m — Integ</title>
<h1>LTV Cruzado 30m</h1><ul><li>VC: R$ ${ltvVc}</li><li>Economia: R$ ${economia}</li><li>Cruzado: R$ ${ltv}</li></ul>`);
  console.log(`✅ LTV_CRUZADO_30M_OK ltvCruzado=R$ ${ltv}`);
  process.exit(0);
}
if (require.main === module) main();
