#!/usr/bin/env node
/**
 * dunning-cruzado.js — Integração VC x Avança · Mês 5 (dunning cruzado).
 *
 * Quando o Avança detecta falha de pagamento (subscription.failed / inadimplente),
 * a VC deve mostrar um aviso no dashboard do PME (não derruba o site — modo
 * cortesia). Este script recebe o status de cobrança do Avança e devolve o aviso
 * a ser exibido na VC, classificando a severidade. Sem rede.
 *
 * Uso: echo '{"pme":"...","status":"failed","tentativas":1}' | node ...
 *      node references/dunning-cruzado.js evento.json
 * Exit 0 (o aviso é informativo); o campo `acao` indica o que a VC deve fazer.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function ler(input) {
  if (input === '-') return JSON.parse(fs.readFileSync(0, 'utf8'));
  return JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
}

function mapear(ev) {
  const status = (ev.status || '').toLowerCase();
  switch (status) {
    case 'ativo':
    case 'paid':
    case 'pago':
      return { severidade: 'ok', acao: 'nada', aviso: 'Assinatura em dia.' };
    case 'failed':
    case 'falhou':
    case 'inadimplente':
      return ev.tentativas > 1
        ? { severidade: 'alta', acao: 'mostrar_aviso_pagamento', aviso: 'Pagamento não identificado. Regularize para manter o site no ar.' }
        : { severidade: 'baixa', acao: 'mostrar_aviso_pagamento', aviso: 'Tivemos uma falha na cobrança. Tente novamente para evitar interrupção.' };
    case 'canceled':
    case 'cancelado':
      return { severidade: 'media', acao: 'modo_cortesia', aviso: 'Assinatura cancelada. O site segue visível em modo cortesia.' };
    default:
      return { severidade: 'desconhecido', acao: 'revisar', aviso: 'Status de cobrança indefinido.' };
  }
}

function main() {
  const ev = ler(process.argv[2] || '-');
  const r = mapear(ev);
  console.log(`PME: ${ev.pme || '(sem nome)'}`);
  console.log(`Status Avança: ${ev.status}`);
  console.log(`Severidade: ${r.severidade}`);
  console.log(`Ação VC: ${r.acao}`);
  console.log(`Aviso: ${r.aviso}`);
  console.log('\nDUNNING_OK');
}

if (require.main === module) main();
module.exports = { mapear };
