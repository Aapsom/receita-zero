#!/usr/bin/env node
/**
 * gerador-relatorio-email.js — M10: GERADOR de relatório de vendas por e-mail (HTML).
 * Gera o HTML do e-mail (template). NÃO envia (sem Resend/credencial — gate CEO).
 *   node references/gerador-relatorio-email.js [--vendas vendas.json] [--out out.html]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function main() {
  const a = process.argv.slice(2);
  const i = a.indexOf('--vendas');
  const vendas = i >= 0 ? JSON.parse(fs.readFileSync(a[i + 1], 'utf8'))
    : [{ mes: 'jan', plano: 'Basico', mrr: 49 }, { mes: 'fev', plano: 'Premium', mrr: 149 }];
  const total = vendas.reduce((s, v) => s + (v.mrr || 0), 0);
  const o = a.indexOf('--out');
  const out = o >= 0 ? a[o + 1] : path.join(ROOT, 'references', '_relatorio-email.html');
  const html = `<!doctype html><meta charset=utf8>
<h2>Vitrine Certa — Relatório mensal</h2>
<p>MRR total: <b>R$ ${total}</b></p>
<ul>${vendas.map((v) => `<li>${v.mes}: ${v.plano} — R$ ${v.mrr}</li>`).join('')}</ul>
<p><small>Gerado automaticamente. Envio real requer Resend (gate CEO).</small></p>`;
  fs.writeFileSync(out, html);
  console.log(`✅ RELATORIO_GERADO ${out} (MRR R$ ${total}) — NAO enviado (gate CEO)`);
  process.exit(0);
}
if (require.main === module) main();
