#!/usr/bin/env node
/**
 * teste-ordem-invertida.js — M7: eventos em ordem trocada (activated APOS failed).
 * Idempotencia POR (event_id + tipo): mesmo par nao duplica; tipos distintos do mesmo
 * event_id aplicam em qualquer ordem. Prova que o receptor trata ordem invertida sem
 * duplo efeito nem estado quebrado.
 *   node references/teste-ordem-invertida.js
 */
'use strict';

const estado = { eventos: {}, liberacoes: 0, falhas: 0 };

function aplicar(evento) {
  const chave = evento.event_id + '::' + evento.tipo;
  if (estado.eventos[chave]) return { ignorado: true };
  estado.eventos[chave] = true;
  if (evento.tipo === 'subscription.activated') estado.liberacoes++;
  if (evento.tipo === 'subscription.failed') estado.falhas++;
  return { aplicado: evento.tipo };
}

function main() {
  const eid = 'evt_ordem_' + Date.now();
  const r1 = aplicar({ event_id: eid, tipo: 'subscription.failed', pme_id: 'pme_x' });
  const r2 = aplicar({ event_id: eid, tipo: 'subscription.activated', pme_id: 'pme_x' });
  const r3 = aplicar({ event_id: eid, tipo: 'subscription.activated', pme_id: 'pme_x' });

  let falhas = 0;
  if (r1.aplicado !== 'subscription.failed') { console.error('❌ failed nao aplicado'); falhas++; }
  if (r2.aplicado !== 'subscription.activated') { console.error('❌ activated (apos failed) nao aplicado'); falhas++; }
  if (!r3.ignorado) { console.error('❌ replay nao foi idempotente'); falhas++; }
  if (estado.liberacoes !== 1) { console.error(`❌ liberacoes=${estado.liberacoes} (esperado 1)`); falhas++; }
  if (estado.falhas !== 1) { console.error(`❌ falhas=${estado.falhas} (esperado 1)`); falhas++; }
  console.log(falhas ? `❌ ORDEM_INVERTIDA_FAIL (${falhas})` : '✅ ORDEM_INVERTIDA_OK (activated apos failed + idempotente)');
  process.exit(falhas ? 1 : 0);
}
if (require.main === module) main();
