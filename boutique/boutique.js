/* Mot en Six — la boutique du chat
 *
 * Contre des jetons d'indice, on adopte un chat noir, puis on lui offre
 * chapeaux, capes, jouets… Le chat (boutique/chat.js) vit au-dessus de la
 * grille : il n'apporte rien au jeu, il se regarde.
 *
 * ── Les jetons ne peuvent ni se dupliquer ni se perdre ──────────────────
 * Le solde n'est jamais stocké. Le jeu le calcule :
 *     jetons gagnés − indices utilisés − prix des objets possédés.
 * Les objets possédés forment un ensemble (chaque objet une seule fois,
 * avec le prix payé). Entre deux appareils, on réunit les deux ensembles :
 * un achat fait sur chacun est compté une fois, et un même objet acheté
 * deux fois hors ligne n'est payé qu'une fois.
 *
 * ── Ajouter un objet ────────────────────────────────────────────────────
 *  1. Une ligne dans CATALOGUE ci-dessous.
 *  2. Son dessin dans boutique/chat.js (ACC pour la tête, ou la maison).
 *  Ne jamais changer l'identifiant d'un objet déjà vendu.
 *
 * ── Calendrier de l'avent (noel/avent.js) ───────────────────────────────
 * Il s'appuie sur le même ensemble d'objets, ce qui le synchronise sans
 * rien ajouter : « avent-07 » = case 7 débloquée (au prix payé, 0 le jour
 * même), « avent-07-j » = case jouée, « avent-07-ok » = mot trouvé. Ses
 * cadeaux (bonnet, Aube…) sont des objets à 0 jeton, offerts une fois.
 * Les rattrapages payés comptent donc dans les dépenses, comme un achat.
 *
 * ── Les croquettes (v2.9) ───────────────────────────────────────────────
 * Une réserve commune à tous les chats, synchronisée comme les jetons :
 *   réserve = gains − repas.
 * Les gains sont rangés par clé (« vic:<appareil> » pour les mots trouvés
 * sur cet appareil, « avent-07 » pour une case, « depart », « adopte:aube »…)
 * et fusionnés au maximum par clé : jamais comptés deux fois. Les repas
 * aussi (« minuit:2026-12-07 ») : un chat ne mange qu'une fois par jour,
 * même s'il est affiché sur deux appareils.
 * La réserve plafonne à 255 (comme les jetons). Chaque chat affiché mange 1 croquette par jour. Réserve vide : il reste à
 * la maison jusqu'au prochain mot trouvé. S'il n'y a pas de quoi nourrir
 * tout le monde, le plus complice mange d'abord (à égalité : au hasard).
 */
(function () {
  "use strict";

  var CATALOGUE = [
    { id: "chat",       slot: null,     nom: "Minuit, le chat noir",   prix: 5 },
    { id: "sorciere",   slot: "tete",   nom: "Chapeau de sorcière",    prix: 6 },
    { id: "citrouille", slot: "tete",   nom: "Chapeau citrouille",     prix: 6 },
    { id: "noeud",      slot: "tete",   nom: "Nœud rose",              prix: 3 },
    { id: "couronne",   slot: "tete",   nom: "Couronne",               prix: 15 },
    { id: "lunettes",   slot: "yeux",   nom: "Lunettes rondes",        prix: 5 },
    { id: "masque",     slot: "yeux",   nom: "Masque de bal",          prix: 6 },
    { id: "vampire",    slot: "bouche", nom: "Dents de vampire",       prix: 4 },
    { id: "sucette",    slot: "bouche", nom: "Sucette",                prix: 3 },
    { id: "grelot",     slot: "cou",    nom: "Collier à grelot",       prix: 3 },
    { id: "papillon",   slot: "cou",    nom: "Nœud papillon",          prix: 4 },
    { id: "echarpe",    slot: "cou",    nom: "Écharpe rayée",          prix: 5 },
    { id: "medaille",   slot: "cou",    nom: "Médaille d'amitié",      prix: 0, cadeau: true, d: "Offerte par ton chat" },
    { id: "cape",       slot: "dos",    nom: "Cape de vampire",        prix: 8 },
    { id: "ailes",      slot: "dos",    nom: "Ailes de chauve-souris", prix: 10 },
    { id: "coussin",    slot: "maison", nom: "Coussin moelleux",       prix: 4, d: "Pour ses siestes" },
    { id: "pelote",     slot: "maison", nom: "Pelote de laine",        prix: 4, d: "Son jouet préféré" },
    { id: "souris",     slot: "maison", nom: "Souris en peluche",      prix: 3, d: "À chasser" },
    { id: "gamelle",    slot: "maison", nom: "Gamelle poisson",        prix: 3, d: "Pour ses repas" },
    { id: "lanterne",   slot: "maison", nom: "Citrouille lanterne",    prix: 5, d: "Au coin de la grille" },
    // — Noël : en vente —
    { id: "lutin",      slot: "tete",   nom: "Bonnet de lutin",        prix: 6, noel: true },
    { id: "nez",        slot: "bouche", nom: "Nez de renne",           prix: 4, noel: true },
    { id: "clochette",  slot: "cou",    nom: "Clochette dorée",        prix: 4, noel: true },
    { id: "chaussette", slot: "maison", nom: "Chaussette de Noël",     prix: 4, noel: true, d: "Au coin de la grille" },
    // — Noël : cadeaux du calendrier de l'avent (case indiquée) —
    { id: "aube",       slot: null,     nom: "Aube, la chatte blanche", prix: 0, cadeau: true, avent: 18, d: "Arrive avec le calendrier" },
    { id: "bonnet",     slot: "tete",   nom: "Bonnet de Noël",         prix: 0, cadeau: true, avent: 3,  noel: true },
    { id: "sucreOrge",  slot: "bouche", nom: "Sucre d'orge",           prix: 0, cadeau: true, avent: 6,  noel: true },
    { id: "boule",      slot: "maison", nom: "Boule de Noël",          prix: 0, cadeau: true, avent: 9,  noel: true, d: "Un jouet qui roule" },
    { id: "rennes",     slot: "tete",   nom: "Bois de renne",          prix: 0, cadeau: true, avent: 12, noel: true },
    { id: "echarpeNoel",slot: "cou",    nom: "Écharpe de laine",       prix: 0, cadeau: true, avent: 15, noel: true },
    { id: "manteau",    slot: "dos",    nom: "Manteau du Père Noël",   prix: 0, cadeau: true, avent: 21, noel: true },
    { id: "sapin",      slot: "maison", nom: "Petit sapin illuminé",   prix: 0, cadeau: true, avent: 24, noel: true, d: "Au coin de la grille" }
  ];
  var ONGLETS = [["tete", "Tête"], ["yeux", "Yeux"], ["bouche", "Bouche"], ["cou", "Cou"], ["dos", "Dos"], ["maison", "Maison"]];
  var PAR_ID = {};
  CATALOGUE.forEach(function (o) { PAR_ID[o.id] = o; });

  /* La complicité se gagne en jouant avec lui, jour après jour (jamais en
     jetons). Chaque niveau lui apprend une nouvelle attention. */
  var NIVEAUX = [
    { min: 0,   nom: "Nouveau venu", d: "Il se promène, dort, joue et mange au-dessus de ta grille." },
    { min: 10,  nom: "Copain",       d: "Il te fait la fête quand tu reviens, et te console quand tu perds." },
    { min: 30,  nom: "Ami",          d: "Il te suit quand tu écris, et t'apporte de petits cadeaux." },
    { min: 60,  nom: "Complice",     d: "Il vient s'installer près de ta case quand tu réfléchis." },
    { min: 100, nom: "Inséparable",  d: "Il t'offre sa médaille d'amitié." }
  ];
  // au féminin pour Aube (seule) : « ton amie », « ta complice »…
  function nomNiveau(n, fem) {
    var nom = NIVEAUX[n - 1].nom;
    if (!fem) return nom;
    return { "Nouveau venu": "Nouvelle venue", "Copain": "Copine", "Ami": "Amie" }[nom] || nom;
  }
  function niveauDe(c) { var n = 1; NIVEAUX.forEach(function (v, i) { if (c >= v.min) n = i + 1; }); return n; }

  var CLE = "motus.boutique";
  var P = function () { return window.MotusPont || {}; };

  /* ---------- état ---------- */
  function videAube() { return { porte: {}, porteAt: 0, nom: "Aube", nomAt: 0, visible: true, visibleAt: 0, complicite: 0 }; }
  function vide() { return { objets: {}, porte: {}, porteAt: 0, nom: "Minuit", nomAt: 0, visible: true, visibleAt: 0, complicite: 0, aube: videAube(),
                             croq: { gains: {}, repas: {} }, bonus: {}, pates: {} }; }
  // une table clé → nombre positif (les gains de croquettes)
  function nombres(src) {
    var r = {};
    if (src && typeof src === "object") Object.keys(src).forEach(function (k) { var n = +src[k]; if (n > 0 && isFinite(n)) r[k] = Math.floor(n); });
    return r;
  }
  /* tenue, nom et affichage d'Aube : mêmes règles que pour Minuit */
  function normaliserAube(e) {
    var v = videAube();
    if (!e || typeof e !== "object") return v;
    if (e.porte && typeof e.porte === "object") v.porte = Object.assign({}, e.porte);
    ["porteAt", "nomAt", "visibleAt"].forEach(function (k) { if (typeof e[k] === "number") v[k] = e[k]; });
    if (typeof e.nom === "string" && e.nom.trim()) v.nom = e.nom.slice(0, 14);
    if (typeof e.visible === "boolean") v.visible = e.visible;
    if (typeof e.complicite === "number" && e.complicite >= 0 && isFinite(e.complicite)) v.complicite = Math.floor(e.complicite);
    return v;
  }
  function lire() {
    var e = null;
    try { e = JSON.parse(localStorage.getItem(CLE)); } catch (x) {}
    return normaliser(e);
  }
  function normaliser(e) {
    var v = vide();
    if (!e || typeof e !== "object") return v;
    if (e.objets && typeof e.objets === "object") {
      Object.keys(e.objets).forEach(function (k) { var p = +e.objets[k]; if (p >= 0 && isFinite(p)) v.objets[k] = p; });
    }
    if (e.porte && typeof e.porte === "object") v.porte = Object.assign({}, e.porte);
    ["porteAt", "nomAt", "visibleAt"].forEach(function (k) { if (typeof e[k] === "number") v[k] = e[k]; });
    if (typeof e.nom === "string" && e.nom.trim()) v.nom = e.nom.slice(0, 14);
    if (typeof e.visible === "boolean") v.visible = e.visible;
    if (typeof e.complicite === "number" && e.complicite >= 0 && isFinite(e.complicite)) v.complicite = Math.floor(e.complicite);
    v.aube = normaliserAube(e.aube);
    var c = e.croq || {};
    v.croq = { gains: nombres(c.gains), repas: (c.repas && typeof c.repas === "object") ? Object.assign({}, c.repas) : {} };
    if (e.bonus && typeof e.bonus === "object") Object.keys(e.bonus).forEach(function (k) { if (e.bonus[k] && typeof e.bonus[k] === "object") v.bonus[k] = Object.assign({}, e.bonus[k]); });
    if (e.pates && typeof e.pates === "object") v.pates = Object.assign({}, e.pates);
    return v;
  }
  /* Réunit deux états : objets en union, choix (tenue, nom, affichage) au plus récent. */
  function fusion(a, b) {
    a = normaliser(a); b = normaliser(b);
    Object.keys(b.objets).forEach(function (k) { if (!(k in a.objets)) a.objets[k] = b.objets[k]; });
    if (b.porteAt > a.porteAt) { a.porte = b.porte; a.porteAt = b.porteAt; }
    if (b.nomAt > a.nomAt) { a.nom = b.nom; a.nomAt = b.nomAt; }
    if (b.visibleAt > a.visibleAt) { a.visible = b.visible; a.visibleAt = b.visibleAt; }
    a.complicite = Math.max(a.complicite, b.complicite);
    var x = a.aube, y = b.aube;
    if (y.porteAt > x.porteAt) { x.porte = y.porte; x.porteAt = y.porteAt; }
    if (y.nomAt > x.nomAt) { x.nom = y.nom; x.nomAt = y.nomAt; }
    if (y.visibleAt > x.visibleAt) { x.visible = y.visible; x.visibleAt = y.visibleAt; }
    x.complicite = Math.max(x.complicite, y.complicite);
    // croquettes : gains au maximum par clé, repas, bonus et pâtées en union
    Object.keys(b.croq.gains).forEach(function (k) { a.croq.gains[k] = Math.max(a.croq.gains[k] || 0, b.croq.gains[k]); });
    Object.keys(b.croq.repas).forEach(function (k) { if (!(k in a.croq.repas)) a.croq.repas[k] = b.croq.repas[k]; });
    Object.keys(b.bonus).forEach(function (k) { if (!(k in a.bonus)) a.bonus[k] = b.bonus[k]; });
    Object.keys(b.pates).forEach(function (k) { if (!(k in a.pates)) a.pates[k] = b.pates[k]; });
    return a;
  }

  var etat = lire();
  if (window.Profile && Profile.state && Profile.state.boutique) etat = fusion(etat, Profile.state.boutique);

  function sauver() {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (x) {}
    if (window.Profile && Profile.setBoutique) { try { Profile.setBoutique(etat); } catch (x) {} }
    if (P().majJetons) P().majJetons();
  }

  function depense() {
    var t = 0;
    Object.keys(etat.objets).forEach(function (k) { t += etat.objets[k]; });
    return t;
  }
  function possede(id) { return id in etat.objets; }
  function adopte() { return possede("chat"); }
  // Aube : offerte par le calendrier (ou montrée le temps d'un aperçu, sans rien enregistrer)
  var apercuAube = false;
  function aubeLa() { return possede("aube") || apercuAube; }
  function unChat() { return adopte() || aubeLa(); }
  function solde() { return P().jetons ? P().jetons() : 0; }

  /* la tenue réellement portée : uniquement des objets possédés, au bon endroit */
  function tenue(src) {
    src = src || {};
    var t = {};
    Object.keys(src || {}).forEach(function (slot) {
      var id = src[slot], o = PAR_ID[id];
      if (o && o.slot === slot && possede(id)) t[slot] = id;
    });
    return t;
  }
  function maison() {
    var m = {};
    CATALOGUE.forEach(function (o) { if (o.slot === "maison" && possede(o.id)) m[o.id] = true; });
    return m;
  }

  /* ---------- le chat au-dessus de la grille ---------- */
  var moi = document.currentScript && document.currentScript.src || "";
  var base = moi.replace(/boutique\.js.*$/, ""), version = (moi.match(/\?v=[\d.]+/) || [""])[0];
  var chargement = null;
  function chargerChat() {
    if (window.ChatNoir) return Promise.resolve(true);
    if (chargement) return chargement;
    chargement = new Promise(function (ok) {
      var s = document.createElement("script");
      s.src = base + "chat.js" + version;
      s.onload = function () { ok(!!window.ChatNoir); };
      s.onerror = function () { chargement = null; ok(false); };    // hors ligne et pas en cache : rien de cassé
      document.head.appendChild(s);
    });
    return chargement;
  }
  /* ---------- croquettes ---------- */
  var CROQ_MAX = 255;                // comme les jetons d'indice
  function jourDe(t) {
    var d = t ? new Date(t) : new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function demain(j, n) { var d = new Date(j + "T12:00:00"); d.setDate(d.getDate() + (n || 1)); return jourDe(d.getTime()); }
  function appareil() { try { return JSON.parse(localStorage.getItem("motus.appareil")) || "local"; } catch (x) { return "local"; } }
  function reserve() {
    var c = etat.croq, t = 0;
    Object.keys(c.gains).forEach(function (k) { t += c.gains[k]; });
    Object.keys(c.repas).forEach(function (k) { if (c.repas[k] !== "p") t--; });      // « p » : repas de pâtée
    return Math.max(0, Math.min(CROQ_MAX, t));
  }
  // un gain sous une clé unique (case du calendrier, adoption…) : une seule fois
  function gagnerCroquettes(cle, n) {
    if (!(n > 0) || (cle in etat.croq.gains)) return false;
    etat.croq.gains[cle] = Math.floor(n);
    sauver(); nourrirEtMontrer();
    return true;
  }
  // un mot trouvé : une croquette (sauf réserve pleine)
  function croquetteVictoire() {
    if (!unChat() || reserve() >= CROQ_MAX) return;
    var k = "vic:" + appareil();
    etat.croq.gains[k] = (etat.croq.gains[k] || 0) + 1;
    sauver(); nourrirEtMontrer();
  }
  // les chats que le joueur veut voir, avec leur complicité
  function chatsVoulus() {
    var l = [];
    if (adopte() && etat.visible) l.push({ qui: "minuit", nom: etat.nom, c: etat.complicite, fem: false });
    if (aubeLa() && etat.aube.visible) l.push({ qui: "aube", nom: etat.aube.nom, c: etat.aube.complicite, fem: true });
    return l;
  }
  function nourri(qui) { return apercuAube && qui === "aube" ? true : ((qui + ":" + jourDe()) in etat.croq.repas); }
  /* Le repas du jour de chaque chat voulu. Pas de quoi nourrir tout le monde :
     le plus complice d'abord ; à égalité, au hasard. Renvoie ceux qui viennent
     de manger. */
  function nourrir() {
    var j = jourDe(), affames = chatsVoulus().filter(function (c) { return !nourri(c.qui); }), manges = [];
    if (!affames.length) return manges;
    for (var i = affames.length - 1; i > 0; i--) { var r = Math.floor(Math.random() * (i + 1)), t = affames[i]; affames[i] = affames[r]; affames[r] = t; }
    affames.sort(function (a, b) { return b.c - a.c; });         // tri stable : le hasard départage les égalités
    affames.forEach(function (c) {
      if (reserve() > 0) { etat.croq.repas[c.qui + ":" + j] = 1; manges.push(c); }
    });
    if (manges.length) sauver();
    return manges;
  }
  /* Repas, puis affichage. Annonce (une fois par jour et par chat) celui qui
     reste à la maison, et celui qui revient après avoir mangé. */
  var annonces = {};
  function nourrirEtMontrer(silence) {
    var etaitAffame = {};
    chatsVoulus().forEach(function (c) { etaitAffame[c.qui] = !nourri(c.qui); });
    var manges = nourrir();
    appliquerChat();
    majEntree();
    if (silence) return;
    var j = jourDe(), toast = P().toast;
    if (!toast) return;
    var revenus = manges.filter(function (c) { return annonces["faim:" + c.qui] === j; });
    if (revenus.length) toast("🐟 " + revenus.map(function (c) { return c.nom; }).join(" et ") +
      (revenus.length > 1 ? " ont mangé : les revoilà !" : " a mangé : " + (revenus[0].fem ? "la revoilà" : "le revoilà") + " !"), 2600);
    // un seul message pour tous ceux qui restent à la maison (deux messages à la fois s'effaçaient)
    var faim = chatsVoulus().filter(function (c) { return !nourri(c.qui) && annonces["faim:" + c.qui] !== j; });
    if (faim.length) {
      faim.forEach(function (c) { annonces["faim:" + c.qui] = j; });
      var noms = faim.map(function (c) { return c.nom; }).join(" et "), plus = faim.length > 1;
      setTimeout(function () {
        toast("🏠 " + noms + (plus ? " ont faim et restent" : " a faim et reste") + " à la maison : trouve un mot pour remplir " +
              (plus ? "leurs gamelles" : "sa gamelle") + " !", 4200);
      }, 1500);
    }
  }
  // la journée change pendant que le jeu est ouvert : nouveau repas
  var jourVu = jourDe();
  setInterval(function () { if (jourDe() !== jourVu) { jourVu = jourDe(); nourrirEtMontrer(); } }, 60000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && jourDe() !== jourVu) { jourVu = jourDe(); nourrirEtMontrer(); }
  });

  /* ---------- pâtée de fête, tentatives du Traîneau (cadeaux du calendrier) ---------- */
  function bonus(cle, o) {
    if (cle in etat.bonus) return false;
    etat.bonus[cle] = o; sauver();
    if (ov && ov.classList.contains("open")) rendre();
    return true;
  }
  function totalBonus(type) { var t = 0; Object.keys(etat.bonus).forEach(function (k) { t += +etat.bonus[k][type] || 0; }); return t; }
  function patesRestantes() { return Math.max(0, totalBonus("pate") - Object.keys(etat.pates).length); }
  // la pâtée nourrit un chat deux jours (les deux prochains jours pas encore couverts) et le rend plus complice
  function donnerPate(q) {
    if (patesRestantes() <= 0) return false;
    var j = jourDe(), faits = 0;
    for (var i = 0; i < 7 && faits < 2; i++) {
      var k = q + ":" + demain(j, i);
      if (!(k in etat.croq.repas)) { etat.croq.repas[k] = "p"; faits++; }
    }
    etat.pates[q + ":" + j + ":" + Date.now()] = 1;
    sauver();
    lien(5, q);
    nourrirEtMontrer(true);
    if (P().toast) P().toast("🍖 " + (q === "aube" ? etat.aube.nom : etat.nom) + " se régale : nourri" + (q === "aube" ? "e" : "") + " pour deux jours !", 2800);
    return true;
  }

  /* Ce que chaque chat reçoit. Le « principal » (Minuit s'il est là, sinon
     Aube) dessine les objets des coins. Chacun a sa propre complicité. */
  var COINS = ["lanterne", "sapin", "chaussette"];
  function minuitVisible() { return adopte() && etat.visible && nourri("minuit"); }
  function aubeVisible() { return aubeLa() && etat.aube.visible && nourri("aube"); }
  function etatChat(qui) {
    var a = qui === "aube", principal = a ? !minuitVisible() : true, m = maison(), c = a ? etat.aube.complicite : etat.complicite;
    return { porte: tenue(a ? etat.aube.porte : etat.porte), maison: m, nom: a ? etat.aube.nom : etat.nom,
             complicite: c, niveau: niveauDe(c), principal: principal,
             coins: principal ? COINS.filter(function (k) { return m[k]; }) : [] };
  }
  function chats() { return [window.ChatNoir, window.ChatBlanc].filter(function (c) { return c && c.actif; }); }

  /* La complicité grandit (le chat en décide : caresses, retrouvailles,
     victoires… chacune plafonnée par jour, dans boutique/chat.js). */
  /* q : « minuit » ou « aube » — chaque chat a SA complicité (c'est elle qui
     décide qui mange en premier quand les croquettes manquent). */
  function lien(n, q) {
    if (!unChat() || !(n > 0)) return;
    if (q !== "aube" && q !== "minuit") q = adopte() ? "minuit" : "aube";
    if (q === "aube" && !aubeLa()) return;
    if (q === "minuit" && !adopte()) return;
    var t = q === "aube" ? etat.aube : etat, f = q === "aube";
    var avant = niveauDe(t.complicite);
    t.complicite += Math.floor(n);
    var apres = niveauDe(t.complicite);
    if (apres >= 5 && !possede("medaille")) etat.objets.medaille = 0;       // son cadeau, à jamais
    sauver();
    var ch = q === "aube" ? window.ChatBlanc : window.ChatNoir;
    if (ch && ch.actif) ch.majLien(t.complicite, apres);
    if (apres > avant && P().toast) {
      P().toast(apres >= 5 ? "🏅 " + t.nom + " t'offre sa médaille d'amitié !"
                           : "❤ " + t.nom + " est maintenant ton" + (f ? "e " : " ") + nomNiveau(apres, f).toLowerCase() + " !", 3200);
    }
    if (ov && ov.classList.contains("open")) rendre();
  }
  function appliquerChat() {
    var noir = minuitVisible(), blanc = aubeVisible(), voulu = noir || blanc;
    var avant = document.documentElement.classList.contains("avec-chat");
    document.documentElement.classList.toggle("avec-chat", voulu);
    if (avant !== voulu && P().redimensionner) P().redimensionner();
    if (!voulu) { if (window.ChatNoir) ChatNoir.arreter(); if (window.ChatBlanc) window.ChatBlanc.arreter(); return; }
    chargerChat().then(function (ok) {
      if (!ok) return;
      [[window.ChatNoir, noir, "minuit"], [window.ChatBlanc, blanc, "aube"]].forEach(function (c) {
        if (!c[0]) return;
        if (!c[1]) { c[0].arreter(); return; }
        if (c[0].actif) c[0].habiller(etatChat(c[2])); else c[0].demarrer(etatChat(c[2]));
      });
    });
  }

  /* ---------- sons ---------- */
  function tintement() {
    var ctx = P().audio && P().audio(); if (!ctx) return;
    try {
      [1047, 1319, 1568].forEach(function (f, i) {
        var t0 = ctx.currentTime + i * 0.07, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
        o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + 0.4);
      });
    } catch (x) {}
  }

  /* ---------- actions ---------- */
  function acheter(id) {
    var o = PAR_ID[id];
    if (!o || possede(id)) return false;
    if (o.cadeau) return false;                     // un cadeau ne s'achète pas
    if (o.id !== "chat" && !unChat()) return false;
    if (solde() < o.prix) return false;
    etat.objets[id] = o.prix;
    if (o.slot && o.slot !== "maison") { var t = habille(); t.porte[o.slot] = id; t.porteAt = Date.now(); }
    if (id === "chat" && !("adopte:chat" in etat.croq.gains)) etat.croq.gains["adopte:chat"] = 3;   // sa première gamelle
    sauver(); tintement();
    nourrir();
    if (P().mesure) P().mesure(o.id === "chat" ? "bq:adopte" : "bq:achat");
    if (P().toast) P().toast(o.id === "chat" ? "🐈‍⬛ " + etat.nom + " a rejoint ta grille !" : "✨ " + o.nom + " pour " + etat.nom + " !", 2400);
    appliquerChat();
    return true;
  }
  /* le chat qu'on habille dans la boutique : Minuit, ou Aube */
  var qui = "minuit";
  function habille() { return qui === "aube" ? etat.aube : etat; }
  function porter(id) {
    var o = PAR_ID[id]; if (!o || !possede(id) || !o.slot || o.slot === "maison") return;
    var t = habille(); t.porte[o.slot] = id; t.porteAt = Date.now(); sauver(); appliquerChat();
  }
  function retirer(slot) {
    var t = habille(); delete t.porte[slot]; t.porteAt = Date.now(); sauver(); appliquerChat();
  }
  function renommer(n) {
    n = String(n || "").replace(/[^\p{L}\p{N} '’-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 14);
    var t = habille(); t.nom = n || (qui === "aube" ? "Aube" : "Minuit"); t.nomAt = Date.now(); sauver(); appliquerChat();
  }
  function basculerVisible() {
    var t = habille(); t.visible = !t.visible; t.visibleAt = Date.now(); sauver(); nourrirEtMontrer(true);
  }

  /* ---------- calendrier de l'avent ----------
     offrir : un cadeau (0 jeton), une seule fois, pour toujours.
     payer  : une clé payée une seule fois (rattrapage d'une case) ; refusé
              si le solde ne suffit pas. */
  function offrir(id) {
    if (possede(id)) return false;
    etat.objets[id] = 0;
    if (id === "aube" && !("adopte:aube" in etat.croq.gains)) etat.croq.gains["adopte:aube"] = 3;
    sauver(); nourrir(); majEntree(); appliquerChat();
    if (ov && ov.classList.contains("open")) rendre();
    return true;
  }
  function payer(cle, prix) {
    if (possede(cle)) return true;
    prix = Math.max(0, Math.floor(prix || 0));
    if (solde() < prix) return false;
    etat.objets[cle] = prix;
    sauver();
    return true;
  }

  /* =====================================================================
     LA FENÊTRE DE LA BOUTIQUE
     ===================================================================== */
  var CSS = [
    "#boutiqueOverlay .modal{max-width:460px;padding:20px 16px 18px;}",
    ".bq-solde{display:flex;justify-content:center;margin:-2px 0 12px;}",
    ".bq-solde span{background:var(--cell);box-shadow:inset 0 0 0 1.5px var(--cell-edge);border-radius:20px;padding:5px 14px;font-weight:800;font-size:14px;}",
    ".bq-scene{position:relative;height:150px;border-radius:16px;overflow:hidden;margin-bottom:8px;" +
      "background:radial-gradient(120% 90% at 50% 0%,var(--bg-2),var(--bg) 70%);box-shadow:inset 0 0 0 1.5px var(--cell-edge);}",
    ".bq-scene::after{content:'';position:absolute;left:0;right:0;bottom:0;height:22px;background:var(--cell);box-shadow:inset 0 1.5px 0 var(--cell-edge);}",
    ".bq-scene .bq-chat{position:absolute;left:50%;bottom:18px;width:150px;height:108px;transform:translateX(-50%);z-index:1;}",
    ".bq-scene .bq-chat svg{width:100%;height:100%;}",
    ".bq-nom{display:flex;align-items:center;justify-content:center;gap:8px;margin:2px 0 6px;}",
    ".bq-nom b{font-size:18px;}",
    ".bq-nom button,.bq-lien{border:none;background:none;color:var(--ink-dim);font-size:13px;cursor:pointer;padding:4px 6px;}",
    ".bq-nom input{font:inherit;font-size:16px;font-weight:800;text-align:center;width:150px;border-radius:9px;border:none;padding:6px 8px;" +
      "background:var(--cell);color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--cell-edge);}",
    ".bq-intro{text-align:center;color:var(--ink-dim);font-size:14px;line-height:1.45;margin:4px 6px 12px;}",
    ".bq-onglets{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:2px 2px 8px;margin:6px 0 4px;}",
    ".bq-onglets button{flex:0 0 auto;border:none;border-radius:16px;padding:7px 13px;font-weight:700;font-size:13px;cursor:pointer;" +
      "background:var(--cell);color:var(--ink-dim);box-shadow:inset 0 0 0 1.5px var(--cell-edge);}",
    ".bq-onglets button.actif{background:var(--accent);color:#fff;box-shadow:none;}",
    ".bq-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));gap:8px;}",
    ".bq-carte{background:var(--cell);border-radius:13px;padding:8px 7px 8px;text-align:center;box-shadow:inset 0 0 0 1.5px var(--cell-edge);cursor:pointer;}",
    ".bq-carte.porte{box-shadow:inset 0 0 0 2px var(--accent);}",
    ".bq-carte.essai{box-shadow:inset 0 0 0 2px var(--ink-dim);}",
    ".bq-carte .vi{height:62px;display:flex;align-items:center;justify-content:center;}",
    ".bq-carte .vi svg{width:66px;height:62px;overflow:visible;}",
    ".bq-carte b{display:block;font-size:12.5px;line-height:1.2;min-height:30px;display:flex;align-items:center;justify-content:center;}",
    ".bq-carte i{display:block;font-style:normal;font-size:11px;color:var(--ink-dim);margin-top:-2px;}",
    ".bq-btn{margin-top:6px;width:100%;border:none;border-radius:9px;padding:7px 4px;font-weight:800;font-size:12.5px;cursor:pointer;background:var(--accent);color:#fff;}",
    ".bq-btn.pas-assez{background:var(--key);color:var(--ink-dim);}",
    ".bq-btn.confirme{background:#1f9d55;}",
    ".bq-btn.second{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--cell-edge);}",
    ".bq-adopter{display:block;width:100%;max-width:280px;margin:0 auto 4px;}",
    ".bq-pied{text-align:center;color:var(--ink-dim);font-size:12px;line-height:1.45;margin-top:12px;}",
    ".bq-option{display:flex;justify-content:center;margin:2px 0 4px;}",
    ".bq-option label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-dim);cursor:pointer;}",
    // la place du chat au-dessus de la grille (le calcul de la taille des cases en tient compte)
    "html.avec-chat #board{margin-top:var(--chat-place,34px);}",
    "html.avec-chat #penduRow{margin-top:calc(var(--chat-place,34px) + 18px);}",
    // complicité
    ".bq-lien-bloc{background:var(--cell);border-radius:13px;padding:10px 12px;margin:4px 0 8px;box-shadow:inset 0 0 0 1.5px var(--cell-edge);text-align:center;}",
    ".bq-coeurs{font-size:17px;letter-spacing:2px;color:#ff6b9a;}",
    ".bq-coeurs span{color:var(--ink-dim);opacity:.45;}",
    ".bq-lien-bloc b{display:block;font-size:14px;margin:2px 0;}",
    ".bq-jauge{height:6px;border-radius:4px;background:var(--bg);overflow:hidden;margin:6px 0 6px;}",
    ".bq-jauge i{display:block;height:100%;background:linear-gradient(90deg,#ff6b9a,#ffb36b);border-radius:4px;}",
    ".bq-lien-bloc p{margin:0;font-size:12.5px;color:var(--ink-dim);line-height:1.4;}",
    ".bq-lien-bloc p.bq-humeur{margin-top:8px;color:var(--ink);font-weight:600;}",
    ".bq-gamelle .bq-btn{margin-top:8px;}",
    ".bq-qui{display:flex;justify-content:center;gap:8px;margin:0 0 8px;}",
    ".bq-qui button{border:none;border-radius:16px;padding:6px 14px;font-weight:800;font-size:13px;cursor:pointer;background:var(--cell);color:var(--ink-dim);box-shadow:inset 0 0 0 1.5px var(--cell-edge);}",
    ".bq-qui button.actif{background:var(--accent);color:#fff;box-shadow:none;}",
    ".bq-scene .bq-chat.duo{width:120px;height:86px;}",
    ".bq-scene .bq-chat.duo.g{left:32%;} .bq-scene .bq-chat.duo.d{left:68%;}",
    ".bq-scene .bq-chat.duo.ombre{opacity:.55;}",
    ".bq-carte .noel-tag{display:inline-block;font-size:10px;font-weight:800;color:#fff;background:#1f8a4c;border-radius:8px;padding:1px 6px;margin-bottom:3px;}"
  ].join("\n");

  var ov = null, onglet = "tete", essai = {}, confirmer = null, editionNom = false, cligne = 0;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function echap(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function installerStyle() {
    if (document.getElementById("bqStyle")) return;
    var st = el("style"); st.id = "bqStyle"; st.textContent = CSS; document.head.appendChild(st);
  }
  function construire() {
    if (ov) return;
    installerStyle();
    ov = el("div", "overlay");
    ov.id = "boutiqueOverlay";
    ov.innerHTML = '<div class="modal" role="dialog" aria-label="Boutique du chat"><button class="close-x" aria-label="Fermer">&times;</button><div class="bq-corps"></div></div>';
    document.body.appendChild(ov);
    ov.querySelector(".close-x").addEventListener("click", fermer);
    ov.addEventListener("click", function (e) { if (e.target === ov) fermer(); });
    ov.querySelector(".bq-corps").addEventListener("click", surClic);
  }

  function fermer() {
    essai = {}; confirmer = null; editionNom = false;
    clearInterval(cligne);
    if (ov) ov.classList.remove("open");
  }

  function ouvrir(ongletVoulu) {
    construire();
    if (P().mesure) P().mesure("bq:ouvre", true);
    if (ongletVoulu) onglet = ongletVoulu;
    essai = {}; confirmer = null; editionNom = false;
    if (P().fermerTout) P().fermerTout();
    ov.classList.add("open");
    var corps = ov.querySelector(".bq-corps");
    corps.innerHTML = '<p class="bq-intro">Chargement…</p>';
    chargerChat().then(function (ok) {
      if (!ok) { corps.innerHTML = '<h2>🐈‍⬛ La boutique</h2><p class="bq-intro">La boutique n\'a pas pu se charger. Vérifie ta connexion, puis réessaie.</p>'; return; }
      ChatNoir.installerStyle();
      rendre();
      // l'aperçu cligne des yeux, comme le vrai
      clearInterval(cligne);
      cligne = setInterval(function () {
        var c = ov.querySelector(".bq-chat"); if (!c) return;
        c.classList.add("cligne"); setTimeout(function () { c.classList.remove("cligne"); }, 140);
      }, 3200);
    });
  }

  function apercu() {
    var t = Object.assign({}, habille().porte, essai);
    Object.keys(t).forEach(function (k) { if (!t[k]) delete t[k]; });
    // l'essayage montre aussi les objets pas encore achetés
    var porte = {};
    Object.keys(t).forEach(function (slot) { var o = PAR_ID[t[slot]]; if (o && o.slot === slot) porte[slot] = t[slot]; });
    var moi = ChatNoir.svg("assis", porte, maison(), "", qui === "aube" ? "blanc" : "noir");
    if (!(adopte() && aubeLa())) return '<div class="bq-chat">' + moi + '</div>';
    // les deux ensemble : celui qu'on habille au premier plan, l'autre en retrait
    var autre = qui === "aube" ? ChatNoir.svg("assis", tenue(etat.porte), {}, "", "noir")
                               : ChatNoir.svg("assis", tenue(etat.aube.porte), {}, "", "blanc");
    var g = qui === "aube" ? autre : moi, d = qui === "aube" ? moi : autre;
    return '<div class="bq-chat duo g' + (qui === "aube" ? " ombre" : "") + '">' + g + '</div>' +
           '<div class="bq-chat duo d' + (qui === "aube" ? "" : " ombre") + '" style="transform:translateX(-50%) scaleX(-1)">' + d + '</div>';
  }

  function rendre() {
    var corps = ov.querySelector(".bq-corps");
    var s = solde(), h = "";
    h += '<h2>🐈‍⬛ La boutique</h2>';
    h += '<div class="bq-solde"><span>💡 ' + s + ' jeton' + (s > 1 ? "s" : "") + ' d\'indice</span></div>';
    if (!adopte() && qui === "minuit" && aubeLa()) qui = "aube";
    if (!aubeLa()) qui = "minuit";
    if (adopte() && aubeLa()) {
      h += '<div class="bq-qui" role="tablist">' +
        '<button data-qui="minuit"' + (qui === "minuit" ? ' class="actif"' : "") + '>🐈‍⬛ ' + echap(etat.nom) + '</button>' +
        '<button data-qui="aube"' + (qui === "aube" ? ' class="actif"' : "") + '>🤍 ' + echap(etat.aube.nom) + '</button></div>';
    }
    h += '<div class="bq-scene">' + apercu() + '</div>';
    var nomH = echap(habille().nom), visH = habille().visible;

    if (!unChat()) {
      var c = PAR_ID.chat, assez = s >= c.prix;
      h += '<p class="bq-intro">Adopte <b>Minuit</b>, un chat noir qui vivra au-dessus de ta grille. ' +
           'Il se promène, fait la sieste, joue, guette les chauves-souris… et suit ta partie : il s\'enthousiasme ' +
           'd\'un bel essai, te console d\'une défaite. Il mange une croquette par jour : chaque mot trouvé en gagne une. ' +
           'Plus vous passez de temps ensemble, plus il devient complice. Il n\'aide pas à trouver les mots : il tient compagnie.</p>';
      h += '<button class="btn bq-adopter" data-acheter="chat"' + '>' +
           (confirmer === "chat" ? "Confirmer l'adoption · 💡 " + c.prix : "Adopter Minuit · 💡 " + c.prix) + '</button>';
      if (!assez) h += '<p class="bq-pied">Encore ' + (c.prix - s) + ' jeton' + (c.prix - s > 1 ? "s" : "") + ' à gagner.</p>';
      h += '<div class="dist-title" style="margin-top:14px">Ensuite, pour le gâter</div>';
    } else {
      h += '<div class="bq-nom">' + (editionNom
        ? '<input id="bqNom" maxlength="14" value="' + nomH + '" aria-label="Nom du chat"><button data-nom-ok>OK</button>'
        : '<b>' + nomH + '</b><button data-renommer aria-label="Renommer">✏️ Renommer</button>') + '</div>';
      h += blocLien();
      h += '<div class="bq-option"><label><input type="checkbox" data-visible' + (visH ? " checked" : "") + '> ' +
           nomH + ' se promène au-dessus de la grille</label></div>';
      if (!adopte()) {
        var cm = PAR_ID.chat;
        h += '<p class="bq-intro" style="margin-top:10px">Aube aimerait un compagnon : <b>Minuit</b>, un chat noir, attend d\'être adopté.</p>' +
             '<button class="btn bq-adopter" data-acheter="chat">' + (confirmer === "chat" ? "Confirmer l'adoption · 💡 " + cm.prix : "Adopter Minuit · 💡 " + cm.prix) + '</button>';
      }
    }

    h += '<div class="bq-onglets" role="tablist">' + ONGLETS.map(function (o) {
      return '<button role="tab" data-onglet="' + o[0] + '"' + (o[0] === onglet ? ' class="actif" aria-selected="true"' : "") + '>' + o[1] + '</button>';
    }).join("") + '</div>';

    h += '<div class="bq-grille">' + CATALOGUE.filter(function (o) { return o.slot === onglet; }).map(carte).join("") + '</div>';
    h += '<p class="bq-pied">Les jetons se gagnent en réussissant le mot du jour, le défi du jour, ' +
         'la grammaire et l\'orthographe du jour' + (P().halloween && P().halloween() ? ", le Mot terrifiant et les Bonbons" : "") +
         (P().noel && P().noel() ? ", et les cases du calendrier de l'avent" : "") + '.</p>';
    corps.innerHTML = h;
    var inp = corps.querySelector("#bqNom");
    if (inp) {
      inp.focus(); inp.select();
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { renommer(inp.value); editionNom = false; rendre(); } });
    }
  }

  function blocLien() {
    var c = habille().complicite, n = niveauDe(c), N = NIVEAUX[n - 1], suivant = NIVEAUX[n];
    var coeurs = "";
    for (var i = 1; i <= 5; i++) coeurs += i <= n ? "♥" : "<span>♥</span>";
    var part = suivant ? Math.round((c - N.min) / (suivant.min - N.min) * 100) : 100;
    var h = '<div class="bq-lien-bloc"><div class="bq-coeurs">' + coeurs + '</div>' +
      '<b>Complicité : ' + N.nom + '</b>' +
      '<div class="bq-jauge"><i style="width:' + part + '%"></i></div>' +
      '<p>' + (suivant ? "Prochaine étape — " + suivant.nom + " : " + suivant.d.charAt(0).toLowerCase() + suivant.d.slice(1)
                       : N.d) + '</p>';
    // l'humeur de chaque chat présent
    [[window.ChatNoir, etat.nom, false], [window.ChatBlanc, etat.aube.nom, true]].forEach(function (c) {
      var e = c[0] && c[0].actif && c[0].esprit; if (!e) return;
      var fem = c[2];
      var forme = e.energie < 30 ? "a sommeil" : e.energie > 75 ? "est en pleine forme" : "est tranquille";
      h += '<p class="bq-humeur">' + echap(c[1]) + ' ' + forme + '</p>';
    });
    return h + '</div>' + blocGamelle();
  }
  /* La réserve de croquettes et le repas du jour de chaque chat. */
  function blocGamelle() {
    var r = reserve(), h = '<div class="bq-lien-bloc bq-gamelle"><b>🐟 Réserve : ' + r + ' croquette' + (r > 1 ? "s" : "") +
      (r >= CROQ_MAX ? " (pleine)" : "") + '</b>';
    chatsVoulus().forEach(function (c) {
      h += '<p class="bq-humeur">' + echap(c.nom) + (nourri(c.qui)
        ? ' a mangé aujourd\'hui ✓'
        : ' a faim : ' + (c.fem ? "elle" : "il") + ' reste à la maison 🏠') + '</p>';
    });
    var pt = patesRestantes();
    if (pt > 0) {
      h += chatsVoulus().map(function (c) {
        return '<button class="bq-btn" data-pate="' + c.qui + '">🍖 Pâtée de fête pour ' + echap(c.nom) + '</button>';
      }).join("") + '<p>' + pt + ' pâtée' + (pt > 1 ? "s" : "") + ' de fête : un repas pour deux jours, et un peu plus de complicité.</p>';
    }
    return h + '<p style="margin-top:6px">Chaque chat mange une croquette par jour. Chaque mot trouvé en ajoute une à la réserve (' +
      CROQ_MAX + ' au plus). Sans croquette, le chat reste à la maison ; s\'il n\'y en a pas pour tout le monde, le plus complice mange d\'abord.</p></div>';
  }

  function carte(o) {
    var a = possede(o.id), porte = habille().porte[o.slot] === o.id, essaye = essai[o.slot] === o.id && !porte;
    var chez = adopte() && aubeLa() ? "eux" : echap(adopte() ? etat.nom : etat.aube.nom);
    var s = solde(), bouton;
    if (o.slot === "maison") {
      bouton = a ? '<button class="bq-btn second" disabled>✓ Chez ' + chez + '</button>'
                 : o.cadeau ? '<button class="bq-btn pas-assez" data-bloque="avent-' + o.avent + '">🔒 🗓️ Case ' + o.avent + '</button>' : boutonPrix(o, s);
    } else if (a) {
      bouton = porte ? '<button class="bq-btn second" data-retirer="' + o.slot + '">Retirer</button>'
                     : '<button class="bq-btn" data-porter="' + o.id + '">Mettre</button>';
    } else if (o.cadeau && o.avent) {
      bouton = '<button class="bq-btn pas-assez" data-bloque="avent-' + o.avent + '">🔒 🗓️ Case ' + o.avent + '</button>';
    } else if (o.cadeau) {
      bouton = '<button class="bq-btn pas-assez" data-bloque="cadeau">🔒 Complicité ♥♥♥♥♥</button>';
    } else bouton = boutonPrix(o, s);
    return '<div class="bq-carte' + (porte ? " porte" : "") + (essaye ? " essai" : "") + '" data-essayer="' + o.id + '">' +
      (o.noel ? '<span class="noel-tag">🎄 Noël</span>' : "") +
      '<div class="vi">' + ChatNoir.vignette(o.id, qui === "aube" ? "blanc" : "noir") + '</div><b>' + o.nom + '</b>' + (o.d ? '<i>' + o.d + '</i>' : "") + bouton + '</div>';
  }
  function boutonPrix(o, s) {
    if (!unChat()) return '<button class="bq-btn pas-assez" data-bloque="adopter">💡 ' + o.prix + '</button>';
    if (s < o.prix) return '<button class="bq-btn pas-assez" data-bloque="' + (o.prix - s) + '">🔒 💡 ' + o.prix + '</button>';
    return '<button class="bq-btn' + (confirmer === o.id ? " confirme" : "") + '" data-acheter="' + o.id + '">' +
      (confirmer === o.id ? "Confirmer · 💡 " + o.prix : "Acheter · 💡 " + o.prix) + '</button>';
  }

  var minuterie = 0;
  function surClic(e) {
    var t = e.target.closest("[data-acheter],[data-porter],[data-retirer],[data-onglet],[data-renommer],[data-nom-ok],[data-visible],[data-bloque],[data-essayer],[data-qui],[data-pate]");
    if (!t) return;
    var d = t.dataset;
    if (d.onglet) { onglet = d.onglet; essai = {}; confirmer = null; rendre(); return; }
    if (d.qui) { qui = d.qui; essai = {}; confirmer = null; editionNom = false; rendre(); return; }
    if (d.pate) { donnerPate(d.pate); rendre(); return; }
    if (d.renommer !== undefined) { editionNom = true; rendre(); return; }
    if (d.nomOk !== undefined) { var i = ov.querySelector("#bqNom"); renommer(i ? i.value : ""); editionNom = false; rendre(); return; }
    if (d.visible !== undefined) { basculerVisible(); rendre(); return; }
    if (d.bloque) {
      if (P().toast) P().toast(d.bloque.indexOf("avent-") === 0 ? "🗓️ Un cadeau du calendrier de l'avent (case " + d.bloque.slice(6) + ")"
        : d.bloque === "cadeau" ? "Ce cadeau, " + (adopte() ? etat.nom : etat.aube.nom) + " te l'offrira quand vous serez inséparables ♥"
        : d.bloque === "adopter" ? "Adopte d'abord Minuit 🐈‍⬛"
        : "Il te manque " + d.bloque + " jeton" + (+d.bloque > 1 ? "s" : "") + " 💡", 2200);
      return;
    }
    if (d.acheter) {
      e.stopPropagation();
      var o = PAR_ID[d.acheter];
      if (solde() < o.prix) { if (P().toast) P().toast("Il te manque " + (o.prix - solde()) + " jeton(s) 💡", 2200); return; }
      // deux temps : on ne dépense jamais des jetons sur un toucher maladroit
      if (confirmer !== o.id) {
        confirmer = o.id; rendre();
        clearTimeout(minuterie); minuterie = setTimeout(function () { if (confirmer === o.id) { confirmer = null; if (ov.classList.contains("open")) rendre(); } }, 3500);
        return;
      }
      confirmer = null;
      if (acheter(o.id)) { delete essai[o.slot]; rendre(); }
      return;
    }
    if (d.porter) { e.stopPropagation(); porter(d.porter); essai = {}; rendre(); return; }
    if (d.retirer) { e.stopPropagation(); retirer(d.retirer); essai = {}; rendre(); return; }
    if (d.essayer) {
      var ob = PAR_ID[d.essayer];
      if (!ob || !ob.slot || ob.slot === "maison") return;
      // toucher une carte : essayage dans l'aperçu (sans rien acheter) ; un second toucher l'annule
      if (essai[ob.slot] === ob.id) delete essai[ob.slot]; else essai[ob.slot] = ob.id;
      rendre();
    }
  }

  /* ---------- entrée dans le menu des modes ---------- */
  function entreeMenu() {
    if (document.getElementById("boutiqueItem")) { majEntree(); return; }
    var ref = document.getElementById("modeDaily");
    var grille = ref && ref.closest(".mode-grid");
    if (!grille) return;
    // la boutique est la rubrique ; le compagnon, ce qu'on y trouve
    var cat = el("div", "mode-cat", "🛍️ Boutique");
    var g = el("div", "mode-grid");
    var b = el("button", "mode-item");
    b.id = "boutiqueItem";
    g.appendChild(b);
    grille.parentNode.insertBefore(cat, grille.nextSibling);
    cat.parentNode.insertBefore(g, cat.nextSibling);
    b.addEventListener("click", function () { ouvrir(); });
    majEntree();
  }
  function majEntree() {
    var b = document.getElementById("boutiqueItem"); if (!b) return;
    var faim = chatsVoulus().filter(function (c) { return !nourri(c.qui); });
    b.classList.toggle("faim", faim.length > 0);
    b.innerHTML = '<span class="mi">' + (adopte() || !aubeLa() ? "🐈‍⬛" : "🐈") + '</span><b>Compagnon' + (adopte() && aubeLa() ? "s" : "") + '</b><i>' +
      (faim.length ? "🏠 " + faim.map(function (c) { return echap(c.nom); }).join(" et ") + (faim.length > 1 ? " ont faim" : " a faim")
       : adopte() && aubeLa() ? echap(etat.nom) + " et " + echap(etat.aube.nom)
       : adopte() ? echap(etat.nom) + " et ses affaires"
       : aubeLa() ? echap(etat.aube.nom) + " et ses affaires" : "Adopte un chat noir") + '</i>';
  }

  /* ---------- API ---------- */
  window.Boutique = {
    catalogue: CATALOGUE,
    depense: depense,
    possede: possede,
    acheter: acheter,
    ouvrir: ouvrir,
    fermer: fermer,
    fusion: fusion,
    get etat() { return etat; },
    get qui() { return qui; },
    /* réactions au jeu. À deux chats, ils ne réagissent pas en chœur :
       la victoire les réjouit tous les deux, le reste revient à l'un des deux
       (l'autre suit des yeux, ou est triste de loin). */
    evenement: function (nom, info) {
      if (nom === "victoire") croquetteVictoire();          // avant tout : même un chat resté à la maison en profite
      var l = chats(); if (!l.length) return;
      if (l.length === 1 || nom === "victoire" || nom === "touche") { l.forEach(function (c) { c.evenement(nom, info); }); return; }
      var eveilles = l.filter(function (c) { return !c.dort; }), choisi = (eveilles.length ? eveilles : l)[Math.floor(Math.random() * (eveilles.length || l.length))];
      choisi.evenement(nom, info);
      if (nom === "defaite") l.forEach(function (c) { if (c !== choisi) c.evenement("voir-triste"); });
    },
    lien: lien,
    offrir: offrir,
    payer: payer,
    // croquettes et cadeaux du calendrier
    get reserve() { return reserve(); },
    croqMax: CROQ_MAX,
    gagnerCroquettes: gagnerCroquettes,
    nourri: nourri,
    bonus: bonus,
    totalBonus: totalBonus,
    patesRestantes: patesRestantes,
    donnerPate: donnerPate,
    get aube() { return aubeLa(); },
    // aperçu (administration) : montre Aube sans rien enregistrer
    apercuAube: function (on) { apercuAube = !!on; majEntree(); appliquerChat(); if (ov && ov.classList.contains("open")) rendre(); },
    niveaux: NIVEAUX,
    niveauDe: niveauDe
  };
  // après une synchronisation : un achat fait sur un autre appareil arrive ici
  window.motusBoutiqueRefresh = function (distant) {
    var avant = JSON.stringify(etat);
    etat = fusion(etat, distant);
    if (JSON.stringify(etat) === avant) return;
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (x) {}
    if (P().majJetons) P().majJetons();
    nourrirEtMontrer(true);
    if (ov && ov.classList.contains("open")) rendre();
  };

  /* Arrivée des croquettes (v2.9) : les chats déjà adoptés reçoivent une
     réserve de départ — personne ne doit retrouver son chat parti le jour de
     la mise à jour. La même clé partout : comptée une seule fois. */
  if (unChat() && !Object.keys(etat.croq.gains).length && !Object.keys(etat.croq.repas).length) {
    etat.croq.gains.depart = 7;
    sauver();
  }
  installerStyle();
  entreeMenu();
  nourrirEtMontrer();
})();
