#!/usr/bin/env node
/**
 * painel-portfolio.js — Vitrine Certa · Mês 6 (painel de portfólio).
 *
 * O plano de 6 meses M6 prevê "Painel de portfólio: todos os clientes, status de
 * pagamento (espelho), saúde do site". Como o espelho de assinaturas vive no
 * Supabase da VC (GATE 👤 p/ credencial), aqui consumimos dois JSONs locais:
 *   - assinaturas.json : [{pme, plano, status}]  (espelho de leitura do Avança)
 *   - saude.json       : [{pme, qa_ok, pageerrors}]  (saída do qa-site por site)
 * e produzem o painel consolidado. Sem rede. Exit 1 se houver cliente com
 * pagamento ou site quebrado (sinal para o PO olhar).
 */
'use strict';
const fs = require('fs');
const path = require('path');

function lerJson(input) {
  const raw = input === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(input), 'utf8');
  return JSON.parse(raw);
}

function main() {
  const assinaturas = lerJson(process.argv[2]);
  const saude = process.argv[3] ? lerJson(process.argv[3]) : [];
  const saudePorPme = new Map(saude.map((s) => [s.pme, s]));

  let problemas = 0;
  const linhas = ['Painel de portfólio — Vitrine Certa'];
  linhas.push('-'.repeat(48));
  for (const a of assinaturas) {
    const s = saudePorPme.get(a.pme) || {};
    const pagOk = a.status === 'ativo' || a.status === 'pago';
    const siteOk = s.qa_ok !== false && (s.pageerrors || 0) === 0;
    if (!pagOk) problemas++;
    if (!siteOk) problemas++;
    linhas.push(`${a.pme} | ${a.plano} | pag:${pagOk ? 'ok' : 'X'} | site:${siteOk ? 'ok' : 'X'}`);
  }
  linhas.push('-'.repeat(48));
  linhas.push(problemas ? `PORTFOLIO_COM_PENDENCIA (${problemas})` : 'PORTFOLIO_OK');
  console.log(linhas.join('\n'));
  process.exit(problemas ? 1 : 0);
}

if (require.main === module) main();
module.exports = { main };
