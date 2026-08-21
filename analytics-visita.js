// Analytics de visita — Vitrine Certa (Mês 4)
// Respeita LGPD: só dispara APÓS consentimento (vc_lgpd === 'ok').
// Best-effort: se window.VC_ANALYTICS_URL não estiver definido, não faz nada
// (não gera 404 nem erro). O backend que consome está no Mês 5 (dashboard real).
(function () {
  function dispara() {
    if (localStorage.getItem('vc_lgpd') !== 'ok') return;
    var url = window.VC_ANALYTICS_URL;
    if (!url) return;
    try {
      var payload = JSON.stringify({
        event: 'pageview',
        path: location.pathname,
        ts: new Date().toISOString(),
        ref: document.referrer || null,
      });
      if (navigator.sendBeacon) navigator.sendBeacon(url, payload);
    } catch (e) { /* silencioso */ }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dispara);
  } else { dispara(); }
  // Re-dispara se o usuário aceita o LGPD depois de carregar
  var orig = window.vcLgpdAceitar;
  window.vcLgpdAceitar = function () { if (orig) orig.apply(this, arguments); dispara(); };
})();
