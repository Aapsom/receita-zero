#!/usr/bin/env node
/**
 * template-engine.js — M20: templates reutilizáveis por nicho (DRY). Gera index.html a partir
 * de dicionário de variáveis + template base determinístico.
 *   node references/template-engine.js render --nicho pizzaria [--out site-dfy/pizzaria/index.html]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const BASE = `<!doctype html><html><head><meta charset=utf8><title>{{titulo}}</title></head>
<body><h1>{{titulo}}</h1><p>{{descricao}}</p><a href="{{cta_href}}">{{cta}}</a></body></html>`;

const DIC = {
  pizzaria: { titulo: 'Pizzaria', descricao: 'As melhores pizzas', cta: 'Peça', cta_href: '#pedir' },
  pet: { titulo: 'Pet Shop', descricao: 'Cuidado animal', cta: 'Agendar', cta_href: '#agendar' },
};

function main() {
  const a = process.argv.slice(2);
  if (a[0] !== 'render') { console.error('uso: render --nicho X'); process.exit(2); }
  const ni = a.indexOf('--nicho');
  const nicho = ni >= 0 ? a[ni + 1] : 'pizzaria';
  const v = DIC[nicho] || DIC.pizzaria;
  const html = BASE.replace(/\{\{(\w+)\}\}/g, (m, k) => v[k] || m);
  const oi = a.indexOf('--out');
  const out = oi >= 0 ? a[oi + 1] : path.join(ROOT, 'references', '_tpl-' + nicho + '.html');
  fs.writeFileSync(out, html);
  console.log(`✅ TEMPLATE_OK ${nicho} -> ${out}`);
  process.exit(0);
}
if (require.main === module) main();
