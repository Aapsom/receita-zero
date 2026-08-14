#!/usr/bin/env node
/**
 * i18n.js — M15: multi-idioma (pt/en) via dicionário JSON + seletor determinístico.
 * Gera dicionário padrão e aplica tradução em templates marcados com {{i18n:chave}}.
 *   node references/i18n.js build [--out dic.json]
 *   node references/i18n.js apply --dic dic.json --in index.html
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIC_PADRAO = {
  'titulo': { pt: 'Bem-vindo', en: 'Welcome' },
  'cta': { pt: 'Contrate', en: 'Hire us' },
  'rodape': { pt: 'Feito com Vitrine Certa', en: 'Made with Vitrine Certa' },
};

function main() {
  const cmd = process.argv[2];
  if (cmd === 'build') {
    const oi = process.argv.indexOf('--out');
    const out = oi >= 0 ? process.argv[oi + 1] : path.join(ROOT, 'references', '_i18n.json');
    fs.writeFileSync(out, JSON.stringify(DIC_PADRAO, null, 2));
    console.log(`✅ I18N_BUILD_OK ${out} (${Object.keys(DIC_PADRAO).length} chaves pt/en)`);
    process.exit(0);
  }
  if (cmd === 'apply') {
    const di = process.argv.indexOf('--dic'), ii = process.argv.indexOf('--in');
    const dic = JSON.parse(fs.readFileSync(process.argv[di + 1], 'utf8'));
    let html = fs.readFileSync(process.argv[ii + 1], 'utf8');
    let n = 0;
    html = html.replace(/\{\{i18n:(\w+):(pt|en)\}\}/g, (m, chave, lang) => {
      if (dic[chave] && dic[chave][lang]) { n++; return dic[chave][lang]; }
      return m;
    });
    process.stdout.write(html);
    console.error(`\n✅ I18N_APPLY_OK (${n} substituições)`);
    process.exit(0);
  }
  console.error('uso: build | apply');
  process.exit(2);
}
if (require.main === module) main();
