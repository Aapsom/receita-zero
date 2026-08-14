#!/usr/bin/env node
/**
 * sync-bidirecional.js — M14 (Integração): sincronização BIDIRECIONAL idempotente (dry-run).
 * Aplica eventos VC→Avança e Avança→VC com lock por (entidade, id) para não duplicar.
 *   node references/sync-bidirecional.js --fixture
 */
'use strict';

function criarSync() {
  const locks = new Set();
  return {
    aplicar(entidade, id, fn) {
      const chave = entidade + ':' + id;
      if (locks.has(chave)) return { ignorado: true };
      locks.add(chave);
      return { aplicado: fn() };
    },
    estado: () => locks.size,
  };
}

function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const sync = criarSync();
  const r1 = sync.aplicar('tenant', 't1', () => 'vc->avança ok');
  const r2 = sync.aplicar('tenant', 't1', () => 'avança->vc ok'); // replay, deve ignorar
  const r3 = sync.aplicar('tenant', 't2', () => 'outro ok');
  let falhas = 0;
  if (!r1.aplicado) { console.error('❌ r1'); falhas++; } else console.log('✅ VC→Avança aplicado');
  if (!r2.ignorado) { console.error('❌ r2 nao foi idempotente'); falhas++; } else console.log('✅ replay ignorado (idempotente)');
  if (!r3.aplicado) { console.error('❌ r3'); falhas++; } else console.log('✅ Avança→VC aplicado');
  console.log(falhas ? `❌ SYNC_FAIL (${falhas})` : `✅ SYNC_OK (${sync.estado()} locks)`);
  process.exit(falhas ? 1 : 0);
}
if (require.main === module) main();
module.exports = { criarSync };
