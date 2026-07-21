/* Motus — service worker */
const CACHE = "motus-v25";
const V = "1.7.0";   // doit correspondre au ?v= des <script> de index.html
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-512.png",
  "./profiles/config.js?v=" + V,
  "./profiles/profile.js?v=" + V,
  "./dico/motus-words.js?v=" + V,
  "./dico/motus-prenoms.js?v=" + V,
  "./dico/motus-maladies.js?v=" + V,
  "./dico/motus-villes.js?v=" + V,
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

  // Les scripts et le manifeste passent par le réseau en priorité :
  // une mise à jour est ainsi prise en compte immédiatement, le cache ne
  // servant que de secours hors-ligne.
  const url = new URL(req.url);
  if (url.origin === location.origin && /\.(js|json)$/.test(url.pathname)) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
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
