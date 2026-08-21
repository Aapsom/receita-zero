// QA ad-hoc v4: valida checkout.html renderizando anual/mensal (precificação v4)
const { chromium } = require('playwright');
const B = 'http://127.0.0.1:8736/receita-zero/checkout.html';
const ESPERADO = [
  { url: `${B}?plano=essencial&ciclo=anual`,  tem: ['R$29', 'R$348 pagos uma vez', 'Fechar o ano por R$348', '30 dias de garantia', '1 atualização'], naoTem: ['Domínio .com.br'] },
  { url: `${B}?plano=plus&ciclo=anual`,       tem: ['R$59', 'R$708 pagos uma vez', 'Domínio .com.br', '4 atualizações'], naoTem: [] },
  { url: `${B}?plano=premium&ciclo=anual`,    tem: ['R$89', 'R$1.068 pagos uma vez', 'Fechar o ano por R$1.068', 'Atualizações ilimitadas', 'MAIS PROCURADO'], naoTem: ['R$1068'] },
  { url: `${B}?plano=premium&ciclo=mensal`,   tem: ['R$149', 'Assinar por R$149/mês', 'No anual sai R$89/mês'], naoTem: ['pagos uma vez'] },
  { url: `${B}?plano=basico&ciclo=mensal`,    tem: ['R$49', 'Assinar por R$49/mês'], naoTem: [] },
];
(async () => {
  const br = await chromium.launch();
  let falhas = 0;
  for (const c of ESPERADO) {
    const pg = await br.newPage();
    const erros = [];
    pg.on('pageerror', e => erros.push(e.message));
    await pg.goto(c.url, { waitUntil: 'networkidle' });
    const txt = await pg.innerText('body');
    const faltando = c.tem.filter(t => !txt.includes(t));
    const indevido = c.naoTem.filter(t => txt.includes(t));
    const ok = !faltando.length && !indevido.length && !erros.length;
    if (!ok) falhas++;
    console.log(`${ok ? '✅' : '❌'} ${c.url.replace(B, '')}`);
    if (faltando.length) console.log('   faltando:', faltando);
    if (indevido.length) console.log('   indevido:', indevido);
    if (erros.length) console.log('   pageerrors:', erros);
    await pg.close();
  }
  // toggle de ciclo funciona sem recarregar
  const pg = await br.newPage();
  await pg.goto(`${B}?plano=premium&ciclo=anual`, { waitUntil: 'networkidle' });
  await pg.click('#ciclo button[data-ciclo="mensal"]');
  const depois = await pg.innerText('body');
  const toggleOk = depois.includes('R$149') && depois.includes('Assinar por R$149/mês');
  console.log(`${toggleOk ? '✅' : '❌'} toggle anual→mensal sem reload`);
  if (!toggleOk) falhas++;
  await br.close();
  console.log(falhas ? `❌ CHECKOUT_V4_FAIL (${falhas})` : '✅ CHECKOUT_V4_ALL_PASS');
  process.exit(falhas ? 1 : 0);
})();
