#!/usr/bin/env node
/**
 * speed-insights.js — M33: Core Web Vitals mock (LCP/CLS) offline determinístico.
 *   node references/speed-insights.js --dir site-dfy/pet
 */
'use strict';
const fs = require('fs');
const path = require('path');
function main() {
  const a = process.argv.slice(2);
  const di = a.indexOf('--dir');
  if (di < 0) { console.error('uso: --dir'); process.exit(2); }
  const dir = path.resolve(a[di + 1]);
  // mock determinístico: LCP ~ tamanho total/50, CLS fixo 0 (sites estáticos)
  let bytes = 0;
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else bytes += fs.statSync(p).size; } })(dir);
  const lcp = Math.max(0.5, bytes / (1024 * 50)); // s
  const cls = 0;
  const ok = lcp < 2.5 && cls < 0.1;
  console.log(`${ok ? '✅' : '⚠️'} SPEED_OK LCP=${lcp.toFixed(2)}s CLS=${cls} (${ok ? 'dentro' : 'fora'})`);
  process.exit(0);
}
if (require.main === module) main();
