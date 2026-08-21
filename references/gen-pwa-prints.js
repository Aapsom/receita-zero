// Gera prints PNG do mock PWA (iOS + Android) a partir de references/mock-pwa.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 2 });
  const file = 'file://' + path.resolve(__dirname, 'mock-pwa.html');
  await pg.goto(file, { waitUntil: 'networkidle' });
  // recorta cada phone (3 phones no mock: ios-fluxo, ios-home, android). Tira ios+home juntos + android.
  const phones = await pg.$$('.phone');
  // print 1: iOS (fluxo + home lado a lado)
  const ios1 = await phones[0].boundingBox();
  const ios2 = await phones[1].boundingBox();
  await pg.screenshot({
    path: path.resolve(__dirname, 'pwa-ios.png'),
    clip: { x: Math.min(ios1.x, ios2.x) - 10, y: ios1.y - 10, width: (ios2.x + ios2.width) - Math.min(ios1.x, ios2.x) + 20, height: ios1.height + 20 },
  });
  // print 2: android (3o phone)
  const and = await phones[2].boundingBox();
  await pg.screenshot({
    path: path.resolve(__dirname, 'pwa-android.png'),
    clip: { x: and.x - 10, y: and.y - 10, width: and.width + 20, height: and.height + 20 },
  });
  await br.close();
  console.log('PNG_OK pwa-ios.png + pwa-android.png');
})();
