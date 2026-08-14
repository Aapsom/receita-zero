#!/usr/bin/env node
/**
 * multi-site-pme.js — M22: um PME, vários sites (matriz/filiais) determinístico.
 *   node references/multi-site-pme.js --matriz PizzaDoJoao --filiais 'centro,norte,sul'
 */
'use strict';
function main() {
  const a = process.argv.slice(2);
  const mi = a.indexOf('--matriz'), fi = a.indexOf('--filiais');
  if (mi < 0 || fi < 0) { console.error('uso: --matriz X --filiais a,b,c'); process.exit(2); }
  const matriz = a[mi + 1];
  const filiais = a[fi + 1].split(',');
  const sites = [matriz, ...filiais.map((f) => `${matriz}-${f}`)];
  console.log(`✅ MULTISITE_OK matriz=${matriz} filiais=${filiais.length} total=${sites.length}`);
  process.exit(0);
}
if (require.main === module) main();
