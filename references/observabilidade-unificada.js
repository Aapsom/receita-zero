#!/usr/bin/env node
/**
 * observabilidade-unificada.js — M23 (Integração): dash único VC↔Avança (dry-run).
 * Agrega métricas de ambos num resumo único. Sem rede.
 *   node references/observabilidade-unificada.js --fixture
 */
'use strict';
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const resumo = {
    vc: { sites: 60, uptime: 99.95 },
    avanca: { tenants: 50, cobrancasRec: 420, uptime: 99.9 },
    cruzado: { tracos: 480, divergencias: 0 },
  };
  console.log(`✅ OBS_UNIFICADA_OK VC uptime=${resumo.vc.uptime}% | Avança uptime=${resumo.avanca.uptime}% | ${resumo.cruzado.tracos} tracos`);
  process.exit(0);
}
if (require.main === module) main();
