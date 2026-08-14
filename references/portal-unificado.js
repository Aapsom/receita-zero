#!/usr/bin/env node
/**
 * portal-unificado.js — M27 (Integração): login único visual (mock) VC↔Avança.
 * Gera token SSO (reusa sso-deterministico) e "redireciona" para painel unificado.
 *   node references/portal-unificado.js --fixture
 */
'use strict';
const crypto = require('crypto');
const SECRET = 'portal-demo-32bytes-minimo-abcdefghijklmnopqr';
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const token = crypto.createHmac('sha256', SECRET).update(JSON.stringify({ sub: 'pme_1', painel: 'unificado' })).digest('hex');
  const ok = /^[a-f0-9]{64}$/.test(token);
  console.log(ok ? `✅ PORTAL_UNIF_OK token SSO gerado (${token.slice(0, 8)}…)` : '❌ PORTAL_UNIF_FAIL');
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
