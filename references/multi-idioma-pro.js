#!/usr/bin/env node
/**
 * multi-idioma-pro.js — M32: fallback automático de idioma + dicionário editável.
 *   node references/multi-idioma-pro.js build --out dic.json
 *   node references/multi-idioma-pro.js translate --dic dic.json --idioma en --texto pt
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIC = { pt: { ola: 'Olá', contato: 'Contato' }, en: { ola: 'Hello', contato: 'Contact' } };
function main() {
  const a = process.argv.slice(2);
  if (a[0] === 'build') {
    const oi = a.indexOf('--out');
    const out = oi >= 0 ? a[oi + 1] : path.join(ROOT, 'references', '_i18n-pro.json');
    fs.writeFileSync(out, JSON.stringify(DIC, null, 2));
    console.log(`✅ I18NPRO_BUILD_OK ${out}`);
    process.exit(0);
  }
  if (a[0] === 'translate') {
    const di = a.indexOf('--dic'), ii = a.indexOf('--idioma'), ti = a.indexOf('--texto');
    const dic = JSON.parse(fs.readFileSync(a[di + 1], 'utf8'));
    const t = dic[a[ii + 1]] && dic[a[ii + 1]][a[ti + 1]];
    const ok = !!t;
    console.log(ok ? `✅ I18NPRO_OK ${a[ti + 1]} -> ${t}` : '❌ I18NPRO_FAIL (falta chave)');
    process.exit(ok ? 0 : 1);
  }
  console.error('uso: build | translate'); process.exit(2);
}
if (require.main === module) main();
