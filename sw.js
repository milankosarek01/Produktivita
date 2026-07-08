// Service worker – ukládá aplikaci do mezipaměti, aby fungovala offline.
// Při změně souborů stačí zvýšit číslo verze níže.
const VERZE = 'produktivita-v3';

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

// Push notifikace ze serveru – zobrazí se i při zamčeném telefonu / zavřené aplikaci
self.addEventListener('push', udalost => {
  let data = {};
  try { data = udalost.data.json(); } catch (e) { /* prázdná zpráva */ }
  udalost.waitUntil(
    self.registration.showNotification(data.titulek || 'Produktivita', {
      body: data.text || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      vibrate: [200, 100, 200],
    })
  );
});

// Klepnutí na notifikaci otevře (nebo vyzvedne) aplikaci
self.addEventListener('notificationclick', udalost => {
  udalost.notification.close();
  udalost.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(okna => {
      if (okna.length) return okna[0].focus();
      return clients.openWindow('./');
    })
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
