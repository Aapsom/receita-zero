#!/usr/bin/env node
/**
 * failover-pagamento.js — M22 (Integração): failover determinístico MP→Itaú.
 * Se MP indisponível, roteia para Itaú (ambos mock). Sem IA.
 *   node references/failover-pagamento.js --fixture
 */
'use strict';
function rotear(pspDisponivel) {
  if (pspDisponivel === 'mp') return 'mp';
  if (pspDisponivel === 'itau') return 'itau';
  return 'itau'; // fallback padrão determinístico
}
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const r1 = rotear('mp');        // ok
  const r2 = rotear('indisponivel'); // fallback itau
  const ok = r1 === 'mp' && r2 === 'itau';
  console.log(ok ? `✅ FAILOVER_OK mp=${r1} fallback=${r2}` : `❌ FAILOVER_FAIL ${r1}/${r2}`);
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
module.exports = { rotear };
