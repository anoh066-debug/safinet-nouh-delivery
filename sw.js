const CACHE_NAME = "safinet-shell-v15";
const APP_SHELL = ["/", "/manifest.json", "/icon.svg", "/safinet-noah-icon(1).png?v=6", "/home-screen.jpg.jpg", ];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put("/", response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match(request)) || (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  if (["script", "style", "image", "font"].includes(request.destination)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match(request)) || Response.error();
      }
    })());
  }
});

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (_) {}
    await self.registration.showNotification(data.title || "سفينة نوح دليفري", {
      body: data.body || "لديك تحديث جديد بخصوص طلب التوصيل.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: data.tag || "safinet-notification",
      renotify: true,
      data: { url: data.url || "/" }
    });
  })());
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
