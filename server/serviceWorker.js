/* global SHELL_VERSION, SHELL_PATHS */
const cachePrefix = "elevatorfinder-shell-";
const cacheName = cachePrefix + SHELL_VERSION;
const shellPaths = new Set(SHELL_PATHS);

self.addEventListener("install", (event) => {
  const requests = SHELL_PATHS.map((path) => new Request(path, { cache: "reload" }));
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(requests)));
});

// Wait for the previous version's windows to close before replacing their assets.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith(cachePrefix) && key !== cacheName)
      .map((key) => caches.delete(key)),
  )));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isAppLaunch = request.mode === "navigate" && (url.pathname === "/" || url.pathname === "/index.html");
  const path = isAppLaunch ? "/index.html" : url.pathname;
  if (!shellPaths.has(path)) return;

  event.respondWith(caches.open(cacheName)
    .then((cache) => cache.match(path))
    .then((cached) => cached || fetch(request)));
});
