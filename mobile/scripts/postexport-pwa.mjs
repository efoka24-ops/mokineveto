// Post-traitement d'un export web Expo (`expo export -p web`) pour le servir
// comme PWA installable sous /app/ sur l'hébergement Camoo.
//
//   node scripts/postexport-pwa.mjs <dossier-export> <version-cache-sw> [--icons-from=<url>]
//
// L'export régénère index.html sans manifest, service worker, marges de
// sécurité ni .htaccess : ce script les remet tous, à l'identique à chaque fois.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [dir, version] = process.argv.slice(2);
const iconsFrom = (process.argv.find((a) => a.startsWith('--icons-from=')) ?? '--icons-from=https://mokineveto.trugroup.cm/app').split('=')[1];
if (!dir || !version) {
  console.error('Usage: node scripts/postexport-pwa.mjs <dossier> <version-sw> [--icons-from=<url>]');
  process.exit(1);
}

const indexPath = join(dir, 'index.html');
let html = readFileSync(indexPath, 'utf8');

html = html
  .replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, shrink-to-fit=no" />')
  .replace(/<style id="expo-reset">[\s\S]*?<\/style>/, `<style id="expo-reset">
      html, body { height: 100%; height: 100dvh; width: 100%; margin: 0; padding: 0; }
      *, *::before, *::after { box-sizing: border-box; }
      body { overflow: hidden; overscroll-behavior: none; position: fixed; inset: 0; }
      #root { display: flex; height: 100%; height: 100dvh; flex: 1;
        padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px);
        padding-left: env(safe-area-inset-left, 0px); padding-right: env(safe-area-inset-right, 0px); }
    </style>`)
  .replace('</head>', `  <link rel="manifest" href="/app/manifest.json" />
  <link rel="apple-touch-icon" href="/app/apple-touch-icon.png" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="MokineVeto" />
  <meta name="description" content="MokineVeto — suivi vétérinaire et sanitaire du cheptel" />
</head>`)
  .replace('</body>', `  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {});
      });
    }
  </script>
</body>`);
writeFileSync(indexPath, html);

writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
  name: 'MokineVeto', short_name: 'MokineVeto',
  description: 'MokineVeto — suivi vétérinaire et sanitaire du cheptel',
  start_url: '/app/', scope: '/app/', display: 'standalone', orientation: 'portrait',
  background_color: '#D7F0DD', theme_color: '#D7F0DD', lang: 'fr',
  icons: [
    { src: '/app/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/app/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/app/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2) + '\n');

writeFileSync(join(dir, 'sw.js'), `const CACHE_NAME = 'mokineveto-app-v${version}';
const APP_SHELL = ['/app/', '/app/index.html', '/app/manifest.json', '/app/favicon.ico'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/app/_expo/static/') || url.pathname.startsWith('/app/assets/')) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, copy)); return res;
    })));
    return;
  }
  event.respondWith(fetch(request).then((res) => {
    const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, copy)); return res;
  }).catch(() => caches.match(request).then((cached) => cached || caches.match('/app/index.html'))));
});
`);

writeFileSync(join(dir, '.htaccess'), `RewriteEngine On
RewriteBase /app/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
`);

for (const f of ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png']) {
  if (existsSync(join(dir, f))) continue;
  const res = await fetch(`${iconsFrom}/${f}`);
  if (!res.ok) throw new Error(`Icône ${f} introuvable (${res.status})`);
  writeFileSync(join(dir, f), Buffer.from(await res.arrayBuffer()));
}
console.log(`PWA prête dans ${dir} (cache sw v${version}).`);
