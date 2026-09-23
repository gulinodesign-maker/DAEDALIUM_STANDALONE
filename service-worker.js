/* Music Rainbow Service Worker - Build 2.038 */
const BUILD = "2.038";
const PRECACHE = `music-rainbow-precache-${BUILD}`;
const RUNTIME = `music-rainbow-runtime-${BUILD}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./Assets/Home-rainbow-main.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

// Install: precache + activate subito
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: cleanup + claim
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith("music-rainbow-") && k !== PRECACHE && k !== RUNTIME)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Supporta richiesta client per saltare l'attesa
self.addEventListener("message", event => {
  const data = event.data || {};
  if (data && data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const res = await fetch(request);
  if (res && res.ok) {
    const cache = await caches.open(RUNTIME);
    cache.put(request, res.clone());
  }
  return res;
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const cache = await caches.open(PRECACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch (e) {
    // Prova cache match (ignora query per navigazioni)
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // Fallback SPA: index.html
    const indexCached = await caches.match("./index.html");
    if (indexCached) return indexCached;

    throw e;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(res => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);

  return cached || (await fetchPromise) || new Response("", { status: 504, statusText: "Offline" });
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Navigazioni/documenti: network-first (aggiornamenti affidabili)
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Google Fonts: stale-while-revalidate
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Stessa origin: cache-first per asset
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Altri cross-origin: passa-through
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
