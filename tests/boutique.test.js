/* ===================================================================
   Boutique du chat : catalogue, dessins, et surtout l'économie.
   Les jetons d'indice se gagnent en jouant : un achat ne doit jamais en
   faire perdre ni en faire gagner, même entre deux appareils.
   =================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const { demarrer, dispo } = require("./harness");

module.exports = async function ({ groupe, verifie, ignore, ok, egal, vide, RACINE }) {
  const lire = (f) => fs.readFileSync(path.join(RACINE, f), "utf8");

  /* boutique.js et chat.js chargés dans une fenêtre minimale */
  function charger() {
    const el = () => ({ style:{}, classList:{ toggle(){}, contains(){ return false; }, add(){}, remove(){} },
                        appendChild(){}, addEventListener(){}, querySelector(){ return null; } });
    const d = { getElementById: () => null, createElement: el, head: el(), body: el(),
                documentElement: el(), currentScript: null, querySelectorAll: () => [] };
    const memoire = {};
    const w = { localStorage: { getItem: k => (k in memoire ? memoire[k] : null), setItem: (k, v) => { memoire[k] = String(v); } } };
    new Function("window", "document", "localStorage", lire("boutique/chat.js"))(w, d, w.localStorage);
    // dans un navigateur, ChatNoir est global ; ici on le fournit explicitement
    new Function("window", "document", "localStorage", "ChatNoir", lire("boutique/boutique.js"))(w, d, w.localStorage, w.ChatNoir);
    return w;
  }

  // ------------------------------------------------------------------
  groupe("Boutique — catalogue");

  let W = null;
  try { W = charger(); } catch (e) { W = { erreur: e.message }; }

  verifie("les deux fichiers se chargent sans erreur", () => {
    ok(W && !W.erreur, W && W.erreur);
    ok(W.Boutique && W.ChatNoir, "Boutique ou ChatNoir absent");
  });

  verifie("chaque objet a un identifiant unique, un prix entier et un emplacement connu", () => {
    const C = W.Boutique.catalogue, vus = new Set(), soucis = [];
    const SLOTS = [null, "tete", "yeux", "bouche", "cou", "dos", "maison"];
    C.forEach(o => {
      if (vus.has(o.id)) soucis.push(o.id + " en double"); vus.add(o.id);
      if (!Number.isInteger(o.prix) || o.prix <= 0) soucis.push(o.id + " : prix " + o.prix);
      if (!SLOTS.includes(o.slot)) soucis.push(o.id + " : emplacement " + o.slot);
    });
    ok(C[0].id === "chat", "l'adoption doit rester le premier objet");
    vide(soucis);
  });

  verifie("chaque objet a son dessin (rien d'invisible à la vente)", () => {
    vide(W.Boutique.catalogue.filter(o => !/<svg/.test(W.ChatNoir.vignette(o.id))).map(o => o.id));
  });

  verifie("un accessoire porté apparaît bien sur le chat", () => {
    const sans = W.ChatNoir.svg("assis", {}, {});
    const manque = W.Boutique.catalogue.filter(o => o.slot && o.slot !== "maison").filter(o => {
      const p = {}; p[o.slot] = o.id;
      return W.ChatNoir.svg("assis", p, {}) === sans;
    }).map(o => o.id);
    vide(manque, "accessoires sans effet sur le dessin");
  });

  verifie("le badge « Chat royal » vise le bon nombre d'objets", () => {
    const m = lire("profiles/profile.js").match(/id:"chatTout"[\s\S]*?objetsChat\(s\);\}, (\d+)\]/);
    ok(m, "badge chatTout introuvable");
    egal(+m[1], W.Boutique.catalogue.length - 1);
  });

  verifie("boutique et chat fonctionnent hors ligne (cache) et sont chargés par le jeu", () => {
    const sw = lire("sw.js"), idx = lire("index.html");
    ok(sw.includes('"./boutique/boutique.js?v="'), "boutique.js absent du cache");
    ok(sw.includes('"./boutique/chat.js?v="'), "chat.js absent du cache");
    ok(/<script src="\.\/boutique\/boutique\.js\?v=[\d.]+"><\/script>/.test(idx), "boutique.js non chargé par index.html");
    // le pont doit être défini AVANT le chargement de la boutique
    ok(idx.indexOf("window.MotusPont") < idx.indexOf('src="./boutique/boutique.js'), "MotusPont défini après la boutique");
  });

  verifie("fusion entre appareils : achats réunis, choix le plus récent", () => {
    const f = W.Boutique.fusion(
      { objets:{ chat:5, sorciere:6 }, porte:{ tete:"sorciere" }, porteAt:100, nom:"Minuit", nomAt:0 },
      { objets:{ chat:5, cape:8 },     porte:{ dos:"cape" },      porteAt:200, nom:"Réglisse", nomAt:50 });
    egal(JSON.stringify(Object.keys(f.objets).sort()), JSON.stringify(["cape", "chat", "sorciere"]));
    egal(f.objets.chat, 5, "un objet commun n'est compté qu'une fois");
    egal(JSON.stringify(f.porte), JSON.stringify({ dos:"cape" }));
    egal(f.nom, "Réglisse");
  });

  // ------------------------------------------------------------------
  groupe("Boutique — jetons");

  if (!dispo()) { ignore("économie de jetons", "jsdom absent — lance : npm install"); return; }

  async function partie(stock) {
    const app = demarrer({ stockage: Object.assign({ "motus.seen":"true", "motus.tour":"true" }, stock || {}) });
    await app.attendre(80);
    app.w.eval(lire("boutique/boutique.js"));
    return app;
  }

  verifie("le solde déduit les achats, sans jamais rien stocker de plus", async () => {
    const app = await partie({ "motus.hintEarned":"20", "motus.hintSpent":"3" });
    const P = app.w.MotusPont, B = app.w.Boutique;
    egal(P.jetons(), 17);
    ok(B.acheter("chat"), "adoption refusée");
    egal(P.jetons(), 12);
    ok(B.acheter("sorciere"), "achat refusé");
    egal(P.jetons(), 6);
    egal(app.memoire["motus.hintSpent"], "3", "les achats ne touchent pas aux indices utilisés");
  });

  verifie("pas d'achat à crédit, pas d'accessoire avant l'adoption, pas de double paiement", async () => {
    const app = await partie({ "motus.hintEarned":"8", "motus.hintSpent":"0" });
    const P = app.w.MotusPont, B = app.w.Boutique;
    ok(!B.acheter("sorciere"), "accessoire acheté sans chat");
    ok(B.acheter("chat"));
    ok(!B.acheter("chat"), "chat payé deux fois");
    ok(!B.acheter("couronne"), "achat à crédit (15 jetons pour 3)");
    egal(P.jetons(), 3);
  });

  verifie("un achat fait sur un autre appareil est déduit ici aussi", async () => {
    const app = await partie({ "motus.hintEarned":"30", "motus.hintSpent":"0",
      "motus.boutique": JSON.stringify({ objets:{ chat:5 } }) });
    const P = app.w.MotusPont;
    egal(P.jetons(), 25);
    app.w.motusBoutiqueRefresh({ objets:{ chat:5, couronne:15 }, porte:{ tete:"couronne" }, porteAt: Date.now() });
    egal(P.jetons(), 10);
    ok(app.w.Boutique.possede("couronne"));
  });

  verifie("un solde à zéro n'empêche pas de voir et d'essayer", async () => {
    const app = await partie({ "motus.hintEarned":"0", "motus.hintSpent":"0" });
    egal(app.w.MotusPont.jetons(), 0);
    ok(!app.w.Boutique.acheter("chat"));
    egal(app.w.MotusPont.jetons(), 0, "le solde ne passe jamais sous zéro");
  });
};
