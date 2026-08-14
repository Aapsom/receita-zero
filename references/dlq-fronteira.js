#!/usr/bin/env node
/**
 * dlq-fronteira.js — M8: retry com backoff no emissor (Avança) + DLQ quando VC fora (logica pura).
 * Simula entrega de evento Avanca->VC com falhas aleatorias/forcadas e fila de retry.
 *   node references/dlq-fronteira.js [--falhas N]   # N = quantas entregas falham antes de ok
 */
'use strict';

function entregar(evento, tentativa, falhasAntesDeOk) {
  // simula transporte: falha ate falhasAntesDeOk tentativas
  if (tentativa <= falhasAntesDeOk) {
    const err = new Error('VC indisponivel (503)');
    err.transient = true;
    throw err;
  }
  return { entregue: true, tentativa };
}

function backoffMs(tentativa) {
  // exponential backoff 1s, 2s, 4s... cap 30s
  return Math.min(30000, 1000 * Math.pow(2, tentativa - 1));
}

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--falhas');
  const falhasAntesDeOk = i >= 0 ? parseInt(args[i + 1], 10) : 3;
  const MAX_TENTATIVAS = 6;
  const evento = { event_id: 'evt_' + Date.now(), tipo: 'subscription.activated' };
  const dlq = [];
  let tentativa = 0, entregue = false;
  while (tentativa < MAX_TENTATIVAS) {
    tentativa++;
    try {
      entregar(evento, tentativa, falhasAntesDeOk);
      entregue = true;
      console.log(`✅ entregue na tentativa ${tentativa} (backoff ${backoffMs(tentativa)}ms)`);
      break;
    } catch (e) {
      const wait = backoffMs(tentativa);
      console.error(`❌ tentativa ${tentativa} falhou (${e.message}); aguardaria ${wait}ms`);
      if (tentativa === MAX_TENTATIVAS) { dlq.push(evento); console.error('💀 DLQ: evento movedo para fila morta'); }
    }
  }
  if (!entregue) { console.log(`❌ DLQ_FAIL (${dlq.length} evento(s))`); process.exit(1); }
  console.log('✅ DLQ_OK (retry+backoff funcionou)');
  process.exit(0);
}
if (require.main === module) main();
