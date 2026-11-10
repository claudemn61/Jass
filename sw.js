// ── Jass Service Worker ─────────────────────────────────────────────────
// "Network-first, Cache-Fallback" wie bei Tauchbuch: online immer die
// neueste Version, offline die zuletzt geladene aus dem Cache (inkl. der
// React/Babel-Bibliotheken vom CDN).
// CACHE_VERSION nur bei neuen/entfernten Dateien erhöhen.
const CACHE_VERSION = "v2";
const CACHE_NAME = `jass-cache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "index.html", "jass.jsx", "engine.js", "manifest.json",
  "apple-touch-icon.png", "icon-192.png", "icon-512.png", "favicon-32.png", "filz.jpg", "schiefer.jpg",
  "https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js",
  "https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(PRECACHE_URLS.map((url) =>
        fetch(url, url.startsWith("http") ? { mode: "cors" } : { mode: "same-origin" })
          .then((res) => { if (res && res.ok) return cache.put(url, res); })
          .catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  const isOwnFile = url.origin === self.location.origin;
  event.respondWith(
    fetch(req, isOwnFile ? { cache: "no-store" } : undefined).then((response) => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
      }
      return response;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((c) => c || Response.error()))
  );
});
