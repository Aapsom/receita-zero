// Instalação PWA — Vitrine Certa
// Captura beforeinstallprompt e expõe window.vcInstalarPwa() para o botão da landing.
// Sem o evento (já instalado, ou desktop sem suporte), o botão some.
(function () {
  var def = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    def = e;
    var btn = document.getElementById('vc-instalar');
    if (btn) btn.style.display = 'inline-flex';
  });
  window.vcInstalarPwa = function () {
    var btn = document.getElementById('vc-instalar');
    if (!def) {
      // iOS/Android sem beforeinstallprompt: orienta o usuário manualmente.
      if (btn) btn.textContent = 'No iPhone: Compartilhar → “Tela de Início”';
      return;
    }
    def.prompt();
    def.userChoice.finally(function () { def = null; if (btn) btn.style.display = 'none'; });
  };
  window.addEventListener('appinstalled', function () {
    var btn = document.getElementById('vc-instalar');
    if (btn) btn.style.display = 'none';
  });
})();
