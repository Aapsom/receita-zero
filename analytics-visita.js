// Analytics de visita — Vitrine Certa (Mês 4 / Mês 37)
// Respeita LGPD: só dispara APÓS consentimento (vc_lgpd === 'ok').
// Envia pageview para /api/v1/events (backend Avança). tenant_id vem de
// window.VC_TENANT_ID (definido por nicho) ou fallback = nicho atual.
// Best-effort: falha silenciosa (não quebra a UX).
(function () {
  function nichoAtual() {
    var m = location.pathname.match(/site-dfy\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : (window.VC_NICHO || 'landing');
  }
  function dispara() {
    if (localStorage.getItem('vc_lgpd') !== 'ok') return;
    var tenant = window.VC_TENANT_ID || nichoAtual();
    try {
      var payload = JSON.stringify({
        tenant_id: tenant,
        nicho: nichoAtual(),
        path: location.pathname,
      });
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/v1/events', blob);
      }
    } catch (e) { /* silencioso */ }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dispara);
  } else { dispara(); }
  var orig = window.vcLgpdAceitar;
  window.vcLgpdAceitar = function () { if (orig) orig.apply(this, arguments); dispara(); };
})();
