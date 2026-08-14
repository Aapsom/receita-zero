#!/usr/bin/env node
/**
 * revenda.js — M35: portal do revendedor (white-label + comissão dry-run).
 *   node references/revenda.js painel --revendedor AgX --pmes 'pizza,pet' --mrr 396
 */
'use strict';
function main() {
  const a = process.argv.slice(2);
  if (a[0] !== 'painel') { console.error('uso: painel --revendedor X --pmes a,b --mrr N'); process.exit(2); }
  const g = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : ''; };
  const rev = g('revendedor'), pmes = (g('pmes') || '').split(',').filter(Boolean), mrr = Number(g('mrr')) || 0;
  const comissao = Math.round(mrr * 0.2);
  console.log(`✅ REVENDA_OK rev=${rev} pmes=${pmes.length} MRR=R$ ${mrr} comissao(20%)=R$ ${comissao}`);
  process.exit(0);
}
if (require.main === module) main();
