#!/usr/bin/env node
/* ===================================================================
   Lanceur de tests Motus.

     node tests/run.js            tout
     node tests/run.js data       un seul fichier (data, jeu, ui, quete)

   Aucune dépendance pour les tests de DONNÉES : ils tournent partout.
   Les tests d'INTERFACE ont besoin de jsdom (npm install) ; s'il manque,
   ils sont signalés comme ignorés au lieu de faire échouer la série.
   =================================================================== */
"use strict";
const path = require("path");

const RACINE = path.join(__dirname, "..");
let bloc = "";
const resultats = [];

/* ---------- mini bibliothèque d'assertions ---------- */
function groupe(nom) { bloc = nom; }

/* Les tests asynchrones sont enregistrés ici pour être attendus en fin de
   fichier : sans ça un test qui renvoie une promesse était compté comme
   réussi avant même de s'exécuter. */
const enCours = [];

function verifie(nom, fn) {
  const b = bloc;                       // figé : le bloc peut changer d'ici la fin
  let r;
  try {
    r = fn();
  } catch (e) {
    resultats.push({ bloc: b, nom, etat: "ko", msg: e && e.message });
    return;
  }
  if (r && typeof r.then === "function") {
    const place = resultats.push({ bloc: b, nom, etat: "ok" }) - 1;
    enCours.push(r.then(
      () => {},
      (e) => { resultats[place] = { bloc: b, nom, etat: "ko", msg: e && e.message }; }
    ));
    return;
  }
  resultats.push({ bloc: b, nom, etat: "ok" });
}

function ignore(nom, pourquoi) {
  resultats.push({ bloc, nom, etat: "skip", msg: pourquoi });
}

/* Assertions volontairement bavardes : un test qui casse doit dire
   POURQUOI sans qu'on ait à rouvrir le code. */
const ok = (cond, msg) => { if (!cond) throw new Error(msg || "condition fausse"); };

const egal = (recu, attendu, msg) => {
  if (recu !== attendu) {
    throw new Error((msg ? msg + " — " : "") + "attendu " + JSON.stringify(attendu) + ", reçu " + JSON.stringify(recu));
  }
};

const vide = (liste, msg) => {
  const l = Array.from(liste || []);
  if (l.length) {
    const extrait = l.slice(0, 8).join(", ");
    throw new Error((msg ? msg + " — " : "") + l.length + " cas : " + extrait + (l.length > 8 ? "…" : ""));
  }
};

const outils = { groupe, verifie, ignore, ok, egal, vide, RACINE };

/* ---------- exécution ---------- */
const FICHIERS = {
  data: "data.test.js",
  jeu:  "jeu.test.js",
  ui:   "ui.test.js",
  quete:"quete.test.js"
};

(async () => {
  const choisi = process.argv[2];
  const aLancer = choisi ? { [choisi]: FICHIERS[choisi] } : FICHIERS;

  if (choisi && !FICHIERS[choisi]) {
    console.error("Fichier inconnu : " + choisi + "\nDisponibles : " + Object.keys(FICHIERS).join(", "));
    process.exit(2);
  }

  const t0 = Date.now();
  for (const [cle, fichier] of Object.entries(aLancer)) {
    const mod = require(path.join(__dirname, fichier));
    await mod(outils);
    await Promise.all(enCours.splice(0));   // on attend les tests asynchrones
  }

  /* ---------- rapport ---------- */
  let blocCourant = "";
  for (const r of resultats) {
    if (r.bloc !== blocCourant) { blocCourant = r.bloc; console.log("\n" + blocCourant); }
    const icone = r.etat === "ok" ? "  ✓" : r.etat === "skip" ? "  ~" : "  ✗";
    console.log(icone + " " + r.nom + (r.etat !== "ok" && r.msg ? "\n      " + r.msg : ""));
  }

  const passes  = resultats.filter(r => r.etat === "ok").length;
  const echecs  = resultats.filter(r => r.etat === "ko").length;
  const ignores = resultats.filter(r => r.etat === "skip").length;
  const duree   = ((Date.now() - t0) / 1000).toFixed(1);

  console.log("\n" + "-".repeat(50));
  console.log(passes + " réussis · " + echecs + " échoués" +
              (ignores ? " · " + ignores + " ignorés" : "") + "  (" + duree + " s)");

  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error("\nLe lanceur a planté :\n", e); process.exit(2); });
