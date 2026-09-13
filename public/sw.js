const CACHE_VERSION = "trafo-app-v9-pwa";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await Promise.all(SHELL.map(async (url) => {
        try {
          const res = await fetch(url, { cache: "reload" });
          if (res.ok) await cache.put(url, res);
        } catch {}
      }));
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("trafo-app-") && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        if (fresh.ok) {
          const cache = await caches.open(CACHE_VERSION);
          await cache.put(req, fresh.clone());
          await cache.put("/", fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch {
        return (await caches.match(req)) || (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req, { cache: "no-cache" });
        if (fresh.ok) (await caches.open(CACHE_VERSION)).put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch { return Response.error(); }
    })());
    return;
  }

  if (url.pathname === "/manifest.webmanifest" || /\.(?:png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-cache" });
        if (fresh.ok) (await caches.open(CACHE_VERSION)).put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch { return (await caches.match(req)) || Response.error(); }
    })());
    return;
  }

  event.respondWith((async () => {
    try { return await fetch(req, { cache: "no-cache" }); }
    catch { return (await caches.match(req)) || Response.error(); }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
