// Service worker minimal de la racine — sert uniquement à rendre la landing
// installable (Chrome exige un SW actif sur le scope du manifest). L'app
// elle-même (/app/) a son propre service worker plus complet ; celui-ci ne
// doit surtout pas intercepter /app/ ou /api/, sous peine de conflit de scope.
const CACHE_NAME = 'mokineveto-landing-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Laisse passer l'app et l'API sans interception : ce SW ne gère que la landing.
  if (url.pathname.startsWith('/app/') || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
