#!/usr/bin/env node
/**
 * extras-fronteira.js — M9: reflete extras[] do checkout no espelho da VC (dry-run, sem banco).
 * Cruza o formato de mr.ts do Avança (plano + extras[]) com painel-portfolio.js da VC.
 * Gera JSON de espelho atualizado. NAO escreve em banco (gate CEO).
 *   node references/extras-fronteira.js --fixture   # usa exemplo; --checkout checkout.json
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Espelho de precos por plano (igual Avanca mr.ts / cobranca-mp)
const PLANOS = { basico: 49, plus: 99, premium: 149 };
const ADDONS = {
  site_sempre_novinho: 99,
  aparecer_google_pro: 297,
  cliente_na_porta: 199,
};

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--checkout');
  let checkout;
  if (args.includes('--fixture') || i < 0) {
    checkout = { pme_id: 'pme_demo', pme_email: 'demo@vc.test', plano: 'premium', extras: ['aparecer_google_pro', 'site_sempre_novinho'] };
  } else {
    checkout = JSON.parse(fs.readFileSync(args[i + 1], 'utf8'));
  }
  const valorPlano = PLANOS[checkout.plano] || 0;
  const extras = (checkout.extras || []).filter((e) => ADDONS[e]);
  const valorExtras = extras.reduce((s, e) => s + ADDONS[e], 0);
  const espelho = {
    pme_id: checkout.pme_id,
    pme_email: checkout.pme_email,
    plano: checkout.plano,
    valor_plano: valorPlano,
    extras: extras.map((e) => ({ id: e, valor: ADDONS[e] })),
    valor_extras: valorExtras,
    mrr_total: valorPlano + valorExtras,
    origem: 'avanca_checkout_dry_run',
  };
  fs.writeFileSync(path.join(ROOT, 'references', '_espelho-extras.json'), JSON.stringify(espelho, null, 2));
  console.log(`✅ EXTRAS_ESPELHO_OK plano=${espelho.plano} extras=${extras.length} mrr=R$ ${espelho.mrr_total}`);
  process.exit(0);
}
if (require.main === module) main();
