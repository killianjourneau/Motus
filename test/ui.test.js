/* ===================================================================
   Interface : thèmes, notifications, statistiques, accueil.
   =================================================================== */
"use strict";
const { demarrer, dispo } = require("./harness");

module.exports = async function ({ groupe, verifie, ignore, ok, egal, vide }) {

  if (!dispo()) {
    groupe("Interface");
    ignore("tests d'interface", "jsdom absent — lance : npm install");
    return;
  }

  const NOMS = ["applyTheme", "toggleTheme", "setTheme:t=>{theme=t;}", "getTheme:()=>theme",
                "renderPersonalize", "motusStatsHTML",
                "notifState", "notifEnable", "notifDisable", "notify", "notifDefense", "notifDaily",
                "tourShow", "TOUR", "getMode:()=>mode"];

  /* Notification simulée : on enregistre ce qui serait envoyé. */
  function avecNotifications(permission) {
    return (w) => {
      const envoyees = [];
      function N(titre, opt) { envoyees.push({ titre, opt }); }
      N.permission = permission;
      N.requestPermission = () => { N.permission = "granted"; return Promise.resolve("granted"); };
      w.Notification = N;
      w.__envoyees = envoyees;
      w.__visible = "hidden";
    };
  }
  function masquerOnglet(app) {
    Object.defineProperty(app.d, "visibilityState", { configurable:true, get: () => app.w.__visible });
  }

  // ------------------------------------------------------------------
  groupe("Thèmes");

  const th = demarrer({ expose:"function applyTheme", noms:NOMS, stockage:{ "motus.seen":"true", "motus.tour":"true" } });
  await th.attendre(150);

  verifie("les quatre thèmes appliquent leurs couleurs", () => {
    const attendu = {
      dark:      { rouge:"#e23a44", clair:false },
      light:     { rouge:"#e23a44", clair:true  },
      "dark-a":  { rouge:"#3b82f6", clair:false },
      "light-a": { rouge:"#1d63d1", clair:true  }
    };
    const soucis = [];
    for (const [nom, a] of Object.entries(attendu)) {
      th.w.__t.setTheme(nom); th.w.__t.applyTheme();
      const cs = th.w.getComputedStyle(th.d.documentElement);
      if (cs.getPropertyValue("--red").trim() !== a.rouge) soucis.push(nom + " (couleur)");
      const barre = th.d.querySelector("meta[name=theme-color]").content;
      if (a.clair !== (barre === "#eef2f9")) soucis.push(nom + " (barre système)");
    }
    vide(soucis);
  });

  verifie("les thèmes accessibles évitent la confusion rouge/jaune", () => {
    /* On simule la deutéranopie, la plus fréquente, et on vérifie que
       « bien placé » et « mal placé » restent nettement séparés. */
    const hex = h => [1,3,5].map(i => parseInt(h.substr(i,2),16));
    const simule = ([r,g,b]) => [0.625*r+0.375*g, 0.7*r+0.3*g, 0.3*g+0.7*b];
    const ecart = (a,b) => Math.hypot(...simule(hex(a)).map((v,i) => v - simule(hex(b))[i]));
    const paires = { "dark-a":["#3b82f6","#f59e0b"], "light-a":["#1d63d1","#c77400"] };
    const soucis = [];
    for (const [nom,[c,y]] of Object.entries(paires)) {
      const d = ecart(c, y);
      if (d < 150) soucis.push(nom + " (écart " + Math.round(d) + ", trop faible)");
    }
    vide(soucis);
  });

  verifie("la bascule rapide conserve le caractère accessible", () => {
    const attendu = { dark:"light", light:"dark", "dark-a":"light-a", "light-a":"dark-a" };
    const soucis = [];
    for (const [depart, arrivee] of Object.entries(attendu)) {
      th.w.__t.setTheme(depart); th.w.__t.toggleTheme();
      if (th.w.__t.getTheme() !== arrivee) soucis.push(depart + " → " + th.w.__t.getTheme());
    }
    vide(soucis, "un thème accessible ne doit pas se perdre d'un simple appui");
  });

  verifie("la couleur d'accent reste indépendante des couleurs de jeu", () => {
    th.w.__t.setTheme("dark-a"); th.w.__t.applyTheme();
    th.d.documentElement.dataset.accent = "green";
    const cs = th.w.getComputedStyle(th.d.documentElement);
    egal(cs.getPropertyValue("--red").trim(), "#3b82f6", "l'accent ne doit pas déteindre sur le jeu");
  });

  verifie("les quatre thèmes sont proposés au joueur", () => {
    const boite = th.d.createElement("div"); boite.id = "personalizeBox";
    th.d.body.appendChild(boite);
    th.w.__t.renderPersonalize();
    const libelles = [...th.d.querySelectorAll("[data-th]")].map(b => b.dataset.th);
    vide(["dark","light","dark-a","light-a"].filter(t => !libelles.includes(t)), "thèmes manquants du sélecteur");
  });

  // ------------------------------------------------------------------
  groupe("Notifications");

  verifie("les états possibles sont correctement rapportés", async () => {
    const cas = [
      { perm:"default", actif:false, attendu:"off" },
      { perm:"granted", actif:true,  attendu:"on" },
      { perm:"denied",  actif:true,  attendu:"bloque" }
    ];
    const soucis = [];
    for (const c of cas) {
      const app = demarrer({
        expose:"function notifState", noms:NOMS, avant:avecNotifications(c.perm),
        stockage: Object.assign({ "motus.seen":"true", "motus.tour":"true" }, c.actif ? { "motus.notif":"true" } : {})
      });
      await app.attendre(120);
      if (app.w.__t.notifState() !== c.attendu) soucis.push(c.perm + " → " + app.w.__t.notifState());
    }
    vide(soucis);
  });

  verifie("rien n'est envoyé quand le jeu est au premier plan", async () => {
    const app = demarrer({ expose:"function notifState", noms:NOMS, avant:avecNotifications("granted"),
                           stockage:{ "motus.seen":"true", "motus.tour":"true", "motus.notif":"true" } });
    masquerOnglet(app); await app.attendre(120);
    app.w.__visible = "visible";
    app.w.__t.notify("Titre", "Corps");
    egal(app.w.__envoyees.length, 0, "une notification ferait doublon avec le message affiché");
    app.w.__visible = "hidden";
    app.w.__t.notify("Titre", "Corps");
    await app.attendre(60);
    egal(app.w.__envoyees.length, 1, "onglet masqué : la notification doit partir");
  });

  verifie("le rappel du mot du jour ne se répète pas dans la journée", async () => {
    const app = demarrer({ expose:"function notifState", noms:NOMS, avant:avecNotifications("granted"),
                           stockage:{ "motus.seen":"true", "motus.tour":"true", "motus.notif":"true" } });
    masquerOnglet(app); await app.attendre(120);
    app.w.__t.notifDaily(); await app.attendre(50);
    const apres1 = app.w.__envoyees.length;
    app.w.__t.notifDaily(); await app.attendre(50);
    egal(app.w.__envoyees.length, apres1, "deuxième rappel envoyé le même jour");
  });

  verifie("rien n'est envoyé si le joueur a désactivé les notifications", async () => {
    const app = demarrer({ expose:"function notifState", noms:NOMS, avant:avecNotifications("granted"),
                           stockage:{ "motus.seen":"true", "motus.tour":"true" } });
    masquerOnglet(app); await app.attendre(120);
    app.w.__t.notify("A","b");
    app.w.__t.notifDefense([{ won:true, attacker_pseudo:"X", tries:3 }]);
    app.w.__t.notifDaily();
    await app.attendre(60);
    egal(app.w.__envoyees.length, 0);
  });

  // ------------------------------------------------------------------
  groupe("Statistiques");

  verifie("les compteurs synchronisés sont préférés aux compteurs locaux", async () => {
    const app = demarrer({
      expose:"function motusStatsHTML", noms:NOMS,
      compteurs:{ dist:[2,9,24,31,12,4], lost:8, msSum:1260000, msCount:82, best:14, mN:40, mP:15 },
      stockage:{ "motus.seen":"true", "motus.tour":"true" }
    });
    await app.attendre(120);
    const t = app.texte(app.w.__t.motusStatsHTML());
    ok(t.includes("90 parties"), "82 gagnées + 8 perdues attendues, reçu : " + t.slice(0, 60));
    ok(!t.includes("locales à cet appareil"), "l'avertissement local ne devrait pas apparaître");
    ok(t.includes("Par mode"), "le détail par mode est absent");
  });

  verifie("sans synchronisation, le joueur est averti", async () => {
    const app = demarrer({
      expose:"function motusStatsHTML", noms:NOMS, compteurs:{},
      stockage:{ "motus.seen":"true", "motus.tour":"true",
                 "motus.stats": JSON.stringify({ played:20, won:16, streak:4, best:7, fail:4, dist:{1:1,2:3,3:6,4:4,5:2,6:0} }) }
    });
    await app.attendre(120);
    ok(app.texte(app.w.__t.motusStatsHTML()).includes("locales à cet appareil"));
  });

  verifie("aucune division par zéro chez un joueur sans partie", async () => {
    const app = demarrer({ expose:"function motusStatsHTML", noms:NOMS, compteurs:{},
                           stockage:{ "motus.seen":"true", "motus.tour":"true" } });
    await app.attendre(120);
    const h = app.w.__t.motusStatsHTML();
    ok(!/NaN|Infinity/.test(h), "valeur non calculable affichée telle quelle");
  });

  // ------------------------------------------------------------------
  groupe("Accueil du nouveau joueur");

  verifie("le guide s'ouvre à la première visite et pas ensuite", async () => {
    const neuf = demarrer({ expose:"function tourShow", noms:NOMS, stockage:{} });
    await neuf.attendre(700);
    ok(neuf.d.getElementById("tourOverlay").classList.contains("open"), "guide absent au premier lancement");
    ok(!neuf.d.getElementById("helpOverlay").classList.contains("open"), "l'ancien pavé de règles ne doit plus s'ouvrir");

    const revenu = demarrer({ expose:"function tourShow", noms:NOMS,
                              stockage:{ "motus.seen":"true", "motus.tour":"true" } });
    await revenu.attendre(700);
    ok(!revenu.d.getElementById("tourOverlay").classList.contains("open"), "le guide revient alors qu'il a été vu");
  });

  verifie("le guide compte trois étapes et lance une partie à la fin", async () => {
    const app = demarrer({ expose:"function tourShow", noms:NOMS, stockage:{} });
    await app.attendre(700);
    egal(app.w.__t.TOUR.length, 3);
    for (let i = 0; i < 2; i++) { app.clic(app.d.getElementById("tourNext")); await app.attendre(40); }
    egal(app.d.getElementById("tourNext").textContent, "Jouer le mot du jour");
    app.clic(app.d.getElementById("tourNext")); await app.attendre(150);
    ok(!app.d.getElementById("tourOverlay").classList.contains("open"), "le guide devrait se fermer");
    egal(app.w.__t.getMode(), "daily", "la première partie doit être lancée");
    egal(app.memoire["motus.tour"], "true", "le guide doit être marqué comme vu");
  });

  verifie("un clic à côté ne fait pas disparaître le guide", async () => {
    /* sinon il se fermerait sans être marqué comme vu et reviendrait
       au lancement suivant. */
    const app = demarrer({ expose:"function tourShow", noms:NOMS, stockage:{} });
    await app.attendre(700);
    const ov = app.d.getElementById("tourOverlay");
    app.clic(ov); await app.attendre(40);
    ok(ov.classList.contains("open"));
  });
};
