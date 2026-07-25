// inject-exit-intent.js — injeta o modal de captura de lead na saída de aba/fechar
// (exit-intent via visibilitychange + beforeunload) em todos os index.html.
// Idempotente: remove marcadores anteriores antes de reinserir.
// R$0: JS puro, sem servidor. O lead vira wa.me com mensagem pré-preenchida.
// Uso: node references/inject-exit-intent.js
const fs = require('fs');
const path = require('path');

const MARK = '<!-- Vitrine Certa Exit-Intent -->';

function buildBlock() {
  return MARK + `
<style>
#vc-exit{position:fixed;inset:0;background:rgba(11,7,20,.82);z-index:9998;display:none;
  align-items:center;justify-content:center;padding:1.4rem;font-family:system-ui,sans-serif}
#vc-exit.show{display:flex;animation:vcFade .25s ease}
@keyframes vcFade{from{opacity:0}to{opacity:1}}
#vc-exit .box{background:#0B0714;color:#EFE9FF;border:1px solid rgba(45,212,191,.4);
  border-radius:16px;max-width:420px;width:100%;padding:1.8rem;text-align:center;
  box-shadow:0 24px 70px rgba(0,0,0,.6)}
#vc-exit h3{margin:0 0 .5rem;color:#2DD4BF;font-size:1.35rem;line-height:1.25}
#vc-exit p{margin:0 0 1.2rem;opacity:.85;font-size:.98rem;line-height:1.5}
#vc-exit .cta{display:inline-block;background:#C6FF00;color:#0B0714;font-weight:800;
  text-decoration:none;padding:.85rem 1.4rem;border-radius:99px;font-size:1rem}
#vc-exit .close{display:block;margin:.9rem auto 0;background:none;border:0;color:rgba(239,233,255,.5);
  font-size:.82rem;cursor:pointer}
</style>
<div id="vc-exit" role="dialog" aria-modal="true" aria-label="Antes de sair">
  <div class="box">
    <h3>Espera aí! ;)</h3>
    <p>Antes de ir: quer receber <b>promoções e novidades</b> do <span id="vc-biz">nosso comércio</span> direto no seu WhatsApp? É rapidinho.</p>
    <a class="cta" id="vc-exit-wa" href="https://wa.me/5511970776856?text=Quero%20receber%20promoções%20no%20WhatsApp">Receber no WhatsApp</a>
    <button class="close" id="vc-exit-x">Agora não, obrigado</button>
  </div>
</div>
<script>
(function(){
  var shown=false;
  function show(){
    if(shown||sessionStorage.getItem('vc_exit_done'))return;
    shown=true;sessionStorage.setItem('vc_exit_done','1');
    document.getElementById('vc-exit').classList.add('show');
  }
  function hide(){document.getElementById('vc-exit').classList.remove('show');}
  document.addEventListener('visibilitychange',function(){if(document.hidden)show();});
  window.addEventListener('beforeunload',function(e){if(!sessionStorage.getItem('vc_exit_done')){e.preventDefault();e.returnValue='';}});
  document.addEventListener('click',function(e){
    if(e.target&&e.target.id==='vc-exit-x')hide();
    if(e.target&&e.target.id==='vc-exit')hide();
  });
})();
</script>`;
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'index.html') out.push(p);
  }
}
const files = [];
walk('site-dfy', files);
if (fs.existsSync('receita-zero/index.html')) files.push('receita-zero/index.html');
if (fs.existsSync('index.html')) files.push('index.html');

const block = buildBlock();
let count = 0;
for (const f of files) {
  let html = fs.readFileSync(f, 'utf8');
  // remove bloco anterior (do MARK ate o fechamento do <script> seguinte)
  const start = html.indexOf(MARK);
  if (start >= 0) {
    const end = html.indexOf('</script>', start);
    if (end >= 0) html = html.slice(0, start) + html.slice(end + 9);
  }
  const i = html.indexOf('</body>');
  if (i >= 0) { html = html.slice(0, i) + '\n  ' + block + '\n' + html.slice(i); fs.writeFileSync(f, html); count++; }
}
console.log('✅ Exit-intent injetado em ' + count + ' arquivos');
