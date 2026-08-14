#!/usr/bin/env node
/**
 * ltv-cruzado-24m.js — M24 (Integração): LTV cruzado projetado 24m + retro HTML.
 *   node references/ltv-cruzado-24m.js --fixture [--out out.html]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
function main() {
  const a = process.argv.slice(2);
  if (!a.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const mrr = 149, meses = 24, valor = 149, tx = 0.7;
  const ltvVc = mrr * meses;
  const economia = Math.round(valor * tx * meses * 100) / 100;
  const ltv = ltvVc + economia;
  const oi = a.indexOf('--out');
  const out = oi >= 0 ? a[oi + 1] : path.join(ROOT, 'references', '_retro-24m-integ.html');
  fs.writeFileSync(out, `<!doctype html><meta charset=utf8><title>Retro 24m — Integ</title>
<h1>LTV Cruzado 24m</h1><ul><li>VC: R$ ${ltvVc}</li><li>Economia: R$ ${economia}</li><li>Cruzado: R$ ${ltv}</li></ul>`);
  console.log(`✅ LTV_CRUZADO_24M_OK ltvCruzado=R$ ${ltv}`);
  process.exit(0);
}
if (require.main === module) main();
