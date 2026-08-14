#!/usr/bin/env node
/**
 * painel-portfolio-visual.js — M10: painel de portfólio VISUAL (gera HTML).
 * Lista todos os sites por nicho/tier a partir de site-dfy/. Sem rede.
 *   node references/painel-portfolio-visual.js [--out out.html]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site-dfy');

function descobrirSites() {
  const nichos = fs.readdirSync(SITE).filter((n) => fs.statSync(path.join(SITE, n)).isDirectory());
  const linhas = [];
  let total = 0;
  for (const n of nichos) {
    const tiers = ['', 'plus', 'premium'];
    const itens = [];
    for (const t of tiers) {
      const p = t ? `${n}/${t}/index.html` : `${n}/index.html`;
      if (fs.existsSync(path.join(SITE, p))) { itens.push(t || 'base'); total++; }
    }
    if (itens.length) linhas.push({ nicho: n, tiers: itens });
  }
  return { nichos: linhas, total };
}

function main() {
  const i = process.argv.indexOf('--out');
  const out = i >= 0 ? process.argv[i + 1] : path.join(ROOT, 'references', '_painel-portfolio.html');
  const { nichos, total } = descobrirSites();
  const cards = nichos.map((n) => `<tr><td>${n.nicho}</td><td>${n.tiers.join(', ')}</td></tr>`).join('');
  const html = `<!doctype html><meta charset=utf8><title>Portfólio VC</title>
<h1>Vitrine Certa — Portfólio</h1><p>${total} sites em ${nichos.length} nichos</p>
<table border=1><tr><th>Nicho</th><th>Tiers</th></tr>${cards}</table>`;
  fs.writeFileSync(out, html);
  console.log(`✅ PORTFOLIO_GERADO ${out} (${total} sites / ${nichos.length} nichos)`);
  process.exit(0);
}
if (require.main === module) main();
