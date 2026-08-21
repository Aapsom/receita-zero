// Geo leve — Vitrine Certa (M24)
// Se ?cidade=XXX na URL, atualiza o JSON-LD addressLocality e o heading do nicho.
(function () {
  function cidadeDaUrl() {
    try { return new URLSearchParams(location.search).get('cidade'); } catch (e) { return null; }
  }
  var c = cidadeDaUrl();
  if (!c) return;
  c = c.replace(/\+/g, ' ').trim();
  if (!c) return;
  // atualiza JSON-LD
  var ld = document.querySelector('script[type="application/ld+json"]');
  if (ld) {
    try {
      var j = JSON.parse(ld.textContent);
      if (j.address && j.address.addressLocality !== undefined) j.address.addressLocality = c;
      ld.textContent = JSON.stringify(j);
    } catch (e) {}
  }
  // atualiza heading (.nome do card ou h1 do nicho)
  var h1 = document.querySelector('h1');
  if (h1 && h1.textContent.indexOf(c) === -1) {
    h1.textContent = h1.textContent.replace(/ em [^<]+$/, '') + ' em ' + c;
  }
})();
