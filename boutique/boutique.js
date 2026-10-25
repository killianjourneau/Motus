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
    { id: "lanterne",   slot: "maison", nom: "Citrouille lanterne",    prix: 5, d: "Au coin de la grille" }
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
  function niveauDe(c) { var n = 1; NIVEAUX.forEach(function (v, i) { if (c >= v.min) n = i + 1; }); return n; }

  var CLE = "motus.boutique";
  var P = function () { return window.MotusPont || {}; };

  /* ---------- état ---------- */
  function vide() { return { objets: {}, porte: {}, porteAt: 0, nom: "Minuit", nomAt: 0, visible: true, visibleAt: 0, complicite: 0 }; }
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
  function solde() { return P().jetons ? P().jetons() : 0; }

  /* la tenue réellement portée : uniquement des objets possédés, au bon endroit */
  function tenue(src) {
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
  function etatChat() { return { porte: tenue(etat.porte), maison: maison(), nom: etat.nom, complicite: etat.complicite, niveau: niveauDe(etat.complicite) }; }

  /* La complicité grandit (le chat en décide : caresses, retrouvailles,
     victoires… chacune plafonnée par jour, dans boutique/chat.js). */
  function lien(n) {
    if (!adopte() || !(n > 0)) return;
    var avant = niveauDe(etat.complicite);
    etat.complicite += Math.floor(n);
    var apres = niveauDe(etat.complicite);
    if (apres >= 5 && !possede("medaille")) etat.objets.medaille = 0;       // son cadeau, à jamais
    sauver();
    if (window.ChatNoir && ChatNoir.actif) ChatNoir.majLien(etat.complicite, apres);
    if (apres > avant && P().toast) {
      P().toast(apres >= 5 ? "🏅 " + etat.nom + " t'offre sa médaille d'amitié !"
                           : "❤ " + etat.nom + " est maintenant ton " + NIVEAUX[apres - 1].nom.toLowerCase() + " !", 3200);
    }
    if (ov && ov.classList.contains("open")) rendre();
  }
  function appliquerChat() {
    var voulu = adopte() && etat.visible;
    var avant = document.documentElement.classList.contains("avec-chat");
    document.documentElement.classList.toggle("avec-chat", voulu);
    if (avant !== voulu && P().redimensionner) P().redimensionner();
    if (!voulu) { if (window.ChatNoir) ChatNoir.arreter(); return; }
    chargerChat().then(function (ok) {
      if (!ok) return;
      if (ChatNoir.actif) ChatNoir.habiller(etatChat()); else ChatNoir.demarrer(etatChat());
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
    if (o.id !== "chat" && !adopte()) return false;
    if (solde() < o.prix) return false;
    etat.objets[id] = o.prix;
    if (o.slot && o.slot !== "maison") { etat.porte[o.slot] = id; etat.porteAt = Date.now(); }
    sauver(); tintement();
    if (P().mesure) P().mesure(o.id === "chat" ? "bq:adopte" : "bq:achat");
    if (P().toast) P().toast(o.id === "chat" ? "🐈‍⬛ " + etat.nom + " a rejoint ta grille !" : "✨ " + o.nom + " pour " + etat.nom + " !", 2400);
    appliquerChat();
    return true;
  }
  function porter(id) {
    var o = PAR_ID[id]; if (!o || !possede(id) || !o.slot || o.slot === "maison") return;
    etat.porte[o.slot] = id; etat.porteAt = Date.now(); sauver(); appliquerChat();
  }
  function retirer(slot) {
    delete etat.porte[slot]; etat.porteAt = Date.now(); sauver(); appliquerChat();
  }
  function renommer(n) {
    n = String(n || "").replace(/[^\p{L}\p{N} '’-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 14);
    etat.nom = n || "Minuit"; etat.nomAt = Date.now(); sauver(); appliquerChat();
  }
  function basculerVisible() {
    etat.visible = !etat.visible; etat.visibleAt = Date.now(); sauver(); appliquerChat();
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
    ".bq-lien-bloc p.bq-humeur{margin-top:8px;color:var(--ink);font-weight:600;}"
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
    var t = Object.assign({}, etat.porte, essai);
    Object.keys(t).forEach(function (k) { if (!t[k]) delete t[k]; });
    // l'essayage montre aussi les objets pas encore achetés
    var porte = {};
    Object.keys(t).forEach(function (slot) { var o = PAR_ID[t[slot]]; if (o && o.slot === slot) porte[slot] = t[slot]; });
    return ChatNoir.svg("assis", porte, maison());
  }

  function rendre() {
    var corps = ov.querySelector(".bq-corps");
    var s = solde(), h = "";
    h += '<h2>🐈‍⬛ La boutique</h2>';
    h += '<div class="bq-solde"><span>💡 ' + s + ' jeton' + (s > 1 ? "s" : "") + ' d\'indice</span></div>';
    h += '<div class="bq-scene"><div class="bq-chat">' + apercu() + '</div></div>';

    if (!adopte()) {
      var c = PAR_ID.chat, assez = s >= c.prix;
      h += '<p class="bq-intro">Adopte <b>Minuit</b>, un chat noir qui vivra au-dessus de ta grille. ' +
           'Il se promène, fait la sieste, joue, guette les chauves-souris… et suit ta partie : il s\'enthousiasme ' +
           'd\'un bel essai, te console d\'une défaite, mange une croquette à chaque mot trouvé. ' +
           'Plus vous passez de temps ensemble, plus il devient complice. Il n\'aide pas à trouver les mots : il tient compagnie.</p>';
      h += '<button class="btn bq-adopter" data-acheter="chat"' + '>' +
           (confirmer === "chat" ? "Confirmer l'adoption · 💡 " + c.prix : "Adopter Minuit · 💡 " + c.prix) + '</button>';
      if (!assez) h += '<p class="bq-pied">Encore ' + (c.prix - s) + ' jeton' + (c.prix - s > 1 ? "s" : "") + ' à gagner.</p>';
      h += '<div class="dist-title" style="margin-top:14px">Ensuite, pour le gâter</div>';
    } else {
      h += '<div class="bq-nom">' + (editionNom
        ? '<input id="bqNom" maxlength="14" value="' + echap(etat.nom) + '" aria-label="Nom du chat"><button data-nom-ok>OK</button>'
        : '<b>' + echap(etat.nom) + '</b><button data-renommer aria-label="Renommer">✏️ Renommer</button>') + '</div>';
      h += blocLien();
      h += '<div class="bq-option"><label><input type="checkbox" data-visible' + (etat.visible ? " checked" : "") + '> ' +
           echap(etat.nom) + ' se promène au-dessus de la grille</label></div>';
    }

    h += '<div class="bq-onglets" role="tablist">' + ONGLETS.map(function (o) {
      return '<button role="tab" data-onglet="' + o[0] + '"' + (o[0] === onglet ? ' class="actif" aria-selected="true"' : "") + '>' + o[1] + '</button>';
    }).join("") + '</div>';

    h += '<div class="bq-grille">' + CATALOGUE.filter(function (o) { return o.slot === onglet; }).map(carte).join("") + '</div>';
    h += '<p class="bq-pied">Les jetons se gagnent en réussissant le mot du jour, le défi du jour, ' +
         'la grammaire et l\'orthographe du jour' + (P().halloween && P().halloween() ? ", le Mot terrifiant et les Bonbons" : "") + '.</p>';
    corps.innerHTML = h;
    var inp = corps.querySelector("#bqNom");
    if (inp) {
      inp.focus(); inp.select();
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { renommer(inp.value); editionNom = false; rendre(); } });
    }
  }

  function blocLien() {
    var c = etat.complicite, n = niveauDe(c), N = NIVEAUX[n - 1], suivant = NIVEAUX[n];
    var coeurs = "";
    for (var i = 1; i <= 5; i++) coeurs += i <= n ? "♥" : "<span>♥</span>";
    var part = suivant ? Math.round((c - N.min) / (suivant.min - N.min) * 100) : 100;
    var h = '<div class="bq-lien-bloc"><div class="bq-coeurs">' + coeurs + '</div>' +
      '<b>Complicité : ' + N.nom + '</b>' +
      '<div class="bq-jauge"><i style="width:' + part + '%"></i></div>' +
      '<p>' + (suivant ? "Prochaine étape — " + suivant.nom + " : " + suivant.d.charAt(0).toLowerCase() + suivant.d.slice(1)
                       : N.d) + '</p>';
    var e = window.ChatNoir && ChatNoir.esprit;
    if (e) {
      var faim = e.faim > 70 ? "a faim" : e.faim > 45 ? "grignoterait bien" : "est repu";
      var forme = e.energie < 30 ? "a sommeil" : e.energie > 75 ? "est en pleine forme" : "est tranquille";
      h += '<p class="bq-humeur">' + echap(etat.nom) + ' ' + faim + ' et ' + forme + ' · 🐟 ' +
           e.croquettes + ' croquette' + (e.croquettes > 1 ? "s" : "") + ' dans sa gamelle</p>' +
           '<p style="margin-top:4px">Chaque mot trouvé remplit sa gamelle d\'une croquette. Joue avec lui, caresse-le, reviens le voir : la complicité grandit.</p>';
    }
    return h + '</div>';
  }

  function carte(o) {
    var a = possede(o.id), porte = etat.porte[o.slot] === o.id, essaye = essai[o.slot] === o.id && !porte;
    var s = solde(), bouton;
    if (o.slot === "maison") {
      bouton = a ? '<button class="bq-btn second" disabled>✓ Chez ' + echap(etat.nom) + '</button>' : boutonPrix(o, s);
    } else if (a) {
      bouton = porte ? '<button class="bq-btn second" data-retirer="' + o.slot + '">Retirer</button>'
                     : '<button class="bq-btn" data-porter="' + o.id + '">Mettre</button>';
    } else if (o.cadeau) {
      bouton = '<button class="bq-btn pas-assez" data-bloque="cadeau">🔒 Complicité ♥♥♥♥♥</button>';
    } else bouton = boutonPrix(o, s);
    return '<div class="bq-carte' + (porte ? " porte" : "") + (essaye ? " essai" : "") + '" data-essayer="' + o.id + '">' +
      '<div class="vi">' + ChatNoir.vignette(o.id) + '</div><b>' + o.nom + '</b>' + (o.d ? '<i>' + o.d + '</i>' : "") + bouton + '</div>';
  }
  function boutonPrix(o, s) {
    if (!adopte()) return '<button class="bq-btn pas-assez" data-bloque="adopter">💡 ' + o.prix + '</button>';
    if (s < o.prix) return '<button class="bq-btn pas-assez" data-bloque="' + (o.prix - s) + '">🔒 💡 ' + o.prix + '</button>';
    return '<button class="bq-btn' + (confirmer === o.id ? " confirme" : "") + '" data-acheter="' + o.id + '">' +
      (confirmer === o.id ? "Confirmer · 💡 " + o.prix : "Acheter · 💡 " + o.prix) + '</button>';
  }

  var minuterie = 0;
  function surClic(e) {
    var t = e.target.closest("[data-acheter],[data-porter],[data-retirer],[data-onglet],[data-renommer],[data-nom-ok],[data-visible],[data-bloque],[data-essayer]");
    if (!t) return;
    var d = t.dataset;
    if (d.onglet) { onglet = d.onglet; essai = {}; confirmer = null; rendre(); return; }
    if (d.renommer !== undefined) { editionNom = true; rendre(); return; }
    if (d.nomOk !== undefined) { var i = ov.querySelector("#bqNom"); renommer(i ? i.value : ""); editionNom = false; rendre(); return; }
    if (d.visible !== undefined) { basculerVisible(); rendre(); return; }
    if (d.bloque) {
      if (P().toast) P().toast(d.bloque === "cadeau" ? "Ce cadeau, " + etat.nom + " te l'offrira quand vous serez inséparables ♥"
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
    var b = el("button", "mode-item nouveau");
    b.id = "boutiqueItem";
    g.appendChild(b);
    grille.parentNode.insertBefore(cat, grille.nextSibling);
    cat.parentNode.insertBefore(g, cat.nextSibling);
    b.addEventListener("click", function () { ouvrir(); });
    majEntree();
  }
  function majEntree() {
    var b = document.getElementById("boutiqueItem"); if (!b) return;
    b.innerHTML = '<span class="mi">🐈‍⬛</span><b>Compagnon</b><i>' +
      (adopte() ? echap(etat.nom) + " et ses affaires" : "Adopte un chat noir") + '</i>';
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
    // réactions du chat au jeu
    evenement: function (nom, info) { if (window.ChatNoir && ChatNoir.actif) ChatNoir.evenement(nom, info); },
    lien: lien,
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
    majEntree(); appliquerChat();
    if (ov && ov.classList.contains("open")) rendre();
  };

  installerStyle();
  entreeMenu();
  appliquerChat();
})();
