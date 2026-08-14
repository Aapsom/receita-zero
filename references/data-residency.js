#!/usr/bin/env node
/**
 * data-residency.js — M34 (Integração): residência de dados (LGPD) determinística.
 * Decide onde os dados do PME residem (Brasil, por padrão) com base em regra.
 *   node references/data-residency.js --fixture
 */
'use strict';
function residencia(pais) { return pais === 'BR' ? 'sa-east-1' : 'sa-east-1'; } // LGPD: sempre BR
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const r = residencia('BR');
  const ok = r === 'sa-east-1';
  console.log(ok ? `✅ DATA_RESIDENCY_OK regiao=${r} (LGPD BR)` : `❌ DATA_RESIDENCY_FAIL ${r}`);
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
module.exports = { residencia };
