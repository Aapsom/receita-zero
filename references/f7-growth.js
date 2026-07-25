// f7-growth.js — F7 leve (Growth/SEO Insights Orchestrator) da Vitrine Certa.
// Lê fontes de tráfego (Search Console + Clarity) e gera relatorio mensal de
// "trafego -> leads" (JSON + resumo PT-BR). Idempotente e deterministico no mock.
//
// Fontes (por cliente):
//   - Search Console: CSV export (Performance) OU API OAuth AAPSON (futuro)
//   - Clarity: eventos de clique no WhatsApp (ou contagem de sessoes)
// Hoje: modo CSV (cliente exporta e manda) — R$0, sem segredo.
//
// Uso:
//   node references/f7-growth.js --cliente "Pet Shop X" --sc arquivo.csv --clarity-sessoes 320 --wa-cliques 18
//   node references/f7-growth.js --mock   (gera relatorio fake deterministico p/ teste)
//
// Saida: JSON no stdout + resumo PT-BR. Sem rede, sem segredo.

const fs = require('fs');

function parseSCCSV(path) {
  // CSV do Search Console (Performance): Query, Clicks, Impressions, CTR, Position
  const txt = fs.readFileSync(path, 'utf8').trim();
  const lines = txt.split('\n').filter(Boolean);
  const header = lines[0].split(',').map(s => s.trim().toLowerCase());
  const qi = header.indexOf('query') >= 0 ? header.indexOf('query') : 0;
  const ci = header.indexOf('clicks') >= 0 ? header.indexOf('clicks') : 1;
  const ii = header.indexOf('impressions') >= 0 ? header.indexOf('impressions') : 2;
  let cliques = 0, imp = 0; const queries = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',');
    const cl = parseInt(c[ci]) || 0, im = parseInt(c[ii]) || 0;
    cliques += cl; imp += im;
    if (c[qi]) queries.push({ q: c[qi].trim(), cliques: cl });
  }
  queries.sort((a, b) => b.cliques - a.cliques);
  return { cliques, imp, top_queries: queries.slice(0, 10) };
}

function buildReport({ cliente, sc, sessoes, waCliques, periodo }) {
  const ctr = sc.imp ? (sc.cliques / sc.imp * 100).toFixed(1) : '0.0';
  const pos = sc.top_queries.length ? 'verificar' : 'n/a';
  const resumo = `No período ${periodo}, seu site "${cliente}" apareceu ${sc.imp} vezes no Google e recebeu ${sc.cliques} cliques. ` +
    `Foram ${sessoes} visitas registradas (Clarity) e ${waCliques} pessoas clicaram no seu WhatsApp vindo do site. ` +
    (sc.top_queries[0] ? `A busca que mais trouxe visitas foi "${sc.top_queries[0].q}".` : '') +
    (waCliques > 0 ? ` Ou seja, a cada ${Math.max(1, Math.round(sessoes / waCliques))} visitas, 1 vira lead no WhatsApp.` : '');
  return {
    cliente, periodo,
    impressoes: sc.imp, cliques: sc.cliques, ctr: ctr + '%', posicao_media: pos,
    top_queries: sc.top_queries, sessoes_clarity: sessoes, leads_whatsapp: waCliques,
    resumo_ptbr: resumo
  };
}

function mock() {
  const sc = parseSCCSVFromRows([
    'Query,Clicks,Impressions,CTR,Position',
    'pet shop sao vicente,12,240,5.0%,8.2',
    'banho e tosa sao vicente,7,180,3.9%,11.1',
    'pet shop perto de mim,4,90,4.4%,6.5'
  ].join('\n'));
  return buildReport({ cliente: 'Pet Shop Exemplo', sc, sessoes: 320, waCliques: 18, periodo: '2026-07' });
}

function parseSCCSVFromRows(txt) {
  const lines = txt.split('\n').filter(Boolean);
  const header = lines[0].split(',').map(s => s.trim().toLowerCase());
  const qi = header.indexOf('query') >= 0 ? header.indexOf('query') : 0;
  const ci = header.indexOf('clicks') >= 0 ? header.indexOf('clicks') : 1;
  const ii = header.indexOf('impressions') >= 0 ? header.indexOf('impressions') : 2;
  let cliques = 0, imp = 0; const queries = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',');
    const cl = parseInt(c[ci]) || 0, im = parseInt(c[ii]) || 0;
    cliques += cl; imp += im;
    if (c[qi]) queries.push({ q: c[qi].trim(), cliques: cl });
  }
  queries.sort((a, b) => b.cliques - a.cliques);
  return { cliques, imp, top_queries: queries.slice(0, 10) };
}

// ---- CLI ----
if (process.argv.includes('--mock')) {
  const r = mock();
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}
const ci = process.argv.indexOf('--cliente');
const sci = process.argv.indexOf('--sc');
const si = process.argv.indexOf('--clarity-sessoes');
const wi = process.argv.indexOf('--wa-cliques');
const pi = process.argv.indexOf('--periodo');
if (!ci || !sci) {
  console.log('USO: node references/f7-growth.js --cliente NOME --sc arquivo.csv --clarity-sessoes N --wa-cliques N [--periodo AAAA-MM]');
  process.exit(1);
}
const cliente = process.argv[ci + 1];
const sc = parseSCCSV(process.argv[sci + 1]);
const sessoes = si ? parseInt(process.argv[si + 1]) || 0 : 0;
const waCliques = wi ? parseInt(process.argv[wi + 1]) || 0 : 0;
const periodo = pi ? process.argv[pi + 1] : new Date().toISOString().slice(0, 7);
const r = buildReport({ cliente, sc, sessoes, waCliques, periodo });
console.log(JSON.stringify(r, null, 2));
