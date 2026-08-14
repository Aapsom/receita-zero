#!/usr/bin/env node
/**
 * seo-avancado.js — M31: schema.org/JSON-LD (LocalBusiness) offline.
 *   node references/seo-avancado.js --nicho pizzaria [--out site-dfy/pizzaria/index.html]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const DIC = {
  pizzaria: { nome: 'Pizzaria', telefone: '(11) 9999-0000', rua: 'Rua Exemplo, 1' },
  pet: { nome: 'Pet Shop', telefone: '(11) 9999-1111', rua: 'Rua Animal, 2' },
};
function main() {
  const a = process.argv.slice(2);
  const ni = a.indexOf('--nicho');
  const nicho = ni >= 0 ? a[ni + 1] : 'pizzaria';
  const d = DIC[nicho] || DIC.pizzaria;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness',
    name: d.nome, telephone: d.telefone, address: { '@type': 'PostalAddress', streetAddress: d.rua },
  };
  const oi = a.indexOf('--out');
  const out = oi >= 0 ? a[oi + 1] : path.join(ROOT, 'references', '_jsonld-' + nicho + '.html');
  const snippet = `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`;
  fs.writeFileSync(out, snippet);
  console.log(`✅ SEO_AVANCADO_OK JSON-LD LocalBusiness -> ${out}`);
  process.exit(0);
}
if (require.main === module) main();
