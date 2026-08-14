#!/usr/bin/env node
/**
 * vc-backup.js — M13: backup OPERACIONAL de sites (snapshot incremental + checksum diff).
 * Diferente de lgpd-backup (foco LGPD/legal), este foca em snapshot operacional para
 * rollback rápido. Gera manifesto com SHA-256 de cada arquivo + diff vs snapshot anterior.
 *   node references/vc-backup.js snapshot [--out dir]
 *   node references/vc-backup.js diff --a s1.json --b s2.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site-dfy');
const OUT = path.join(ROOT, 'references', '_snapshots');

function sha(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function varrer(dir) {
  const out = {};
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { const b = fs.readFileSync(p); out[path.relative(SITE, p)] = sha(b); }
    }
  })(dir);
  return out;
}

function main() {
  const cmd = process.argv[2];
  if (cmd === 'snapshot') {
    const oi = process.argv.indexOf('--out');
    const out = oi >= 0 ? process.argv[oi + 1] : OUT;
    fs.mkdirSync(out, { recursive: true });
    const snap = { ts: new Date().toISOString(), arquivos: varrer(SITE) };
    const f = path.join(out, `snap-${Date.now()}.json`);
    fs.writeFileSync(f, JSON.stringify(snap));
    console.log(`✅ SNAPSHOT_OK ${f} (${Object.keys(snap.arquivos).length} arquivos)`);
    process.exit(0);
  }
  if (cmd === 'diff') {
    const ai = process.argv.indexOf('--a'), bi = process.argv.indexOf('--b');
    const a = JSON.parse(fs.readFileSync(process.argv[ai + 1], 'utf8')).arquivos;
    const b = JSON.parse(fs.readFileSync(process.argv[bi + 1], 'utf8')).arquivos;
    const mod = [], del = [], add = [];
    for (const k of Object.keys(a)) if (!b[k]) del.push(k); else if (a[k] !== b[k]) mod.push(k);
    for (const k of Object.keys(b)) if (!a[k]) add.push(k);
    console.log(`✅ DIFF_OK mod=${mod.length} del=${del.length} add=${add.length}`);
    if (mod.length) console.log('  modificados:', mod.slice(0, 5).join(', '));
    process.exit(0);
  }
  console.error('uso: snapshot | diff');
  process.exit(2);
}
if (require.main === module) main();
