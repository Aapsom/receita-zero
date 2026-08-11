#!/usr/bin/env node
/**
 * isolamento-cross-tenant.js — Integração VC x Avança · Mês 4 (multi-tenant de verdade).
 *
 * Prova, com dados sintéticos, a regra que impede um tenant de ler o dado de
 * outro: cada evento de webhook carrega o tenant_id do DESTINO e o receptor só
 * aplica efeito se o segredo daquele tenant confere. Um tenant A NÃO deve
 * processar evento endereçado ao tenant B, nem reusar o secret de B.
 *
 * Tudo local, sem rede. Exit 1 se houver qualquer vazamento de isolamento.
 */
'use strict';
const crypto = require('crypto');

let falhas = 0;
function ok(label, cond, extra) {
  console.log(`${cond ? '  ok  ' : 'FALHA'} ${label}${!cond && extra ? ' -> ' + extra : ''}`);
  if (!cond) falhas++;
}

function assinar(secret, corpo) {
  return crypto.createHmac('sha256', secret).update(corpo).digest('hex');
}

// "Receptor" mínimo: valida que o evento pertence ao tenant e a assinatura bate.
function aplicarEvento(evento, secretsPorTenant) {
  const secret = secretsPorTenant[evento.tenant_id];
  if (!secret) return { aceito: false, motivo: 'tenant desconhecido' };
  const esperada = assinar(secret, evento.corpo);
  if (esperada !== evento.assinatura) return { aceito: false, motivo: 'assinatura invalida' };
  return { aceito: true, tenant_id: evento.tenant_id };
}

const segA = 'secret-tenant-A-32bytesxxxxxxxxxxxx';
const segB = 'secret-tenant-B-32bytesxxxxxxxxxxxx';
const secrets = { A: segA, B: segB };

console.log('== Isolamento cross-tenant (receptor de webhook) ==');

// 1) evento de A com secret de A -> aceito, isolado
const corpoA = JSON.stringify({ pme_id: 'p1', evento: 'subscription.activated' });
const evA = { tenant_id: 'A', corpo: corpoA, assinatura: assinar(segA, corpoA) };
ok('tenant A processa seu proprio evento', aplicarEvento(evA, secrets).aceito === true);

// 2) evento de A re-assinado com secret de B -> REJEITADO (não vaza para B)
const evAComoB = { tenant_id: 'A', corpo: corpoA, assinatura: assinar(segB, corpoA) };
ok('tenant A NAO processa com secret de B (assinatura invalida)', aplicarEvento(evAComoB, secrets).aceito === false);

// 3) evento enderecado a B nao é aplicado pelo contexto de A
const corpoB = JSON.stringify({ pme_id: 'p2', evento: 'subscription.failed' });
const evB = { tenant_id: 'B', corpo: corpoB, assinatura: assinar(segB, corpoB) };
const rB = aplicarEvento(evB, secrets);
ok('tenant B processa o seu', rB.aceito === true && rB.tenant_id === 'B');
ok('tenant A nao enxerga tenant B', aplicarEvento(evB, { A: segA }).aceito === false);

// 4) replay de evento de A para tenant "C" inexistente -> rejeitado
const evFantasma = { tenant_id: 'C', corpo: corpoA, assinatura: assinar(segA, corpoA) };
ok('tenant inexistente e rejeitado', aplicarEvento(evFantasma, secrets).aceito === false);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nISOLAMENTO_OK');
process.exit(falhas ? 1 : 0);
