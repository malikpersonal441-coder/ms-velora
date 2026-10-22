/* MS Velora service worker: installable app, fast repeat loads, push notifications. */
const VERSION = 'msv-v8';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const IMAGE_CACHE = `${VERSION}-images`;
const PRECACHE = ['/', '/site.webmanifest', '/admin.webmanifest', '/brand/logo.jpg', '/brand/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const trimCache = async (name, max) => {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache the API or admin data â€” always live
  if (url.pathname.startsWith('/api/')) return;

  // Pages: network first (fresh content), fall back to cache when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Hashed build assets + brand files: cache first (they never change in place)
  if (url.origin === location.origin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/brand/'))) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Product photos from the image CDN: stale-while-revalidate, capped
  if (url.hostname === 'images.unsplash.com' || url.hostname === 'res.cloudinary.com') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') {
              cache.put(req, res.clone());
              trimCache(IMAGE_CACHE, 120);
            }
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
  }
});

// â”€â”€ Push notifications â”€â”€
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'MS Velora', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'MS Velora';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: data.icon || '/brand/icon-192.png',
      badge: data.badge || '/brand/favicon-32.png',
      image: data.image,
      tag: data.tag,
      renotify: Boolean(data.tag),
      requireInteraction: Boolean(data.urgent),
      vibrate: data.urgent ? [400, 150, 400, 150, 400, 150, 800] : undefined,
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url === target && 'focus' in w) return w.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
