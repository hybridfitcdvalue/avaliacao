/* HYBRID Fit — Service Worker
   Estratégia: cache-first para os arquivos do app (funciona
   offline). Ao publicar uma nova versão, altere CACHE_VERSION
   — o app instalado se atualiza sozinho na próxima abertura. */
const CACHE_VERSION = 'hybridfit-v1';
const ASSETS = [
  './',
  './index.html',
  './js/db.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((resp) => {
          // guarda cópia dos GETs de mesma origem (ex.: fontes já em cache)
          const copy = resp.clone();
          if (resp.ok && new URL(request.url).origin === self.location.origin) {
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => cached);
    })
  );
});
