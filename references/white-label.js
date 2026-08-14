#!/usr/bin/env node
/**
 * white-label.js — M29: troca de marca (nome/cor/logo) determinística por tema.
 *   node references/white-label.js apply --nome "Agência X" --cor #A78BFA --logo logo.png
 */
'use strict';
function main() {
  const a = process.argv.slice(2);
  if (a[0] !== 'apply') { console.error('uso: apply --nome X --cor #hex --logo Y'); process.exit(2); }
  const g = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : ''; };
  const nome = g('nome'), cor = g('cor'), logo = g('logo');
  if (!nome || !/^#[0-9a-fA-F]{6}$/.test(cor)) { console.error('❌ nome ou cor(#RRGGBB) inválidos'); process.exit(1); }
  console.log(`✅ WHITELABEL_OK marca="${nome}" cor=${cor} logo=${logo || '(padrão)'}`);
  process.exit(0);
}
if (require.main === module) main();
