const CACHE_NAME = "fire-competition-score-v1";
const OFFLINE_URL = "./fire-competition-score.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "./fire-competition-score.webmanifest",
  "./fire-score-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(OFFLINE_URL, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          const cache = await caches.open(CACHE_NAME);
          const cachedPage =
            (await cache.match(event.request, { ignoreSearch: true })) ||
            (await cache.match(OFFLINE_URL, { ignoreSearch: true }));

          if (cachedPage) {
            return cachedPage;
          }

          return new Response("Offline and page not cached yet.", {
            status: 503,
            headers: { "Content-Type": "text/plain" }
          });
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) {
        return cached;
      }

      try {
        const networkResponse = await fetch(event.request);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (error) {
        const fallback = await cache.match(OFFLINE_URL, { ignoreSearch: true });
        return fallback || Response.error();
      }
    })()
  );
});
