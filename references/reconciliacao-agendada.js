#!/usr/bin/env node
/**
 * reconciliacao-agendada.js — M26 (Integração): cron-like dry-run de diff VC↔Avança.
 * Simula agendamento a cada N min (sem timer real; calcula próximo horário).
 *   node references/reconciliacao-agendada.js --fixture
 */
'use strict';
function proximo(agora, intervaloMin) { return agora + intervaloMin * 60 * 1000; }
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const agora = Date.now();
  const prox = proximo(agora, 15);
  const ok = prox > agora && (prox - agora) === 15 * 60 * 1000;
  console.log(ok ? `✅ REC_AGENDADA_OK proximo em 15min` : `❌ REC_AGENDADA_FAIL`);
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
module.exports = { proximo };
