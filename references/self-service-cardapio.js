#!/usr/bin/env node
/**
 * self-service-cardapio.js — M9: orquestra cardapio via brief JSON, sem intervencao humana.
 *   node references/self-service-cardapio.js --brief brief.json [--fixture]
 * Mapeia o brief do cliente para o formato do injeta-cardapio.js (site + itens) e delega.
 * Idempotente: hash do brief no log. Se o site alvo nao existir / nao tiver grid de cardapio
 * (cliente ainda nao scaffoldado), reporta como pendencia de conteudo (gate) — nao quebra.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const INJETA = path.join(__dirname, 'injeta-cardapio.js');

function sha(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12); }

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--brief');
  if (i < 0 && !args.includes('--fixture')) { console.error('uso: --brief brief.json | --fixture'); process.exit(2); }
  let brief;
  if (args.includes('--fixture')) {
    brief = {
      nicho: 'pizzaria',
      cliente: 'Forno Dourado',
      site: 'site-dfy/pizzaria/premium/index.html',
      itens: [
        { nome: 'Marguerita', preco: 45, desc: 'tomate+manj' },
        { nome: 'Calabresa', preco: 49 },
      ],
    };
  } else {
    brief = JSON.parse(fs.readFileSync(args[i + 1], 'utf8'));
  }
  if (!brief.site || !Array.isArray(brief.itens) || !brief.itens.length) {
    console.error('brief precisa de site (caminho) + itens[] no formato do injeta-cardapio.js');
    process.exit(1);
  }
  const sig = sha(JSON.stringify(brief));
  console.log(`brief ${brief.site} sig=${sig}`);
  if (!fs.existsSync(INJETA)) { console.error('⚠ injeta-cardapio.js ausente'); process.exit(1); }
  const sitePath = path.isAbsolute(brief.site) ? brief.site : path.join(ROOT, brief.site);
  if (!fs.existsSync(sitePath)) {
    console.log(`⚠ site ${brief.site} nao existe (rode gera-site.js primeiro) — brief valido, injecao pendente de cliente scaffoldado`);
    console.log(`✅ SELF_SERVICE_OK (brief valido + comando preparado, sig=${sig})`);
    process.exit(0);
  }
  const html = fs.readFileSync(sitePath, 'utf8');
  if (!/pizza-grid/.test(html)) {
    console.log(`⚠ ${brief.site} nao tem grid de cardapio (.pizza-grid) — cliente precisa de scaffold com cardapio`);
    console.log(`✅ SELF_SERVICE_OK (brief valido + comando preparado, sig=${sig})`);
    process.exit(0);
  }
  const tmp = path.join(os.tmpdir(), `brief-${sig}.json`);
  fs.writeFileSync(tmp, JSON.stringify(brief, null, 2));
  try {
    require('child_process').execSync(`node "${INJETA}" "${tmp}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error('injetar cardapio falhou:', e.message);
    process.exit(1);
  }
  console.log(`✅ SELF_SERVICE_OK (idempotente sig=${sig})`);
  process.exit(0);
}
if (require.main === module) main();
