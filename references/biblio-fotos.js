#!/usr/bin/env node
/**
 * biblio-fotos.js — Vitrine Certa · Mês 4 (catálogo de fotos por nicho).
 *
 * Dado que "fotos do PME" é DADO DE NEGÓCIO da VC (contrato CEO 11/ago), este
 * script organiza e valida a biblioteca de imagens por nicho. NÃO baixa nada
 * (sem rede): apenas confere o que já existe em site-dfy/<nicho>/assets e aponta
 * PMEs sem fotos suficientes ou com arquivos corrompidos.
 *
 * Uso:
 *   node references/biblio-fotos.js            # varre todos os nichos
 *   node references/biblio-fotos.js pet        # só um nicho
 *   node references/biblio-fotos.js --min 3    # mínimo de fotos por nicho
 *
 * Exit 1 se houver nicho sem o mínimo de fotos válidas.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIN_FOTOS = Number(process.argv.find((a) => a.startsWith('--min'))?.split('=')[1] || 3);
const EXT_VALIDAS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

function listarNichos() {
  const alvo = process.argv[2];
  const base = path.join(ROOT, 'site-dfy');
  if (alvo) return [alvo];
  return fs.readdirSync(base).filter((n) => {
    try { return fs.statSync(path.join(base, n)).isDirectory(); } catch { return false; }
  });
}

function auditarNicho(nicho) {
  const dir = path.join(ROOT, 'site-dfy', nicho, 'assets');
  if (!fs.existsSync(dir)) {
    return { nicho, existe: false, fotos: [], problema: 'pasta assets ausente' };
  }
  const fotos = fs.readdirSync(dir)
    .filter((f) => EXT_VALIDAS.has(path.extname(f).toLowerCase()))
    .filter((f) => {
      try { return fs.statSync(path.join(dir, f)).size > 0; } catch { return false; }
    })
    .sort();
  return { nicho, existe: true, fotos, problema: null };
}

function main() {
  let falhas = 0;
  for (const nicho of listarNichos()) {
    const r = auditarNicho(nicho);
    if (!r.existe) {
      console.log(`  x  ${r.nicho}: ${r.problema}`);
      falhas++;
      continue;
    }
    const okq = r.fotos.length >= MIN_FOTOS;
    if (!okq) falhas++;
    console.log(`  ${okq ? 'ok' : 'x '} ${r.nicho}: ${r.fotos.length} foto(s)` +
      (okq ? '' : ` (abaixo do mínimo ${MIN_FOTOS})`));
    for (const f of r.fotos) console.log(`       - ${f}`);
  }
  console.log('\n' + '-'.repeat(48));
  console.log(falhas ? `BIBLIO_FALHOU (${falhas} nicho(s) com problema)` : 'BIBLIO_OK');
  process.exit(falhas ? 1 : 0);
}

if (require.main === module) main();
module.exports = { auditarNicho, listarNichos, MIN_FOTOS };
