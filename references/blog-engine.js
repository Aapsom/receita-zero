#!/usr/bin/env node
/**
 * blog-engine.js — M28: gerador de posts estáticos por nicho (sem DB).
 *   node references/blog-engine.js gen --nicho pizzaria --titulo "Promo" --corpo "..."
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
function main() {
  const a = process.argv.slice(2);
  if (a[0] !== 'gen') { console.error('uso: gen --nicho X --titulo Y --corpo Z'); process.exit(2); }
  const g = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : ''; };
  const nicho = g('nicho'), titulo = g('titulo'), corpo = g('corpo');
  if (!nicho || !titulo) { console.error('❌ falta nicho/titulo'); process.exit(1); }
  const html = `<!doctype html><html><head><meta charset=utf8><title>${titulo}</title></head>
<body><article><h1>${titulo}</h1><p>${corpo}</p></article></body></html>`;
  const out = path.join(ROOT, 'references', `_post-${nicho}-${Date.now()}.html`);
  fs.writeFileSync(out, html);
  console.log(`✅ BLOG_OK post -> ${out}`);
  process.exit(0);
}
if (require.main === module) main();
