// i18n stub — Vitrine Certa (Mês 6)
// Toggle PT/EN: elementos com [data-en] trocam o texto. Gravado em localStorage.
(function () {
  function aplica(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (lang === 'en') el.textContent = el.getAttribute('data-en');
      else if (el.hasAttribute('data-pt')) el.textContent = el.getAttribute('data-pt');
    });
  }
  window.vcTrocaIdioma = function (lang) {
    localStorage.setItem('vc_lang', lang);
    aplica(lang);
  };
  var salvo = localStorage.getItem('vc_lang') || 'pt';
  aplica(salvo);
})();
