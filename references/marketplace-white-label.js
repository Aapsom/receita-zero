#!/usr/bin/env node
/**
 * marketplace-white-label.js — M28 (Integração): add-on revendido por parceiro (dry-run).
 * Parceiro revende add-on da VC; Avança apura comissão. Sem banco.
 *   node references/marketplace-white-label.js --fixture
 */
'use strict';
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const addon = { id: 'white_label', preco: 99, comissaoPct: 20 };
  const comissao = Math.round(addon.preco * addon.comissaoPct / 100);
  const ok = comissao === 20;
  console.log(ok ? `✅ MKWL_OK add-on=${addon.id} comissao=R$ ${comissao}` : `❌ MKWL_FAIL ${comissao}`);
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
