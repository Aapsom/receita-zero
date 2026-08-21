// QA ad-hoc v4.1: checkout.html agora bate no backend real (vc-checkout) e
// redireciona para o MP; valida render anual/mensal + que o botão pagar NÃO
// aponta mais para WhatsApp (é onclick -> fetch) e que data-api está no body.
const { chromium } = require('playwright');
const B = 'http://127.0.0.1:8736/receita-zero/checkout.html';
const CASOS = [
  { url: `${B}?plano=essencial&ciclo=anual`, tem: ['R$29', 'R$348 pagos uma vez', '30 dias de garantia', '1 atualização'], naoTem: ['Domínio .com.br'] },
  { url: `${B}?plano=plus&ciclo=anual`,      tem: ['R$59', 'R$708 pagos uma vez', 'Domínio .com.br', '4 atualizações'], naoTem: [] },
  { url: `${B}?plano=premium&ciclo=anual`,   tem: ['R$89', 'R$1.068 pagos uma vez', 'Atualizações ilimitadas', 'MAIS PROCURADO'], naoTem: ['R$1068 sem ponto'] },
  { url: `${B}?plano=premium&ciclo=mensal`, tem: ['R$149', 'Assinar por R$149/mês', 'No anual sai R$89/mês'], naoTem: ['pagos uma vez'] },
];
(async () => {
  const br = await chromium.launch();
  let falhas = 0;
  for (const c of CASOS) {
    const pg = await br.newPage();
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(c.url, { waitUntil: 'networkidle' });
    const txt = await pg.innerText('body');
    const faltando = c.tem.filter(t => !txt.includes(t));
    const indevido = c.naoTem.filter(t => txt.includes(t));
    const ok = !faltando.length && !indevido.length && !errs.length;
    if (!ok) falhas++;
    console.log(`${ok ? '✅' : '❌'} ${c.url.replace(B, '')}`);
    if (faltando.length) console.log('   faltando:', faltando);
    if (indevido.length) console.log('   indevido:', indevido);
    if (errs.length) console.log('   pageerrors:', errs);
    await pg.close();
  }
  // #vc-api no body + botão pagar é onclick (sem href de wa.me) + aponta pro Avança
  const pg = await br.newPage();
  await pg.goto(`${B}?plano=premium&ciclo=anual`, { waitUntil: 'networkidle' });
  const api = await pg.getAttribute('#vc-api', 'data-api-url');
  const pagarHref = await pg.getAttribute('#pagar', 'href');
  const t = await pg.innerText('#pagar');
  const dataOk = api && api.includes('saas-confianca-cobranca.vercel.app/api/v1/vc-checkout');
  const hrefOk = pagarHref === null || pagarHref === '#';
  const txtOk = t.includes('Fechar o ano por R$1.068');
  if (!(dataOk && hrefOk && txtOk)) falhas++;
  console.log(`${dataOk && hrefOk && txtOk ? '✅' : '❌'} #vc-api + botao pagar onclick (api=${api})`);
  await br.close();
  console.log(falhas ? `❌ CHECKOUT_V41_FAIL (${falhas})` : '✅ CHECKOUT_V41_ALL_PASS');
  process.exit(falhas ? 1 : 0);
})();
