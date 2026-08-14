#!/usr/bin/env node
/**
 * reconciliacao-cruzada.js — M19 (Integração): diff VC↔Avança (dry-run), idempotente.
 * Recebe dois mapas {id: estado} e reporta divergências. Não modifica banco.
 *   node references/reconciliacao-cruzada.js --fixture
 */
'use strict';
function divergencias(vc, avanca) {
  const out = [];
  for (const id of new Set([...Object.keys(vc), ...Object.keys(avanca)])) {
    if (vc[id] !== avanca[id]) out.push({ id, vc: vc[id], avanca: avanca[id] });
  }
  return out;
}
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const vc = { t1: 'ativo', t2: 'pausado', t3: 'ativo' };
  const avanca = { t1: 'ativo', t2: 'suspenso', t3: 'ativo' };
  const d = divergencias(vc, avanca);
  const ok = d.length === 1 && d[0].id === 't2';
  console.log(ok ? `✅ RECONCILIACAO_OK divergencias=${d.length} (t2)` : `❌ RECONCILIACAO_FAIL ${JSON.stringify(d)}`);
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
module.exports = { divergencias };
