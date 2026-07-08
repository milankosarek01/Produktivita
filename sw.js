// Service worker – ukládá aplikaci do mezipaměti, aby fungovala offline.
// Při změně souborů stačí zvýšit číslo verze níže.
const VERZE = 'produktivita-v1';

const SOUBORY = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', udalost => {
  udalost.waitUntil(
    caches.open(VERZE).then(cache => cache.addAll(SOUBORY)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', udalost => {
  udalost.waitUntil(
    caches.keys()
      .then(klice => Promise.all(klice.filter(k => k !== VERZE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Strategie: nejdřív zkusit síť (aby se stáhly novinky), při výpadku použít mezipaměť.
self.addEventListener('fetch', udalost => {
  if (udalost.request.method !== 'GET') return;
  udalost.respondWith(
    fetch(udalost.request)
      .then(odpoved => {
        const kopie = odpoved.clone();
        caches.open(VERZE).then(cache => cache.put(udalost.request, kopie));
        return odpoved;
      })
      .catch(() =>
        caches.match(udalost.request).then(z => z || caches.match('./index.html'))
      )
  );
});
