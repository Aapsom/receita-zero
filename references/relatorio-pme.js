#!/usr/bin/env node
/**
 * relatorio-pme.js — Vitrine Certa · Mês 5 (relatório mensal do PME).
 *
 * O plano de 6 meses M5 prevê "Relatório mensal automático pro PME ('seu site
 * teve X visitas') — gera upsell". O F7 leve já produz JSON de métricas
 * (impressoes/cliques/ctr). Este script transforma esse JSON em um relatório
 * legível PT-BR que o PME recebe, e emite um SINAL de upsell quando o tráfego
 * está alto mas o plano é básico (gatilho comercial, sem enviar nada).
 *
 * Uso: node references/relatorio-pme.js metrics.json
 *      cat metrics.json | node references/relatorio-pme.js -
 * Exit 0 sempre (relatório é informativo); o sinal de upsell vai no JSON.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function ler(input) {
  if (input === '-') {
    const raw = fs.readFileSync(0, 'utf8');
    return JSON.parse(raw);
  }
  return JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
}

function formatar(n) {
  return (n || 0).toLocaleString('pt-BR');
}

function gerarRelatorio(m) {
  const impressoes = Number(m.impressoes || 0);
  const cliques = Number(m.cliques || 0);
  const ctr = impressoes ? (cliques / impressoes) * 100 : 0;
  const plano = (m.plano || 'basico').toLowerCase();

  const linhas = [
    `Relatório do mês — ${m.pme || 'Cliente'}`,
    `Plano: ${plano}`,
    `Visitas (cliques): ${formatar(cliques)}`,
    `Impressões: ${formatar(impressoes)}`,
    `CTR: ${ctr.toFixed(1)}%`,
  ];

  // Sinal de upsell: tráfego bom + plano básico = oportunidade de upgrade.
  const upsell = cliques >= 100 && plano === 'basico';
  if (upsell) {
    linhas.push('SINAL: tráfego saudável no plano Básico — oferecer Premium/Google PRO.');
  }
  return { texto: linhas.join('\n'), upsell, ctr };
}

function main() {
  const arg = process.argv[2] || '-';
  const m = ler(arg);
  const r = gerarRelatorio(m);
  console.log(r.texto);
  if (r.upsell) console.log('\n[UPSELL] disparar oferta de upgrade');
  console.log('\n' + '='.repeat(40));
  console.log(`RELATORIO_PME_OK (upsell=${r.upsell})`);
}

if (require.main === module) main();
module.exports = { gerarRelatorio, formatar };
