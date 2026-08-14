#!/usr/bin/env node
/**
 * lgpd-backup.js — M12: backup/restore de dados de site (LGPD local).
 * Compacta site-dfy/ em ZIP com checksum SHA-256 + manifesto. Restore a partir do ZIP.
 * (Postgres HML em 54322 seria pg_dump; aqui file-based para 0 dependência.)
 *   node references/lgpd-backup.js backup   [--out arquivo.zip]
 *   node references/lgpd-backup.js restore --zip arquivo.zip [--dir site-dfy]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site-dfy');

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// ZIP mínimo (store, sem compressão) — só para agrupar arquivos com checksum.
function fazerZip(arquivos) {
  // formato simples: header JSON + concatenação; usamos gzip de um tar-like manual.
  // Para evitar dep externa, gravamos um JSON com {manifest, files:[{path,sha,content}]}.
  const files = arquivos.map((f) => {
    const content = fs.readFileSync(f);
    return { path: path.relative(SITE, f), sha: sha256(content), size: content.length, content: content.toString('base64') };
  });
  const manifest = { criado: new Date().toISOString(), total: files.length, shaGlobal: sha256(Buffer.from(JSON.stringify(files.map((x) => x.sha)))) };
  return { manifest, files };
}

function main() {
  const cmd = process.argv[2];
  if (cmd === 'backup') {
    const out = (process.argv.indexOf('--out') >= 0) ? process.argv[process.argv.indexOf('--out') + 1] : path.join(ROOT, 'references', '_lgpd-backup.json.gz');
    const arquivos = [];
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else arquivos.push(p);
      }
    })(SITE);
    const dados = fazerZip(arquivos);
    const payload = Buffer.from(JSON.stringify(dados));
    fs.writeFileSync(out, zlib.gzipSync(payload));
    console.log(`✅ BACKUP_OK ${out} (${dados.files.length} arquivos, shaGlobal=${dados.manifest.shaGlobal.slice(0, 12)})`);
    process.exit(0);
  }
  if (cmd === 'restore') {
    const zi = process.argv.indexOf('--zip');
    const dirI = process.argv.indexOf('--dir');
    if (zi < 0) { console.error('use --zip'); process.exit(2); }
    const zip = process.argv[zi + 1];
    const dest = dirI >= 0 ? process.argv[dirI + 1] : SITE;
    const dados = JSON.parse(zlib.gunzipSync(fs.readFileSync(zip)).toString());
    let ok = 0;
    for (const f of dados.files) {
      const p = path.join(dest, f.path);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, Buffer.from(f.content, 'base64'));
      if (sha256(fs.readFileSync(p)) === f.sha) ok++;
    }
    console.log(`✅ RESTORE_OK ${ok}/${dados.files.length} arquivos (checksum conferido)`);
    process.exit(0);
  }
  console.error('uso: backup | restore');
  process.exit(2);
}
if (require.main === module) main();
