// ZSOPO Ops service worker (scope /ops/). App shell + allow-listed read pages for offline use.
// Never caches auth, API, admin, guest receipts, identity documents, payments or ledger.
const PAGE_CACHE = "ops-pages-v1";
const STATIC_CACHE = "ops-static-v1";
const OFFLINE_PAGES = [/^\/ops\/?$/, /^\/ops\/buong-phong(\/[0-9a-f-]{36})?\/?$/, /^\/ops\/huong-dan\/?$/];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("ops-") && ![PAGE_CACHE, STATIC_CACHE].includes(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "purge") event.waitUntil(Promise.all([caches.delete(PAGE_CACHE), caches.delete(STATIC_CACHE)]));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Versioned build assets: cache-first (immutable file names).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.open(STATIC_CACHE).then(async (c) => (await c.match(req)) || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; })));
    return;
  }

  // Full-page navigations of allow-listed Ops pages: network-first, fall back to the last copy.
  const isNav = req.mode === "navigate" && !req.headers.get("RSC");
  if (isNav && OFFLINE_PAGES.some((re) => re.test(url.pathname))) {
    event.respondWith((async () => {
      const cache = await caches.open(PAGE_CACHE);
      try {
        const res = await fetch(req);
        if (res.ok && !res.redirected) cache.put(url.pathname, res.clone());
        return res;
      } catch {
        return (await cache.match(url.pathname)) || new Response("<!doctype html><meta charset=utf-8><title>Mất kết nối</title><p>Trang này chưa được tải trước khi mất mạng.</p>", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    })());
  }
});
