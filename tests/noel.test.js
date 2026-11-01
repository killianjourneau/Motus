/* ===================================================================
   Noël : données de l'événement, calendrier de l'avent, Aube.
   Le calendrier s'appuie sur les objets de la boutique : on vérifie
   qu'une case, un rattrapage ou un cadeau ne comptent jamais deux fois.
   =================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

module.exports = async function ({ groupe, verifie, ok, egal, vide, RACINE }) {
  const lire = (f) => fs.readFileSync(path.join(RACINE, f), "utf8");
  const w0 = {};
  new Function("window", lire("dico/motus-noel.js"))(w0);
  const N = w0.MOTUS_NOEL;

  /* boutique.js + chat.js + avent.js dans une fenêtre minimale */
  function charger(objets, extra, pont) {
    const el = () => ({ style:{}, classList:{ toggle(){}, contains(){ return false; }, add(){}, remove(){} }, dataset:{},
                        appendChild(){}, addEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; } });
    const d = { getElementById: () => null, createElement: el, head: el(), body: el(), addEventListener(){},
                documentElement: el(), currentScript: null, querySelectorAll: () => [] };
    const memoire = {};
    if (objets) memoire["motus.boutique"] = JSON.stringify(Object.assign({ objets }, extra || {}));
    const w = { localStorage: { getItem: k => (k in memoire ? memoire[k] : null), setItem: (k, v) => { memoire[k] = String(v); } },
                MOTUS_NOEL: N, MotusPont: Object.assign({ jetons: () => 10, toast(){}, mesure(){} }, pont || {}) };
    new Function("window", "document", "localStorage", lire("boutique/chat.js"))(w, d, w.localStorage);
    // setInterval neutralisé : le test ne doit pas rester ouvert
    new Function("window", "document", "localStorage", "ChatNoir", "setInterval", "setTimeout", lire("boutique/boutique.js"))(w, d, w.localStorage, w.ChatNoir, () => 0, () => 0);
    new Function("window", "document", "Boutique", "setTimeout", lire("noel/avent.js"))(w, d, w.Boutique, () => 0);
    return w;
  }

  // ------------------------------------------------------------------
  groupe("Noël — données");

  verifie("24 mots de Noël, tous dans le dictionnaire du jeu", () => {
    egal(N.mots.length, 24);
    egal(new Set(N.mots).size, 24, "un mot apparaît deux fois");
    const absents = N.mots.filter(m => {
      if (m.length < 6 || m.length > 8) return true;
      const f = path.join(RACINE, "dico", "dico-" + String(m.length).padStart(2, "0") + ".txt");
      return !fs.readFileSync(f, "utf8").split("\n").includes(m);
    });
    vide(absents, "mots refusés par le jeu");
  });

  verifie("une récompense chaque jour, et chaque cosmétique existe dans la boutique à la bonne case", () => {
    const W = charger(), C = W.Boutique.catalogue, soucis = [];
    const CONNUS = ["objet", "croq", "jetons", "traineau", "pate", "emote", "couleur", "embleme"];
    for (let n = 1; n <= 24; n++) {
      const r = N.recompenses[String(n)];
      if (!r || !Object.keys(r).length) { soucis.push("jour " + n + " sans récompense"); continue; }
      Object.keys(r).forEach(t => { if (!CONNUS.includes(t)) soucis.push("jour " + n + " : type inconnu " + t); });
      if (r.objet) {
        const o = C.find(x => x.id === r.objet);
        if (!o) soucis.push(r.objet + " absent");
        else if (!o.cadeau || o.prix !== 0 || o.avent !== n) soucis.push(o.id + " mal décrit");
      }
    }
    const idx = lire("index.html");
    ["emote:noel", "emote:bonhomme", "couleur:sapin"].forEach(k => ok(idx.includes('cle:"' + k + '"'), k + " n'est pas branché dans le jeu"));
    ok(/'\^\(gg\|[^']*noel\|bonhomme\)\$'/.test(lire("duel/schema.sql")), "le serveur refuserait les émotes de Noël en Battle Royale");
    ok(/embleme:noel/.test(lire("profiles/profile.js")), "l'emblème de Noël n'existe pas");
    ok(/const JETONS_MAX = 255/.test(idx), "la réserve de jetons n'est pas plafonnée à 255");
    const aube = C.find(x => x.id === "aube");
    ok(aube && aube.cadeau && aube.avent === N.seuilAube, "Aube mal décrite dans le catalogue");
    vide(soucis);
  });

  verifie("dates cohérentes, et fichiers de Noël en cache et chargés", () => {
    ok(N.debut <= N.mois + "-01" && N.fin >= N.mois + "-24", "le calendrier sort des dates de l'événement");
    ok(N.seuilAube >= 1 && N.seuilAube <= 24);
    const sw = lire("sw.js"), idx = lire("index.html");
    ["./decors/noel.js?v=", "./dico/motus-noel.js?v=", "./noel/avent.js?v="].forEach(f => ok(sw.includes('"' + f + '"'), f + " absent du cache"));
    ok(/<script src="\.\/noel\/avent\.js\?v=[\d.]+"><\/script>/.test(idx), "avent.js non chargé");
    ok(idx.indexOf('src="./dico/motus-noel.js') < idx.indexOf('src="./noel/avent.js'), "les données de Noël doivent précéder le calendrier");
  });

  // ------------------------------------------------------------------
  groupe("Noël — calendrier de l'avent");

  verifie("hors de l'événement, rien ne s'ouvre", () => {
    const W = charger();
    W.Avent.apercu("2026-11-20");
    egal(W.Avent.actif(), false);
    egal(W.Avent.etatCase(1), "futur");
    W.Avent.apercu(null);
  });

  verifie("le 7 décembre : case du jour, cases passées à rattraper, futures fermées", () => {
    const W = charger();
    W.Avent.apercu("2026-12-07");
    egal(W.Avent.caseDuJour(), 7);
    egal(W.Avent.etatCase(7), "jour");
    egal(W.Avent.etatCase(3), "manquee");
    egal(W.Avent.etatCase(8), "futur");
    ok(W.Avent.jouable(7) && !W.Avent.jouable(3) && !W.Avent.jouable(8));
  });

  verifie("ouvrir une case offre son cadeau une seule fois, et le mot trouvé est noté", () => {
    const W = charger({ chat: 5 });
    const o = W.Boutique.etat.objets;
    // vraie date simulée sans bac à sable : on écrit dans la boutique
    W.Avent.terminer(3, true);
    ok("avent-03-j" in o && "avent-03-ok" in o, "case 3 non notée");
    egal(o.bonnet, 0, "le bonnet (case 3) n'a pas été offert");
    W.Avent.terminer(3, false);
    egal(Object.keys(o).filter(k => k === "bonnet").length, 1);
    W.Avent.terminer(5, false);
    ok("avent-05-j" in o && !("avent-05-ok" in o), "une case perdue ne doit pas compter comme trouvée");
    egal(W.Boutique.depense(), 5, "un cadeau ou une case ne doivent rien coûter");
  });

  verifie("un rattrapage se paie une fois, et compte dans les dépenses", () => {
    const W = charger({ chat: 5 });
    ok(W.Boutique.payer("avent-02", N.rattrapage));
    ok(W.Boutique.payer("avent-02", N.rattrapage), "repayer une case déjà payée doit réussir… sans débiter");
    egal(W.Boutique.depense(), 5 + N.rattrapage);
    const f = W.Boutique.fusion({ objets: { chat: 5, "avent-02": 3 } }, { objets: { chat: 5, "avent-02": 3, "avent-04": 3 } });
    egal(Object.keys(f.objets).filter(k => k.indexOf("avent") === 0).length, 2, "deux appareils : chaque rattrapage une seule fois");
  });

  verifie("Aube arrive à la 18e case ouverte, pas avant", () => {
    const W = charger({ chat: 5 });
    for (let n = 1; n < N.seuilAube; n++) W.Avent.terminer(n, n % 2 === 0);
    ok(!W.Boutique.aube, "Aube est arrivée trop tôt");
    W.Avent.terminer(N.seuilAube, false);
    ok(W.Boutique.aube, "Aube n'est pas arrivée");
    egal(W.Boutique.etat.objets.aube, 0);
  });

  verifie("l'aperçu (administration) n'enregistre rien", () => {
    const W = charger({ chat: 5 });
    W.Avent.apercu("2026-12-24");
    for (let n = 1; n <= 24; n++) W.Avent.terminer(n, true);
    egal(W.Avent.ouvertes(), 24);
    W.Avent.apercu(null);
    egal(JSON.stringify(W.Boutique.etat.objets), JSON.stringify({ chat: 5 }));
    ok(!W.Boutique.aube);
  });

  // ------------------------------------------------------------------
  groupe("Noël — Aube");

  verifie("tenue, nom et affichage d'Aube voyagent entre appareils (le plus récent gagne)", () => {
    const W = charger();
    const f = W.Boutique.fusion(
      { objets: { aube: 0 }, aube: { porte: { tete: "bonnet" }, porteAt: 100, nom: "Aube", nomAt: 0, visible: true, visibleAt: 0 } },
      { objets: { aube: 0, rennes: 0 }, aube: { porte: { tete: "rennes" }, porteAt: 200, nom: "Neige", nomAt: 50, visible: false, visibleAt: 10 } });
    egal(f.aube.porte.tete, "rennes"); egal(f.aube.nom, "Neige"); egal(f.aube.visible, false);
    const prof = lire("profiles/profile.js");
    ok(/r\.aube = \{/.test(prof), "profile.js ne fusionne pas Aube : sa tenue se perdrait à la synchronisation");
  });

  verifie("Aube a son pelage blanc, et chaque objet de Noël se dessine", () => {
    const W = charger();
    ok(W.ChatBlanc && W.ChatNoir.nomParDefaut === "Minuit" && W.ChatBlanc.nomParDefaut === "Aube");
    const noir = W.ChatNoir.svg("assis", {}, {}), blanc = W.ChatNoir.svg("assis", {}, {}, "", "blanc");
    ok(noir !== blanc && /#f4f1ec/.test(blanc) && !/#f4f1ec/.test(noir), "le pelage blanc ne s'applique pas");
    ok(!/#f4f1ec/.test(W.ChatNoir.svg("assis", {}, {})), "le pelage blanc déborde sur le dessin suivant");
    const sans = W.ChatNoir.vignette("x");
    vide(W.Boutique.catalogue.filter(o => o.noel || o.avent).filter(o => !/<svg/.test(W.ChatNoir.vignette(o.id)) || W.ChatNoir.vignette(o.id) === sans).map(o => o.id));
  });

  verifie("les rattrapages ne comptent pas comme des objets offerts au chat (badges)", () => {
    const prof = lire("profiles/profile.js");
    ok(/k\.indexOf\("avent"\) !== 0/.test(prof), "objetsChat compte les rattrapages du calendrier");
  });

  // ------------------------------------------------------------------
  groupe("Croquettes");
  const auj = (() => { const d = new Date(), p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); })();

  verifie("les chats déjà adoptés reçoivent une réserve de départ (7), et Minuit mange", () => {
    const W = charger({ chat: 5 });
    ok(W.Boutique.nourri("minuit"), "Minuit n'a pas mangé");
    egal(W.Boutique.reserve, 6);
  });

  verifie("réserve vide : le chat reste à la maison, un mot trouvé le ramène", () => {
    const W = charger({ chat: 5 }, { croq: { gains: { x: 1 }, repas: { "minuit:2001-01-01": 1 } } });
    ok(!W.Boutique.nourri("minuit"), "Minuit a mangé sans croquette");
    W.Boutique.evenement("victoire");
    ok(W.Boutique.nourri("minuit"), "le mot trouvé n'a pas nourri Minuit");
    egal(W.Boutique.reserve, 0);
  });

  verifie("pas assez pour tous : le plus complice mange d'abord", () => {
    const W = charger({ chat: 5, aube: 0 }, { complicite: 10, aube: { complicite: 50 }, croq: { gains: { x: 1 }, repas: {} } });
    ok(W.Boutique.nourri("aube") && !W.Boutique.nourri("minuit"), "Aube, plus complice, devait manger");
  });

  verifie("à complicité égale, le hasard départage (les deux peuvent manger)", () => {
    const vus = new Set();
    for (let i = 0; i < 40 && vus.size < 2; i++) {
      const W = charger({ chat: 5, aube: 0 }, { complicite: 20, aube: { complicite: 20 }, croq: { gains: { x: 1 }, repas: {} } });
      vus.add(W.Boutique.nourri("aube") ? "aube" : "minuit");
    }
    egal(vus.size, 2, "toujours le même chat");
  });

  verifie("un chat ne mange qu'une fois par jour, même sur deux appareils", () => {
    const W = charger({ chat: 5 });
    const f = W.Boutique.fusion(
      { objets: { chat: 5 }, croq: { gains: { depart: 7, "vic:A": 3 }, repas: { ["minuit:" + auj]: 1 } } },
      { objets: { chat: 5 }, croq: { gains: { depart: 7, "vic:B": 2 }, repas: { ["minuit:" + auj]: 1 } } });
    egal(Object.keys(f.croq.repas).length, 1, "le repas compté deux fois");
    egal(f.croq.gains.depart, 7, "la réserve de départ comptée deux fois");
    egal(f.croq.gains["vic:A"] + f.croq.gains["vic:B"], 5, "des mots trouvés perdus à la fusion");
  });

  verifie("la réserve plafonne à 255", () => {
    const W = charger({ chat: 5 }, { croq: { gains: { x: 300 }, repas: { ["minuit:" + auj]: 1 } } });
    egal(W.Boutique.reserve, 255);
    W.Boutique.evenement("victoire");
    egal(W.Boutique.reserve, 255, "un mot trouvé a dépassé le plafond");
    egal(W.Boutique.etat.croq.gains["vic:local"], undefined, "une croquette au-delà du plafond a été comptée");
  });

  verifie("la pâtée de fête nourrit deux jours sans toucher à la réserve", () => {
    const W = charger({ chat: 5 }, { complicite: 3, croq: { gains: { x: 4 }, repas: {} }, bonus: { "avent-14:pate": { pate: 1 } } });
    const avant = W.Boutique.reserve;
    ok(W.Boutique.donnerPate("minuit"));
    egal(W.Boutique.reserve, avant, "la pâtée a coûté des croquettes");
    egal(W.Boutique.patesRestantes(), 0);
    egal(Object.values(W.Boutique.etat.croq.repas).filter(v => v === "p").length, 2);
    egal(W.Boutique.etat.complicite, 8, "+5 de complicité attendus");
  });

  verifie("chaque case donne sa récompense une seule fois (croquettes, jetons, Traîneau, émote)", () => {
    const jetonsDonnes = [];
    const W = charger({ chat: 5 }, null, { jetonsCadeau: (cle, n) => jetonsDonnes.push(cle + "×" + n) });
    const r0 = W.Boutique.reserve;
    W.Avent.terminer(1, true); W.Avent.terminer(1, true);
    egal(W.Boutique.reserve, r0 + 3, "les croquettes du 1er décembre");
    W.Avent.terminer(8, false);
    egal(jetonsDonnes[0], "avent-08×2");
    W.Avent.terminer(10, true); W.Avent.terminer(10, true);
    egal(W.Boutique.totalBonus("traineau"), 2);
    W.Avent.terminer(7, false);
    ok(W.Boutique.possede("emote:noel"), "l'émote du 7 n'est pas débloquée");
    egal(W.Boutique.depense(), 5, "une récompense ne doit rien coûter");
  });
};
