const CACHE_PREFIX = "bible-vision-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-v3`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-v3`;
const BIBLE_CACHE = `${CACHE_PREFIX}bibles-v2`;
const STRONG_CACHE = `${CACHE_PREFIX}strong-v1`;
const OFFLINE_URL = "/offline.html";
const CORE_ASSETS = ["/", "/offline.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                ![SHELL_CACHE, RUNTIME_CACHE, BIBLE_CACHE, STRONG_CACHE].includes(key),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const contentType = response.headers.get("content-type") || "";
          if (response.ok && contentType.includes("text/html")) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy)),
            );
          }
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || caches.match(OFFLINE_URL)),
    );
    return;
  }

  if (url.pathname.startsWith("/bibles/") || url.pathname.startsWith("/strong/")) {
    event.respondWith(
      caches
        .open(url.pathname.startsWith("/strong/") ? STRONG_CACHE : BIBLE_CACHE)
        .then(async (cache) => {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          const response = await fetch(event.request);
          if (response.ok) await cache.put(event.request, response.clone());
          return response;
        }),
    );
    return;
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then(async (response) => {
          if (response.ok) await cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached || Response.error());
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      return network;
    }),
  );
});
