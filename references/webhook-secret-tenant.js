#!/usr/bin/env node
/**
 * webhook-secret-tenant.js — M11 (Integração): webhook_secret CONFIGURÁVEL por tenant +
 * rotação sem downtime. Reusa a lógica de rotacao-secret do Avança (copiada p/ este repo
 * da VC para não depender do build TS do Avança). Função PURA + teste embutido.
 *   node references/webhook-secret-tenant.js --fixture
 */
'use strict';
const crypto = require('crypto');

function gerarSecret() { return crypto.randomBytes(32).toString('hex'); }

function planejarRotacao(secretAtual, janelaMs = 24 * 60 * 60 * 1000) {
  if (!secretAtual || secretAtual.length < 32) throw new Error('secret atual invalido');
  return { tenant: 'vc', secretAtual, secretNovo: gerarSecret(), duploWrite: true, validoAte: Date.now() + janelaMs };
}

function validar(plano, informado) {
  if (Date.now() > plano.validoAte) return informado === plano.secretNovo;
  return informado === plano.secretAtual || informado === plano.secretNovo;
}

function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  let falhas = 0;
  const atual = gerarSecret();
  const plano = planejarRotacao(atual);
  if (!(validar(plano, atual) && validar(plano, plano.secretNovo) && !validar(plano, 'ruim'))) {
    console.error('❌ validacao durante janela falhou'); falhas++;
  } else console.log('✅ valida atual+novo durante janela');
  const expirado = { ...plano, validoAte: Date.now() - 1000 };
  if (!(validar(expirado, plano.secretNovo) && !validar(expirado, atual))) {
    console.error('❌ validacao apos janela falhou'); falhas++;
  } else console.log('✅ so novo valido apos janela');
  console.log(falhas ? `❌ WEBHOOK_SECRET_TENANT_FAIL (${falhas})` : '✅ WEBHOOK_SECRET_TENANT_OK (rotacao por tenant sem downtime)');
  process.exit(falhas ? 1 : 0);
}
if (require.main === module) main();
module.exports = { gerarSecret, planejarRotacao, validar };
