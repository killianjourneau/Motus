/* Motus — service worker */
const CACHE = "motus-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./rebus.html",
  "./icons/icon-512.png",
  "./profiles/config.js",
  "./profiles/profile.js",
  "./dico/dico-06.txt",
  "./dico/dico-07.txt",
  "./dico/dico-08.txt"
];

// Installation : app shell + dicos du mode par défaut
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// Activation : purge des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache d'abord, réseau en secours. Les dicos des autres modes
// (court / long) sont mis en cache à la volée dès leur premier chargement.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});
