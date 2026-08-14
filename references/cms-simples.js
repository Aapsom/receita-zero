#!/usr/bin/env node
/**
 * cms-simples.js — M34: edição de conteúdo via JSON (sem DB).
 *   node references/cms-simples.js save --pagina pizzaria --campo titulo --valor "Novo"
 *   node references/cms-simples.js load --pagina pizzaria
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ARQ = path.join(ROOT, 'references', '_cms.json');
function ler() { return fs.existsSync(ARQ) ? JSON.parse(fs.readFileSync(ARQ, 'utf8')) : {}; }
function main() {
  const a = process.argv.slice(2);
  const cmd = a[0];
  const g = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : ''; };
  if (cmd === 'save') {
    const db = ler();
    const p = g('pagina'); db[p] = db[p] || {};
    db[p][g('campo')] = g('valor');
    fs.writeFileSync(ARQ, JSON.stringify(db, null, 2));
    console.log(`✅ CMS_OK ${p}.${g('campo')} salvo`);
    process.exit(0);
  }
  if (cmd === 'load') {
    const db = ler();
    console.log(`✅ CMS_OK ${JSON.stringify(db[g('pagina')] || {})}`);
    process.exit(0);
  }
  console.error('uso: save | load'); process.exit(2);
}
if (require.main === module) main();
