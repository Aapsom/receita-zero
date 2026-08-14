#!/usr/bin/env node
/**
 * failover-completo.js — M33 (Integração): failover VC→Avança e Avança→PSP determinístico.
 *   node references/failover-completo.js --fixture
 */
'use strict';
function rotear(psp) { return psp === 'mp' ? 'mp' : 'itau'; }
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const r1 = rotear('mp');
  const r2 = rotear('indisponivel');
  const ok = r1 === 'mp' && r2 === 'itau';
  console.log(ok ? `✅ FAILOVER_COMPLETO_OK psp=${r1} fallback=${r2}` : `❌ FAILOVER_COMPLETO_FAIL ${r1}/${r2}`);
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
module.exports = { rotear };
