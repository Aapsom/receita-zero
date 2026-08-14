#!/usr/bin/env node
/**
 * contrato-webhook.js — M7: validacao de CONTRATO do webhook Avanca -> Vitrine Certa.
 * Falha (exit 1) se o payload dos eventos subscription.activated / subscription.failed
 * mudar de schema (campos obrigatorios). Usa fixtures em references/_fixtures.
 *   node references/contrato-webhook.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

// Contrato P9 (HMAC x-vc-signature; payload do Avanca)
const CONTRATO = {
  'subscription.activated': ['event', 'event_id', 'subscription_id', 'pme_id', 'plano', 'valor'],
  'subscription.failed': ['event', 'event_id', 'subscription_id', 'pme_id', 'motivo'],
};

function validar(evento, campos) {
  const erros = [];
  if (!evento || typeof evento !== 'object') return ['payload vazio'];
  for (const c of campos) {
    if (!(c in evento) || evento[c] === undefined || evento[c] === null) erros.push(`campo ausente: ${c}`);
  }
  return erros;
}

function main() {
  const dir = path.join(__dirname, '_fixtures');
  if (!fs.existsSync(dir)) { console.error('❌ _fixtures ausente'); process.exit(1); }
  let total = 0;
  for (const [evt, campos] of Object.entries(CONTRATO)) {
    const arq = path.join(dir, evt.replace('.', '_') + '.json');
    if (!fs.existsSync(arq)) { console.error(`❌ fixture ${arq} ausente`); total++; continue; }
    const payload = JSON.parse(fs.readFileSync(arq, 'utf8'));
    const err = validar(payload, campos);
    if (err.length) { console.error(`❌ ${evt}: ${err.join(', ')}`); total += err.length; }
    else console.log(`✅ ${evt} (schema ok)`);
  }
  console.log(total ? `❌ CONTRATO_WEBHOOK_FAIL (${total})` : '✅ CONTRATO_WEBHOOK_OK');
  process.exit(total ? 1 : 0);
}
if (require.main === module) main();
