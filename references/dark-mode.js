#!/usr/bin/env node
/**
 * dark-mode.js — M27: toggle de tema (prefers-color-scheme + manual) determinístico.
 * Gera snippet de CSS/JS que respeita prefers-color-scheme e permite override manual.
 *   node references/dark-mode.js [--out snippet.html]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SNIPPET = `<style>:root{color-scheme:light dark}@media(prefers-color-scheme:dark){:root{--bg:#0B0714;--fg:#fff}}</style>
<script>document.documentElement.dataset.tema=localStorage.tema||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
function toggleTema(){const t=document.documentElement.dataset.tema==='dark'?'light':'dark';document.documentElement.dataset.tema=t;localStorage.tema=t;}<\/script>`;
function main() {
  const a = process.argv.slice(2);
  const oi = a.indexOf('--out');
  const out = oi >= 0 ? a[oi + 1] : path.join(ROOT, 'references', '_dark-mode-snippet.html');
  fs.writeFileSync(out, SNIPPET);
  console.log(`✅ DARKMODE_OK snippet -> ${out}`);
  process.exit(0);
}
if (require.main === module) main();
