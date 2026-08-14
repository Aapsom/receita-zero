#!/usr/bin/env node
/**
 * marketplace-addons.js — M15 (Integração): catálogo de add-ons + bind por tenant (dry-run).
 * A VC exibe; o Avança cobra (apurarMr já existe). Função PURA + teste embutido.
 *   node references/marketplace-addons.js --fixture
 */
'use strict';

const CATALOGO = [
  { id: 'site_sempre_novinho', nome: 'Site Sempre Novinho', preco: 99 },
  { id: 'aparecer_google_pro', nome: 'Aparecer Google PRO', preco: 297 },
  { id: 'cliente_na_porta', nome: 'Cliente na Porta', preco: 199 },
];

function bind(tenantId, ids) {
  const presentes = CATALOGO.filter((a) => ids.includes(a.id));
  const mrr = presentes.reduce((s, a) => s + a.preco, 0);
  return { tenantId, addons: presentes, mrr };
}

function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const r = bind('pme_1', ['site_sempre_novinho', 'aparecer_google_pro']);
  let falhas = 0;
  if (r.addons.length !== 2) { console.error('❌ bind qtd'); falhas++; } else console.log('✅ 2 add-ons bindados');
  if (r.mrr !== 396) { console.error('❌ mrr=', r.mrr); falhas++; } else console.log('✅ MRR add-ons = R$ 396');
  console.log(falhas ? `❌ MARKETPLACE_FAIL (${falhas})` : '✅ MARKETPLACE_OK (dry-run, sem banco)');
  process.exit(falhas ? 1 : 0);
}
if (require.main === module) main();
module.exports = { CATALOGO, bind };
