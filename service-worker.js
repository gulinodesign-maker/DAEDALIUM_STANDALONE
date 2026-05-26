/* dDAE - Service Worker (PWA)
 * Build: 2.916
 * Aggiornamento iOS/GitHub Pages:
 * - cache name versionato a ogni build
 * - index/navigazioni sempre network-first
 * - asset principali JS/CSS/config/manifest sempre network-first
 * - nessuna cache per API/cross-origin/version.json
 * - cleanup automatico cache vecchie
 */

const BUILD = "2.916";
const CACHE_NAME = `dDAE-local-cache-${BUILD}`;
const APP_CACHE_PREFIX = "dDAE-local-cache-";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (key !== CACHE_NAME && (key.startsWith(APP_CACHE_PREFIX) || key.startsWith("dDAE-"))) {
        return caches.delete(key);
      }
      return Promise.resolve();
    }));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((client) => {
      try { client.postMessage({ type: "DDAE_SW_ACTIVATED", build: BUILD }); } catch (_) {}
    });
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isApiRequest(url) {
  const h = url.hostname;
  return (
    h.includes("script.google.com") ||
    h.includes("script.googleusercontent.com") ||
    h === "firestore.googleapis.com" ||
    h === "firebasestorage.googleapis.com" ||
    h === "identitytoolkit.googleapis.com" ||
    h === "securetoken.googleapis.com" ||
    h === "firebase.googleapis.com" ||
    h === "www.googleapis.com"
  );
}

function isMainAppAsset(url) {
  if (url.origin !== self.location.origin) return false;
  const p = url.pathname;
  return (
    p.endsWith("/index.html") ||
    p.endsWith("/app.js") ||
    p.endsWith("/styles.css") ||
    p.endsWith("/config.js") ||
    p.endsWith("/manifest.json") ||
    p === new URL(self.registration.scope).pathname
  );
}

async function networkFirst(req, options = {}) {
  const cache = await caches.open(CACHE_NAME);
  const request = new Request(req, { cache: "no-store" });
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && options.cache !== false) {
      await cache.put(req, fresh.clone());
      if (req.url !== request.url) {
        try { await cache.put(request, fresh.clone()); } catch (_) {}
      }
    }
    return fresh;
  } catch (err) {
    if (options.fallback !== false) {
      const cached = await cache.match(req) || await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (options.html) {
        const idx = await cache.match("./index.html") || await cache.match("./index.html", { ignoreSearch: true });
        if (idx) return idx;
      }
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  if (url.origin !== self.location.origin || isApiRequest(url)) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  const accept = req.headers.get("accept") || "";
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(networkFirst(req, { html: true }));
    return;
  }

  if (isMainAppAsset(url)) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(networkFirst(req));
});
