/* Yardstick service worker — offline app shell + runtime caching.
   Bump CACHE when the shell changes so old caches are cleaned up on activate. */
const CACHE = 'yardstick-v3';
const CORE = [
  './',
  './index.html',
  './core.js',
  './qa-agent.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './vendor/pdf.min.js',
  './vendor/pdf.worker.min.js',
  './vendor/xlsx.bundle.js',
  './vendor/jspdf.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // cache each core asset independently so one 404 can't abort the whole install
    await Promise.allSettled(CORE.map(u => c.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navigations: network-first so updates land, falling back to the cached shell offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(CACHE); c.put(req, net.clone());
        return net;
      } catch (err) {
        return (await caches.match(req)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Static assets + CDN libs (pdf.js / xlsx / jsPDF): stale-while-revalidate.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const net = fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) { caches.open(CACHE).then(c => c.put(req, r.clone())); }
      return r;
    }).catch(() => cached);
    return cached || net;
  })());
});
