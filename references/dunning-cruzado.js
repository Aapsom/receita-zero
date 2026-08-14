#!/usr/bin/env node
/**
 * dunning-cruzado.js — M10 (Integração): status cruzado Avança (cobrança) × VC (site).
 * Função PURA: dado estado de cobrança do Avança + estado do site da VC, calcula o
 * status exibido no dashboard do PME. Sem banco, sem rede.
 *   node references/dunning-cruzado.js --fixture
 */
'use strict';

// Estado possível do Avança (cobrança)
//   'pago' | 'falhando' | 'suspenso' | 'trial'
// Estado possível da VC (site)
//   'ativo' | 'pausado' | 'offline'
// Regra determinística (ZERO IA):
//   - cobrança falhando + site pausado  => 'risco'     (vai suspender em 48h) — ANTES de 'suspenso'
//   - cobrança suspenso (+ qq site)     => 'suspenso'  (site deve pausar)
//   - cobrança paga + site pausado      => 'inconsistente' (erro de sincronia)
//   - cobrança falhando + site ativo    => 'atencao'   (avisar dono, site segue)
//   - demais                             => 'saudavel'
function calcularStatus(cobranca, site) {
  if (cobranca === 'falhando' && site === 'pausado') return 'risco';
  if (cobranca === 'suspenso') return 'suspenso';
  if (cobranca === 'pago' && site === 'pausado') return 'inconsistente';
  if (cobranca === 'falhando' && site === 'ativo') return 'atencao';
  return 'saudavel';
}

function main() {
  if (!process.argv.includes('--fixture')) {
    console.error('uso: node references/dunning-cruzado.js --fixture');
    process.exit(2);
  }
  const casos = [
    { cobranca: 'pago', site: 'ativo', esperado: 'saudavel' },
    { cobranca: 'falhando', site: 'ativo', esperado: 'atencao' },
    { cobranca: 'falhando', site: 'pausado', esperado: 'risco' },
    { cobranca: 'suspenso', site: 'ativo', esperado: 'suspenso' },
    { cobranca: 'pago', site: 'pausado', esperado: 'inconsistente' },
    { cobranca: 'trial', site: 'ativo', esperado: 'saudavel' },
  ];
  let falhas = 0;
  for (const c of casos) {
    const r = calcularStatus(c.cobranca, c.site);
    if (r !== c.esperado) { console.error(`❌ ${c.cobranca}/${c.site} => ${r} (esperado ${c.esperado})`); falhas++; }
    else console.log(`✅ ${c.cobranca}/${c.site} => ${r}`);
  }
  console.log(falhas ? `❌ DUNNING_CRUZADO_FAIL (${falhas})` : '✅ DUNNING_CRUZADO_OK');
  process.exit(falhas ? 1 : 0);
}
if (require.main === module) main();

module.exports = { calcularStatus };
