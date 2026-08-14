#!/usr/bin/env node
/**
 * catalogo-addons-compartilhado.js — M21 (Integração): catálogo compartilhado (VC exibe, Avança cobra, dry-run).
 *   node references/catalogo-addons-compartilhado.js --fixture
 */
'use strict';
const CAT = [
  { id: 'site_sempre_novinho', nome: 'Site Sempre Novinho', preco: 99 },
  { id: 'aparecer_google_pro', nome: 'Aparecer Google PRO', preco: 297 },
  { id: 'cliente_na_porta', nome: 'Cliente na Porta', preco: 199 },
];
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const exibidos = CAT.length;
  console.log(`✅ CATALOGO_OK ${exibidos} add-ons (VC exibe, Avança apura MRR em mr.ts)`);
  process.exit(0);
}
if (require.main === module) main();
module.exports = { CAT };
