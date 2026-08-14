#!/usr/bin/env node
/**
 * revenda-white-label.js — M35 (Integração): revenda cruzada (PME compra add-on de parceiro).
 *   node references/revenda-white-label.js --fixture
 */
'use strict';
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const addon = { id: 'white_label', preco: 99, comissaoPct: 20, parceiro: 'revendedorX' };
  const comissao = Math.round(addon.preco * addon.comissaoPct / 100);
  const ok = comissao === 20 && !!addon.parceiro;
  console.log(ok ? `✅ REVENDA_WL_OK addon=${addon.id} parceiro=${addon.parceiro} comissao=R$ ${comissao}` : `❌ REVENDA_WL_FAIL`);
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
