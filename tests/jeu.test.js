/* ===================================================================
   Règles du jeu : évaluation des lettres, indice, thèmes.
   =================================================================== */
"use strict";
const { demarrer, dispo } = require("./harness");

module.exports = async function ({ groupe, verifie, ignore, ok, egal, vide }) {

  if (!dispo()) {
    groupe("Règles du jeu");
    ignore("tests d'interface", "jsdom absent — lance : npm install");
    return;
  }

  // ------------------------------------------------------------------
  groupe("Évaluation des lettres");

  const jeu = demarrer({
    expose: "function evaluate",
    noms: ["evaluate", "isValid", "useHint", "startFree",
           "getAnswer:()=>answer", "setAnswer:a=>{answer=a;len=a.length;}",
           "getGrid:()=>grid", "getMode:()=>mode",
           "getHintCols:()=>hintCols", "setHintEarned:n=>{hintEarned=n;}",
           "buildBoard", "computeSizing", "currentSplit"]
  });
  await jeu.attendre(200);

  verifie("le jeu démarre sans erreur", () => vide(jeu.erreurs, "erreurs au chargement"));

  verifie("une lettre bien placée est marquée correcte", () => {
    jeu.w.__t.setAnswer("MAISON");
    egal(jeu.w.__t.evaluate("MAISON").join(","), "correct,correct,correct,correct,correct,correct");
  });

  verifie("une lettre présente ailleurs est distinguée d'une absente", () => {
    jeu.w.__t.setAnswer("MAISON");
    const st = jeu.w.__t.evaluate("SIMONE");
    egal(st.length, 6);
    ok(st.includes("present"), "aucune lettre signalée comme mal placée");
    ok(st.includes("absent"), "aucune lettre signalée comme absente");
  });

  verifie("une lettre en double n'est comptée qu'autant de fois qu'elle existe", () => {
    /* piège classique : ELEVE contient deux E ; une proposition avec trois E
       ne doit pas en signaler trois. */
    jeu.w.__t.setAnswer("ELEVE");
    const st = jeu.w.__t.evaluate("EEEEE");
    const signalees = st.filter(x => x !== "absent").length;
    egal(signalees, 3, "ELEVE contient exactement trois E");
  });

  // ------------------------------------------------------------------
  groupe("Jeton d'indice");

  verifie("l'indice ne révèle jamais une lettre déjà connue", () => {
    /* régression : l'indice pouvait retomber sur une colonne déjà rouge,
       gaspillant le jeton. */
    const j = demarrer({
      expose: "function useHint",
      noms: ["useHint", "setAnswer:a=>{answer=a;len=a.length;}", "getHintCols:()=>hintCols",
             "setRowStates:v=>{rowStates=v;}", "setHintEarned:n=>{hintEarned=n;}", "startFree"],
      stockage: { "motus.seen":"true", "motus.hintEarned":"9", "motus.hintSpent":"0" }
    });
    j.w.__t.startFree("normal");
    j.w.__t.setAnswer("MAISON");
    // une tentative précédente a déjà confirmé les colonnes 0 et 1
    j.w.__t.setRowStates([["correct","correct","absent","absent","absent","absent"]]);
    for (let i = 0; i < 4; i++) { j.w.__t.setHintEarned(9); j.w.__t.useHint(); }
    const revelees = j.w.__t.getHintCols();
    vide(revelees.filter(c => c === 0 || c === 1), "colonnes déjà connues révélées");
  });

  // ------------------------------------------------------------------
  groupe("Modes à thème");

  verifie("seules les propositions du thème sont acceptées", () => {
    jeu.w.__t.startFree("persos");
    ok(jeu.w.__t.isValid("ZEUS"), "un personnage doit être accepté");
    ok(!jeu.w.__t.isValid("MAISON"), "un mot ordinaire doit être refusé en mode thème");
  });

  verifie("la forme prénom+nom est acceptée même si l'entrée est le nom seul", () => {
    jeu.w.__t.startFree("persos");
    ok(jeu.w.__t.isValid("BOBMARLEY"), "BOBMARLEY doit être accepté (entrée du jeu : MARLEY)");
  });

  verifie("un nom composé affiche une séparation visuelle", () => {
    jeu.w.__t.startFree("persos");
    jeu.w.__t.setAnswer("JEANNEDARC");
    egal(jeu.w.__t.currentSplit(), 6, "JEANNE|DARC");
    jeu.w.__t.setAnswer("ZEUS");
    egal(jeu.w.__t.currentSplit(), 0, "un nom simple ne doit pas être coupé");
  });

  verifie("la séparation reste sur une seule ligne", () => {
    jeu.w.__t.startFree("persos");
    jeu.w.__t.setAnswer("JEANNEDARC");
    jeu.w.__t.computeSizing(); jeu.w.__t.buildBoard();
    const lignes = [...jeu.d.querySelectorAll("#board .row")];
    egal(lignes.length, 6, "six tentatives");
    egal(lignes[0].querySelectorAll(".subrow").length, 0, "pas de sous-ligne");
    egal(lignes[0].querySelectorAll(".tile").length, 10, "toutes les cases sur la même ligne");
    const sep = [...lignes[0].children].findIndex(t => t.classList.contains("sep"));
    egal(sep, 6, "l'écart doit tomber entre le prénom et le nom");
  });
};
