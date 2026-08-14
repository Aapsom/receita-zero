#!/usr/bin/env node
/**
 * webhook-outbound.js — M13 (Integração): webhooks OUTBOUND para o PME (template + HMAC P9).
 * Reusa o contrato P9 (HMAC x-vc-signature). Gera o payload + assinatura (mock secret),
 * não envia de fato. Função PURA + teste embutido.
 *   node references/webhook-outbound.js --fixture
 */
'use strict';
const crypto = require('crypto');

function assinar(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function montarEvento({ tipo, pmeId, payload }, secret) {
  const corpo = JSON.stringify({ event: tipo, pme_id: pmeId, ...payload, ts: Date.now() });
  return { body: corpo, signature: assinar(corpo, secret) };
}

function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const secret = 'segredo-demo-32bytes-minimo-abcdefghijklmnop';
  const ev = montarEvento({ tipo: 'site.liberado', pmeId: 'pme_1', payload: { plano: 'premium' } }, secret);
  // verifica
  const ok = crypto.createHmac('sha256', secret).update(ev.body).digest('hex') === ev.signature;
  console.log(ok ? `✅ WEBHOOK_OUTBOUND_OK (HMAC valido, tipo=${JSON.parse(ev.body).event})` : '❌ WEBHOOK_OUTBOUND_FAIL');
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
module.exports = { montarEvento, assinar };
