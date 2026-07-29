const CACHE = "bangkok-rail-daily-v13";
try {
  importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js");
  firebase.initializeApp({
    apiKey: "AIzaSyBRy3AHKwcNXwjTljjV0U4rWdxoF6KBTtw",
    authDomain: "bangkok-rail-daily-ee38c.firebaseapp.com",
    projectId: "bangkok-rail-daily-ee38c",
    storageBucket: "bangkok-rail-daily-ee38c.firebasestorage.app",
    messagingSenderId: "5389290383",
    appId: "1:5389290383:web:babc8965e8eb6cbdb0d9fa",
  });
  firebase.messaging().onBackgroundMessage((payload) => {
    const title = payload?.data?.title || "Bangkok Rail Daily";
    self.registration.showNotification(title, {
      body: payload?.data?.body || "มีประกาศการเดินรถไฟฟ้าล่าสุด",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      data: { url: payload?.data?.url || "./" },
      tag: payload?.data?.tag || "rail-alert",
    });
  });
} catch (error) {
  console.warn("Firebase messaging unavailable", error);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "./"));
});
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
  if (/\/(service-alerts|environment-status)\.json$/.test(new URL(event.request.url).pathname)) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((response) => response || caches.match("./"))));
});
