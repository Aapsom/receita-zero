#!/usr/bin/env node
/**
 * sso-deterministico.js — M20 (Integração): SSO determinístico VC↔Avança via JWT assinado (mock).
 * Gera JWT (HS256) e valida. Sem segredo real (usa secret demo). Sem rede.
 *   node references/sso-deterministico.js --fixture
 */
'use strict';
const crypto = require('crypto');
const SECRET = 'sso-demo-secret-32bytes-minimo-abcdefghijklmnop';

function assinar(payloadObj) {
  const p = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const s = crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
  return `${p}.${s}`;
}
function validar(token) {
  const [p, s] = token.split('.');
  const ok = crypto.createHmac('sha256', SECRET).update(p).digest('base64url') === s;
  return ok ? JSON.parse(Buffer.from(p, 'base64url').toString()) : null;
}
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const jwt = assinar({ sub: 'pme_1', role: 'dono', iat: Date.now() });
  const dec = validar(jwt);
  const ok = !!dec && dec.sub === 'pme_1';
  console.log(ok ? `✅ SSO_OK token validado para ${dec.sub}` : '❌ SSO_FAIL');
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
module.exports = { assinar, validar };
