const CACHE = "bangkok-rail-daily-v10";
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["./bangkok-rail-map.webp"])));
});
self.addEventListener("activate", (event) => event.waitUntil(
  caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request, { cache: "no-store" }).catch(() => caches.match("./")));
    return;
  }
  if (new URL(event.request.url).pathname.endsWith("/service-alerts.json")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((response) => response || caches.match("./"))));
});
