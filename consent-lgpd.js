// Consentimento LGPD — Vitrine Certa
// Banner de aceite; Microsoft Clarity (analytics) só carrega APÓS consentimento.
// Grava escolha em localStorage (vc_lgpd = 'ok' | 'nao'). Sem escolha, não rastreia.
(function () {
  var KEY = 'vc_lgpd';
  function aceitou() { return localStorage.getItem(KEY) === 'ok'; }
  function recusou() { return localStorage.getItem(KEY) === 'nao'; }

  function injetaClarity() {
    if (window.__vcClarity) return;
    window.__vcClarity = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', 'xrpcs8vw2o');
  }

  function mostraBanner() {
    var b = document.getElementById('vc-lgpd');
    if (b) b.style.display = 'flex';
  }
  function escondeBanner() {
    var b = document.getElementById('vc-lgpd');
    if (b) b.style.display = 'none';
  }

  function init() {
    if (aceitou()) { injetaClarity(); return; }
    if (recusou()) return;
    mostraBanner();
  }

  window.vcLgpdAceitar = function () {
    localStorage.setItem(KEY, 'ok');
    escondeBanner();
    injetaClarity();
  };
  window.vcLgpdRecusar = function () {
    localStorage.setItem(KEY, 'nao');
    escondeBanner();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
