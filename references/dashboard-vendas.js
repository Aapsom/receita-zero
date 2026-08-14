#!/usr/bin/env node
/**
 * dashboard-vendas.js — M9: GERADOR local de dashboard de vendas (Sheets->chart).
 * Gera HTML+JSON a partir de um JSON de vendas local. NAO faz push para Sheets (gate CEO).
 *   node references/dashboard-vendas.js --vendas vendas.json [--out out.html]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--vendas');
  const vendas = i >= 0 ? JSON.parse(fs.readFileSync(args[i + 1], 'utf8'))
    : [{ mes: 'jan', plano: 'Basico', mrr: 49 }, { mes: 'fev', plano: 'Premium', mrr: 149 }];
  const total = vendas.reduce((s, v) => s + (v.mrr || 0), 0);
  const out = path.join(ROOT, 'references', '_dashboard-vendas.html');
  const html = `<!doctype html><meta charset=utf8><title>Dashboard Vendas VC</title>
<h1>Vitrine Certa — Vendas</h1><p>MRR total: R$ ${total}</p>
<table border=1><tr><th>Mes</th><th>Plano</th><th>MRR</th></tr>
${vendas.map((v) => `<tr><td>${v.mes}</td><td>${v.plano}</td><td>R$ ${v.mrr}</td></tr>`).join('')}
</table>`;
  fs.writeFileSync(out, html);
  fs.writeFileSync(out.replace('.html', '.json'), JSON.stringify({ total, vendas }, null, 2));
  console.log(`✅ DASHBOARD_GERADO ${out} (MRR R$ ${total})`);
  process.exit(0);
}
if (require.main === module) main();
