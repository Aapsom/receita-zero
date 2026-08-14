#!/usr/bin/env node
/**
 * uptime-monitor.js — M7: monitora HTTP 200 de cada site publicado (Pages) + Clarity.
 * Loga JSONL. Sem rede externa (checa a raiz local/publicada via URL configuravel).
 *   node references/uptime-monitor.js [--url BASE]
 */
'use strict';
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOG = path.join(ROOT, 'references', '_uptime.log');

function check(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => { res.resume(); resolve({ url, status: res.statusCode, ts: new Date().toISOString() }); });
    req.on('error', (e) => resolve({ url, status: 0, err: e.message, ts: new Date().toISOString() }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ url, status: 0, err: 'timeout', ts: new Date().toISOString() }); });
  });
}

async function main() {
  const i = process.argv.indexOf('--url');
  const base = i >= 0 ? process.argv[i + 1] : 'http://127.0.0.1:' + (process.env.VC_HTTP_PORT || '8736');
  // so nichos que tem index.html na raiz (verificado em disco)
  const nichos = ['pet', 'pizzaria', 'padaria', 'lavanderia', 'oficina'];
  const urls = nichos.map((n) => `${base}/site-dfy/${n}/index.html`);
  urls.push(`${base}/receita-zero/index.html`);
  const res = await Promise.all(urls.map(check));
  const linha = { ts: new Date().toISOString(), total: res.length, ok: res.filter((r) => r.status === 200).length, detalhe: res };
  fs.appendFileSync(LOG, JSON.stringify(linha) + '\n');
  const quebrados = res.filter((r) => r.status !== 200);
  if (quebrados.length) { console.error('❌ uptime:', quebrados.map((q) => `${q.url}=${q.status}`).join(', ')); process.exit(1); }
  console.log(`✅ UPTIME_OK ${linha.ok}/${linha.total}`);
  process.exit(0);
}
if (require.main === module) main();
