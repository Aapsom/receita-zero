#!/usr/bin/env node
/**
 * anti-fraude-cruzado.js — M25 (Integração): score determinístico (sem IA) VC↔Avança.
 * Recebe sinais (valor, historico, tentativas) e calcula score 0-100 (maior = mais risco).
 *   node references/anti-fraude-cruzado.js --fixture
 */
'use strict';
function score({ valor, tentativas, historicoOk }) {
  let s = 0;
  if (valor > 1000) s += 30;
  s += Math.min(tentativas, 5) * 10;
  if (!historicoOk) s += 20;
  return Math.min(s, 100);
}
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const r = score({ valor: 1500, tentativas: 2, historicoOk: true });
  const ok = r >= 0 && r <= 100 && r === 50; // 30 + 20
  console.log(ok ? `✅ ANTIFRAUDE_OK score=${r}` : `❌ ANTIFRAUDE_FAIL ${r}`);
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
module.exports = { score };
