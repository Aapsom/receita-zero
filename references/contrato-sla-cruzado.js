#!/usr/bin/env node
/**
 * contrato-sla-cruzado.js — M31 (Integração): SLA contratual determinístico VC↔Avança.
 *   node references/contrato-sla-cruzado.js --fixture
 */
'use strict';
function slaComposto(uptimes) { return uptimes.reduce((a, b) => a * b, 1); }
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const s = slaComposto([0.999, 0.999]); // VC * Avança
  const ok = Math.abs(s - 0.998001) < 1e-9;
  console.log(ok ? `✅ CONTRATO_SLA_OK composto=${(s * 100).toFixed(4)}%` : `❌ CONTRATO_SLA_FAIL ${s}`);
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
module.exports = { slaComposto };
