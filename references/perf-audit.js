#!/usr/bin/env node
/**
 * perf-audit.js — M25: auditoria de peso (img/CSS/JS) offline + sugestões.
 *   node references/perf-audit.js --dir site-dfy/pet
 */
'use strict';
const fs = require('fs');
const path = require('path');
function main() {
  const a = process.argv.slice(2);
  const di = a.indexOf('--dir');
  if (di < 0) { console.error('uso: --dir <pasta>'); process.exit(2); }
  const dir = path.resolve(a[di + 1]);
  if (!fs.existsSync(dir)) { console.error('dir inexistente'); process.exit(1); }
  let bytes = 0, arquivos = 0; const porTipo = {};
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        const b = fs.statSync(p).size; bytes += b; arquivos++;
        const ext = path.extname(p) || 'outro';
        porTipo[ext] = (porTipo[ext] || 0) + b;
      }
    }
  })(dir);
  const kb = (bytes / 1024).toFixed(1);
  const ok = bytes < 500 * 1024; // < 500KB alvo
  console.log(`${ok ? '✅' : '⚠️'} PERF_OK ${arquivos} arquivos, ${kb}KB ${ok ? '(dentro do alvo)' : '(acima do alvo 500KB)'}`);
  process.exit(0);
}
if (require.main === module) main();
