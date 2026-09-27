// Jual Rumah Property Admin — Service Worker Cache Purge & Auto-Update
const CACHE_NAME = "jaksel-admin-v2-purge";

// Install: Immediately take over without waiting
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate: Delete all old caches and claim all clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            console.log("[SW] Deleting stale cache:", name);
            return caches.delete(name);
          })
        );
      })
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => {
        clients.forEach((client) => {
          if ("navigate" in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});

// Fetch: Pass through directly to network without caching to guarantee live code
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
