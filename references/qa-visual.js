#!/usr/bin/env node
/**
 * qa-visual.js — M7: QA visual regression por nicho (100% offline).
 *   node references/qa-visual.js --baseline   # tira screenshots de baseline
 *   node references/qa-visual.js              # compara contra baseline (falha se diff > LIMITE)
 * Requer servidor local (ex: python -m http.server 8736) rodando na raiz do repo.
 */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(ROOT, 'references', '_baseline');
const PORT = process.env.VC_HTTP_PORT || '8736';
const LIMITE_DIFF_PCT = 2.0;

function snapshotFile(url) {
  const h = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
  return path.join(BASELINE, h + '.png');
}

async function capturar(paginas) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const out = {};
  for (const url of paginas) {
    const f = snapshotFile(url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: f, fullPage: true });
    out[url] = f;
  }
  await browser.close();
  return out;
}

function diffPct(a, b) {
  const sa = fs.statSync(a).size, sb = fs.statSync(b).size;
  const ha = crypto.createHash('sha1').update(fs.readFileSync(a)).digest('hex');
  const hb = crypto.createHash('sha1').update(fs.readFileSync(b)).digest('hex');
  if (ha === hb) return 0;
  const rel = Math.abs(sa - sb) / Math.max(sa, sb, 1) * 100;
  return Math.min(100, rel);
}

async function main() {
  const args = process.argv.slice(2);
  const base = `http://127.0.0.1:${PORT}`;
  const nichos = ['pet', 'pizzaria', 'salao', 'padaria', 'clinica', 'imobiliaria', 'lavanderia', 'oficina'];
  const tiers = ['', 'plus', 'premium'];
  const paginas = [];
  for (const n of nichos) {
    for (const t of tiers) {
      const p = t ? `${n}/${t}/index.html` : `${n}/index.html`;
      if (fs.existsSync(path.join(ROOT, 'site-dfy', p))) paginas.push(`${base}/site-dfy/${p}`);
    }
  }
  paginas.push(`${base}/receita-zero/index.html`);
  fs.mkdirSync(BASELINE, { recursive: true });
  const snaps = await capturar(paginas);
  if (args.includes('--baseline')) {
    console.log(`✅ baseline criado: ${Object.keys(snaps).length} paginas em ${BASELINE}`);
    process.exit(0);
  }
  let falhas = 0;
  for (const url of paginas) {
    const atual = snaps[url];
    const prev = atual + '.prev';
    if (fs.existsSync(prev)) {
      const d = diffPct(atual, prev);
      if (d > LIMITE_DIFF_PCT) { console.error(`❌ ${url}: diff ${d.toFixed(1)}% > ${LIMITE_DIFF_PCT}%`); falhas++; }
      else console.log(`ok ${url} (diff ${d.toFixed(1)}%)`);
    } else {
      console.log(`ok ${url} (sem baseline previo)`);
    }
    fs.copyFileSync(atual, prev);
  }
  console.log(falhas ? `❌ VISUAL_REGRESSION_FAIL (${falhas})` : '✅ VISUAL_REGRESSION_OK');
  process.exit(falhas ? 1 : 0);
}
if (require.main === module) main();
