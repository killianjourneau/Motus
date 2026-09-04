/* Mot en Six — service worker */
const CACHE = "motus-v119";
const V = "1.50.3";   // doit correspondre au ?v= des <script> de index.html
const ASSETS = [
  "./",
  "./index.html",
  "./enfant.html",
  "./rpg.html",
  "./manifest.json",
  "./icons/icon-512.png",
  "./icons/icon-192.png",
  "./icons/icon-180.png",
  "./icons/apercu.png",
  "./profiles/config.js?v=" + V,
  "./profiles/profile.js?v=" + V,
  "./duel/duel.js?v=" + V,
  "./dico/motus-words.js?v=" + V,
  "./dico/motus-prenoms.js?v=" + V,
  "./dico/motus-prenoms-info.js?v=" + V,
  "./dico/motus-maladies.js?v=" + V,
  "./dico/motus-maladies-info.js?v=" + V,
  "./dico/motus-villes.js?v=" + V,
  "./dico/motus-villes-info.js?v=" + V,
  "./dico/motus-persos.js?v=" + V,
  "./dico/motus-persos-info.js?v=" + V,
  "./dico/motus-persos-split.js?v=" + V,
  "./dico/motus-race.js?v=" + V,
  "./dico/motus-expert.js?v=" + V,
  "./dico/motus-enfant.js?v=" + V,
  "./dico/motus-rpg.js?v=" + V,
  "./dico/dico-06.txt",
  "./dico/dico-07.txt",
  "./dico/dico-08.txt"
];

// Installation : app shell + dicos du mode par défaut
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// Activation : purge des anciens caches (dont les réponses d'API qui auraient
// pu être mises en cache par erreur dans une version précédente)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Ne JAMAIS intercepter les requêtes vers une autre origine (API Supabase,
  // etc.) : elles doivent toujours être servies fraîches par le réseau, sinon
  // le classement et les stats resteraient figés sur un ancien instantané.
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }

  // Scripts et manifeste : réseau d'abord (mise à jour immédiate), cache en secours.
  if (/\.(js|json)$/.test(url.pathname)) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Reste (dictionnaires .txt, icône) : cache d'abord, réseau en secours.
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

/* ---------------------------------------------------------------
   Notifications
   « push » n'est utile que si un serveur d'envoi est branché un jour
   (clés VAPID) ; le gestionnaire est prêt pour ce cas. En attendant,
   les notifications sont déclenchées par la page via showNotification,
   ce qui fonctionne sans aucune infrastructure.
   --------------------------------------------------------------- */
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(self.registration.showNotification(d.title || "Mot en Six", {
    body: d.body || "",
    icon: "./icons/icon-512.png",
    badge: "./icons/icon-512.png",
    tag: d.tag || "motus",
    data: { url: d.url || "./" }
  }));
});

/* Un appui sur la notification ramène sur l'onglet déjà ouvert plutôt
   que d'en empiler un nouveau. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate && c.navigate(cible); return c.focus(); }
      }
      return clients.openWindow ? clients.openWindow(cible) : null;
    })
  );
});
