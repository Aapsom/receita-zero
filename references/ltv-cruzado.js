#!/usr/bin/env node
/**
 * ltv-cruzado.js — M12 (Integração): LTV cruzado VC (receita site) + Avança (economia cobrança).
 * Função PURA determinística. Sem banco. Teste embutido: node references/ltv-cruzado.js --fixture
 */
'use strict';

// LTV cruzado = (MRR site VC × meses retidos) + (economia de falha Avança × meses)
// economia de falha = valor medio da cobranca que o retry recupera × taxa de recuperacao
function calcularLtv({ mrrSite, mesesRetencao, valorMedioCobranca, txRecuperacao, meses }) {
  const ltvVc = Math.round(mrrSite * mesesRetencao * 100) / 100;
  const economiaAvanva = Math.round(valorMedioCobranca * txRecuperacao * meses * 100) / 100;
  return {
    ltvVc,
    economiaAvanva,
    ltvCruzado: Math.round((ltvVc + economiaAvanva) * 100) / 100,
  };
}

function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const r = calcularLtv({ mrrSite: 149, mesesRetencao: 18, valorMedioCobranca: 149, txRecuperacao: 0.7, meses: 18 });
  let falhas = 0;
  if (r.ltvVc !== 2682) { console.error('❌ ltvVc=', r.ltvVc); falhas++; } else console.log(`✅ ltvVc=${r.ltvVc}`);
  if (r.economiaAvanva !== Math.round(149 * 0.7 * 18 * 100) / 100) { console.error('❌ economia=', r.economiaAvanva); falhas++; } else console.log(`✅ economiaAvanva=${r.economiaAvanva}`);
  if (r.ltvCruzado <= r.ltvVc) { console.error('❌ ltvCruzado deve superar ltvVc'); falhas++; } else console.log(`✅ ltvCruzado=${r.ltvCruzado}`);
  console.log(falhas ? `❌ LTV_CRUZADO_FAIL (${falhas})` : '✅ LTV_CRUZADO_OK');
  process.exit(falhas ? 1 : 0);
}
if (require.main === module) main();
module.exports = { calcularLtv };
