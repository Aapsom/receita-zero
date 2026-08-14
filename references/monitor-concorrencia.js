#!/usr/bin/env node
/**
 * monitor-concorrencia.js — M19: scrape leve de preço/concorrência (MOCK/fixture, 0 API paga).
 * Lê fixture JSON de concorrentes e gera relatório comparativo determinístico.
 *   node references/monitor-concorrencia.js [--fixture competidores.json]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function main() {
  const a = process.argv.slice(2);
  const i = a.indexOf('--fixture');
  const fix = i >= 0 ? JSON.parse(fs.readFileSync(a[i + 1], 'utf8'))
    : [{ nome: 'Concorrente A', preco: 199 }, { nome: 'Concorrente B', preco: 149 }, { nome: 'Concorrente C', preco: 299 }];
  const media = fix.reduce((s, x) => s + x.preco, 0) / fix.length;
  const menor = Math.min(...fix.map((x) => x.preco));
  console.log(`✅ MONITOR_OK concorrentes=${fix.length} preco_medio=R$ ${media.toFixed(2)} menor=R$ ${menor}`);
  process.exit(0);
}
if (require.main === module) main();
