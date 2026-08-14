#!/usr/bin/env node
/**
 * form-lead.js — M26: captura de lead (JSONL local) + validação determinística.
 *   node references/form-lead.js capture --nome Joao --email j@x.com --telefone 119999
 *   node references/form-lead.js list --log leads.jsonl
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
function validarEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function validarTel(t) { return /^\d{10,11}$/.test(t.replace(/\D/g, '')); }
function main() {
  const a = process.argv.slice(2);
  const cmd = a[0];
  const log = path.join(ROOT, 'references', '_leads.jsonl');
  if (cmd === 'capture') {
    const g = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : ''; };
    const nome = g('nome'), email = g('email'), tel = g('telefone');
    if (!nome || !validarEmail(email) || !validarTel(tel)) { console.error('❌ LEAD_INVALIDO (nome/email/telefone)'); process.exit(1); }
    const lead = { ts: Date.now(), nome, email, telefone: tel };
    fs.appendFileSync(log, JSON.stringify(lead) + '\n');
    console.log(`✅ LEAD_OK ${nome} <${email}>`);
    process.exit(0);
  }
  if (cmd === 'list') {
    if (!fs.existsSync(log)) { console.log('✅ LEADS_OK (vazio)'); process.exit(0); }
    const n = fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).length;
    console.log(`✅ LEADS_OK ${n} lead(s)`);
    process.exit(0);
  }
  console.error('uso: capture | list'); process.exit(2);
}
if (require.main === module) main();
