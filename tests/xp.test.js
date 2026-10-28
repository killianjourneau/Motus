/* ===================================================================
   Expérience : barème et plafonds du jour (500 XP par mode, 50 XP de
   défaites). Le vrai profiles/profile.js est chargé dans jsdom.
   =================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const { dispo } = require("./harness");

module.exports = async function ({ groupe, verifie, ignore, ok, egal, RACINE }) {
  groupe("Expérience — plafonds du jour");
  if (!dispo()) { ignore("plafonds d'XP", "jsdom absent — lance : npm install"); return; }
  const { JSDOM } = require("jsdom");
  const src = fs.readFileSync(path.join(RACINE, "profiles", "profile.js"), "utf8");
  function profil(avant) {
    const dom = new JSDOM("<!doctype html><body><div id='toast'></div></body>", { runScripts: "outside-only", url: "http://localhost/" });
    if (avant) dom.window.localStorage.setItem("motus.profile", JSON.stringify(avant));
    dom.window.eval(src);
    return dom.window.Profile;
  }

  verifie("les défaites rapportent 50 XP par jour au plus (10 abandons)", () => {
    const P = profil();
    for (let i = 0; i < 15; i++) P.addGame({ won: false, xp: 5, mode: i % 2 ? "normal" : "pendu" });
    egal(P.state.xp, 50);
    egal(P.state.games, 15, "les parties restent toutes comptées");
  });

  verifie("un mode rapporte 500 XP par jour au plus, les autres restent ouverts", () => {
    const P = profil();
    for (let i = 0; i < 10; i++) P.addGame({ won: true, xp: 105, mode: "expert" });
    egal(P.state.xp, 500);
    P.addGame({ won: true, xp: 35, mode: "normal" });
    P.ajouterXp(38, "memo");
    egal(P.state.xp, 573);
    egal(P.state.wins, 10 + 1, "les victoires restent comptées même sans XP");
  });

  verifie("une victoire rapporte encore quand les défaites sont plafonnées", () => {
    const P = profil();
    for (let i = 0; i < 12; i++) P.addGame({ won: false, xp: 5, mode: "normal" });
    P.addGame({ won: true, xp: 35, mode: "normal" });
    egal(P.state.xp, 85);
  });

  verifie("les plafonds repartent à zéro le lendemain", () => {
    const P = profil({ id: "t", xp: 600, games: 20, wins: 10, level: 4,
      xpJour: { day: "2000-01-01", modes: { expert: 500 }, pertes: 50, avis: {} } });
    P.addGame({ won: true, xp: 105, mode: "expert" });
    P.addGame({ won: false, xp: 5, mode: "expert" });
    egal(P.state.xp, 710);
  });
};
