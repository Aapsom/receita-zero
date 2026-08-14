#!/usr/bin/env node
/**
 * retrospectiva-6m.js — Integração VC x Avança · Mês 6 (retrospectiva + horizonte).
 *
 * Consome a lista de marcos entregues (JSON) e gera o relatório de retrospectiva
 * 6 meses + o horizonte 7-12. Texto puro, sem rede. Serve para o plano vivo se
 * reescrever sozinho ao fim do semestre (G5 embutido).
 *
 * Uso: node references/retrospectiva-6m.js marcos.json
 *      cat marcos.json | node references/retrospectiva-6m.js -
 * Exit 0 sempre.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function ler(input) {
  const raw = input === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(input), 'utf8');
  return JSON.parse(raw);
}

function gerar(marcos) {
  const entregues = marcos.filter((m) => m.status === 'done');
  const pendentes = marcos.filter((m) => m.status !== 'done');
  const linhas = [
    'RETROSPECTIVA 6 MESES — Integração VC x Avança',
    '='.repeat(48),
    `Entregues: ${entregues.length}/${marcos.length}`,
  ];
  for (const m of entregues) linhas.push(`  ok  M${m.mes}: ${m.nome}`);
  if (pendentes.length) {
    linhas.push('Pendentes (gates 👤):');
    for (const m of pendentes) linhas.push(`  --  M${m.mes}: ${m.nome} (${m.gate || 'gate'})`);
  }
  linhas.push('-'.repeat(48));
  linhas.push('HORIZONTE 7-12:');
  linhas.push('  - White-label B2B: um 2º fornecedor real entra via painel (M4 já tem isolamento).');
  linhas.push('  - Dunning adaptativo (IA) só após coorte de churn estável (Fase 4 do Avança).');
  linhas.push('  - Revisão de pricing por coorte real (sai do [DEFINIR]).');
  return linhas.join('\n');
}

function main() {
  const marcos = ler(process.argv[2] || '-');
  console.log(gerar(marcos));
  console.log('\nRETROSPECTIVA_OK');
}

if (require.main === module) main();
module.exports = { gerar };
