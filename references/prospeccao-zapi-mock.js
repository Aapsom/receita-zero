#!/usr/bin/env node
/**
 * prospeccao-zapi-mock.js — M11: prospecção em lote com MOCK Z-API (0 custo).
 * Lê lista de PMEs (JSON fixture), gera mensagens personalizadas e SIMULA o envio
 * (loga no console + _prospeccao-log.jsonl). NUNCA chama a API Z-API real.
 *   node references/prospeccao-zapi-mock.js [--leads leads.json]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOG = path.join(ROOT, 'references', '_prospeccao-log.jsonl');

function mensagem(pme) {
  return `Olá ${pme.nome}! A Vitrine Certa cria o site profissional do seu ${pme.nicho} em 24h, R$0. Quer ver?`;
}

function main() {
  const a = process.argv.slice(2);
  const i = a.indexOf('--leads');
  const leads = i >= 0 ? JSON.parse(fs.readFileSync(a[i + 1], 'utf8'))
    : [{ nome: 'Padaria Pão Quente', nicho: 'padaria', whatsapp: '5500000000001' },
       { nome: 'Pet Amigo', nicho: 'pet', whatsapp: '5500000000002' }];
  let enviados = 0;
  for (const pme of leads) {
    const msg = mensagem(pme);
    // MOCK: em vez de POST para Z-API, apenas loga
    fs.appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), pme: pme.nome, msg, status: 'MOCK_ENVIADO' }) + '\n');
    enviados++;
    console.log(`📨 [MOCK] ${pme.nome} (${pme.nicho}): ${msg.slice(0, 40)}...`);
  }
  console.log(`✅ PROSPECCAO_MOCK_OK (${enviados} leads simulados — 0 custo, sem API real)`);
  process.exit(0);
}
if (require.main === module) main();
