/* Opt-in public caching only. School portals and other Pages projects are separate. */
const ROOT = new URL("./", self.location.href).href;
const ROOT_PATH = new URL(ROOT).pathname;
const CACHE = "mamss-public-v8:" + ROOT_PATH;
const SHELL = [
  "./",
  "index.html",
  "site.min.css?v=3",
  "site.min.js?v=3",
  "manifest.webmanifest",
  "assets/crest.webp",
  "assets/app-icon-192.png",
  "assets/app-icon-512.png",
  "assets/font-0.woff2",
  "assets/font-1.woff2",
  "assets/font-2.woff2",
  "assets/font-3.woff2",
  "assets/font-4.woff2",
  "assets/visit035.webp",
  "assets/visit035--480.webp",
  "assets/visit035--900.webp",
];
const shellPaths = new Set(SHELL.map((path) => new URL(path, ROOT).pathname));
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL.map((path) => new URL(path, ROOT).href));
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key === CACHE || !key.startsWith("mamss-public-")) continue;
        if (key.endsWith(":" + ROOT_PATH)) await caches.delete(key);
        else if (!key.includes(":")) {
          const old = await caches.open(key);
          let removed = false;
          for (const request of await old.keys()) {
            const url = new URL(request.url);
            if (
              url.origin === self.location.origin &&
              url.pathname.startsWith(ROOT_PATH)
            ) {
              await old.delete(request);
              removed = true;
            }
          }
          if (removed && !(await old.keys()).length) await caches.delete(key);
        }
      }
      await self.clients.claim();
    })(),
  );
});
let offlineDisabled = false;
self.addEventListener("message", (event) => {
  if (event.data?.type === "DISABLE_OFFLINE") offlineDisabled = true;
});
self.addEventListener("fetch", (event) => {
  if (offlineDisabled) return;
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(ROOT_PATH)
  )
    return;
  const isHome =
    url.pathname === ROOT_PATH || url.pathname === ROOT_PATH + "index.html";
  const isAsset =
    url.pathname.startsWith(ROOT_PATH + "assets/") &&
    /\.(webp|png|woff2)$/.test(url.pathname);
  const isOptional =
    url.pathname === ROOT_PATH + "motion.js" ||
    url.pathname === ROOT_PATH + "motion.css";
  if (!isHome && !isAsset && !isOptional && !shellPaths.has(url.pathname))
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE),
        key = isHome ? new URL("index.html", ROOT).href : url.href;
      // Runtime files use network-first to avoid a new HTML shell receiving old scripts.
      // Public media/fonts can safely be cache-first between versioned releases.
      if (isAsset) {
        const cached = await cache.match(request);
        if (cached) return cached;
      }
      try {
        const fresh = await fetch(request);
        if (!offlineDisabled && fresh.ok && fresh.type === "basic") {
          const copy = fresh.clone();
          event.waitUntil(cache.put(key, copy).catch(() => {}));
        }
        if (fresh.status >= 500) return (await cache.match(key)) || fresh;
        return fresh;
      } catch {
        return (await cache.match(key)) || Response.error();
      }
    })(),
  );
});
