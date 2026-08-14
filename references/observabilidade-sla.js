#!/usr/bin/env node
/**
 * observabilidade-sla.js — M29 (Integração): SLA cruzado determinístico VC↔Avança.
 * Calcula SLA composto a partir de uptimes individuais. Sem rede.
 *   node references/observabilidade-sla.js --fixture
 */
'use strict';
function slaComposto(uptimes) { return uptimes.reduce((a, b) => a * b, 1); }
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const s = slaComposto([0.9995, 0.999]); // VC * Avança
  const ok = Math.abs(s - 0.9985005) < 1e-9;
  console.log(ok ? `✅ OBS_SLA_OK composto=${(s * 100).toFixed(4)}%` : `❌ OBS_SLA_FAIL ${s}`);
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
module.exports = { slaComposto };
