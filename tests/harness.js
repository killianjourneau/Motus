/* ===================================================================
   Socle commun aux tests d'interface : démarre une page dans jsdom avec
   des données minimales et des services simulés.

   Le jeu vit dans un <script> anonyme : rien n'en sort naturellement.
   On injecte donc un `window.__t = {...}` juste avant la fermeture de la
   fonction, ce qui permet aux tests d'appeler les fonctions internes sans
   modifier le code de production.
   =================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

/* jsdom est cherché dans le projet, puis dans une installation globale :
   certains environnements n'autorisent pas npm install dans le dépôt. */
let JSDOM = null;
for (const chemin of ["jsdom"].concat(
      (process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean).map(d => path.join(d, "jsdom")))) {
  try { JSDOM = require(chemin).JSDOM; break; } catch (e) { /* on essaie le suivant */ }
}

const dispo = () => !!JSDOM;

/* Jeux de données réduits : les tests d'interface valident le comportement,
   pas le contenu (couvert par data.test.js). */
function donneesMini(w) {
  w.MOTUS_WORDS   = { court:["LUNE"], normal:["MAISON"], long:["ORDINATEUR"] };
  w.MOTUS_PRENOMS = ["MARIE"]; w.MOTUS_PRENOMS_SOL = ["MARIE"]; w.MOTUS_PRENOMS_INFO = { MARIE:"Notice." };
  w.MOTUS_MALADIES = ["GRIPPE"];
  w.MOTUS_VILLES = ["PARIS"]; w.MOTUS_VILLES_SOL = ["PARIS"]; w.MOTUS_VILLES_INFO = {};
  w.MOTUS_PERSOS = ["ZEUS","MARLEY","BOBMARLEY","JEANNEDARC"];
  w.MOTUS_PERSOS_SOL = ["ZEUS","MARLEY","JEANNEDARC"];
  w.MOTUS_PERSOS_INFO = { ZEUS:"Roi des dieux grecs.", MARLEY:"Bob Marley (1945-1981), chanteur.", JEANNEDARC:"Jeanne d'Arc (1412-1431)." };
  w.MOTUS_PERSOS_SPLIT = { JEANNEDARC:6 };
  w.MOTUS_RACE = {}; w.MOTUS_EXPERT = {};
}

function profilSimule(compteurs) {
  const vide = () => {};
  return {
    state: { id:"joueur-test", pseudo:"Testeur", level:3, emblem:"", b: compteurs || {} },
    badges: [{ id:"x", e:"*" }],
    addGame:vide, duelDone:vide, raceDone:vide, raceSolo:vide, giveUp:vide,
    defenseAttackResult:vide, defenseFeedNew:vide, defenseWordSet:vide,
    penduDone:vide, open:vide, submitDaily:vide, defiDone:vide, setHints:vide
  };
}

/**
 * Démarre une page.
 * @param {object} opt
 *   page      : "index.html" (défaut), "rpg.html", "enfant.html"
 *   expose    : nom d'une fonction présente dans le bloc à instrumenter
 *   noms      : fonctions/valeurs internes à rendre accessibles via w.__t
 *   stockage  : contenu initial du localStorage
 *   avant     : fonction(w) appelée avant l'évaluation (pour poser des stubs)
 */
function demarrer(opt) {
  if (!JSDOM) throw new Error("jsdom absent");
  const o = opt || {};
  const racine = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(racine, o.page || "index.html"), "utf8");

  // on retire les scripts : ils seront réinjectés un par un, après les stubs
  const squelette = html.replace(/<script src="[^"]*"><\/script>/g, "")
                        .replace(/<script>[\s\S]*?<\/script>/g, "");

  const dom = new JSDOM(squelette, { url:"https://motus.test/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window, d = w.document;

  const memoire = Object.assign({}, o.stockage || {});
  Object.defineProperty(w, "localStorage", {
    configurable: true,
    value: {
      getItem: k => (k in memoire ? memoire[k] : null),
      setItem: (k, v) => { memoire[k] = String(v); },
      removeItem: k => { delete memoire[k]; }
    }
  });

  w.MOTUS_CONFIG = {};
  w.fetch = (u) => String(u).includes("dico-")
    ? Promise.resolve({ ok:true, status:200, text:() => Promise.resolve("MAISON\nJARDIN") })
    : Promise.resolve({ ok:false, status:404, text:() => Promise.resolve(""), json:() => Promise.resolve(null) });

  donneesMini(w);
  w.Profile = profilSimule(o.compteurs);
  if (o.avant) o.avant(w, d);

  const blocs = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
  const erreurs = [];
  for (let src of blocs) {
    if (o.expose && o.noms && src.includes(o.expose)) {
      const i = src.lastIndexOf("})();");
      if (i > 0) src = src.slice(0, i) + "\nwindow.__t={" + o.noms.join(",") + "};\n" + src.slice(i);
    }
    try { w.eval(src); } catch (e) { erreurs.push(e.message); }
  }

  return {
    w, d, memoire, erreurs,
    clic: (el) => el.dispatchEvent(new w.Event("click", { bubbles:true })),
    attendre: (ms) => new Promise(r => setTimeout(r, ms || 60)),
    texte: (h) => String(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  };
}

module.exports = { demarrer, dispo };
