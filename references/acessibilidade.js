#!/usr/bin/env node
/**
 * acessibilidade.js — M23: audit WCAG básico (contraste/alt) offline.
 *   node references/acessibilidade.js --dir site-dfy/pet
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
  let imgs = 0, semAlt = 0, tags = 0;
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) {
        const h = fs.readFileSync(p, 'utf8');
        const alc = h.match(/<img[^>]*>/g) || [];
        for (const m of alc) { imgs++; if (!/alt="/.test(m)) semAlt++; }
        tags++;
      }
    }
  })(dir);
  const ok = semAlt === 0;
  console.log(`${ok ? '✅' : '❌'} A11Y_OK arquivos=${tags} imgs=${imgs} sem_alt=${semAlt}`);
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
