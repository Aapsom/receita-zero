#!/usr/bin/env node
/**
 * ab-test.js — M16: A/B de landing (2 variantes, hash de sessão determinístico, sem IA).
 * Dado um sessionId + lista de variantes, decide A/B via hash (estável, sem random).
 *   node references/ab-test.js --session abc123 [--variantes A,B]
 */
'use strict';
const crypto = require('crypto');

function decidir(sessionId, variantes) {
  const h = crypto.createHash('sha256').update(sessionId).digest('hex');
  const idx = parseInt(h.slice(0, 8), 16) % variantes.length;
  return variantes[idx];
}

function main() {
  const a = process.argv.slice(2);
  const si = a.indexOf('--session');
  const vi = a.indexOf('--variantes');
  const session = si >= 0 ? a[si + 1] : 'sessao-demo';
  const variantes = vi >= 0 ? a[vi + 1].split(',') : ['A', 'B'];
  const v = decidir(session, variantes);
  console.log(`✅ AB_OK session=${session} => variante ${v} (hash determinístico, sem IA)`);
  process.exit(0);
}
if (require.main === module) main();

module.exports = { decidir };
