#!/usr/bin/env node
/**
 * trace-cruzado.js — M17 (Integração): observabilidade CRUZADA (trace ID propagado VC↔Avança).
 * Função PURA: gera traceId e o injeta em cada hop (VC->Avança->webhook). Sem rede.
 *   node references/trace-cruzado.js --fixture
 */
'use strict';
const crypto = require('crypto');

function novoTrace() { return crypto.randomUUID(); }

function hop(traceId, de, para, fn) {
  const span = { traceId, de, para, ts: Date.now() };
  const r = fn();
  return { ...span, resultado: r };
}

function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const traceId = novoTrace();
  const h1 = hop(traceId, 'VC', 'Avança', () => 'site_criado');
  const h2 = hop(traceId, 'Avança', 'webhook', () => 'subscription.activated');
  let falhas = 0;
  if (h1.traceId !== traceId || h2.traceId !== traceId) { console.error('❌ traceId nao propagou'); falhas++; }
  else console.log(`✅ traceId ${traceId.slice(0, 8)} propagado VC->Avança->webhook`);
  console.log(falhas ? `❌ TRACE_FAIL (${falhas})` : '✅ TRACE_CRUZADO_OK');
  process.exit(falhas ? 1 : 0);
}
if (require.main === module) main();
module.exports = { novoTrace, hop };
