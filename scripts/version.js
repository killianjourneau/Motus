#!/usr/bin/env node
/* ===================================================================
   Bascule de version.

     node scripts/version.js            → corrige (1.50.1 → 1.50.2)
     node scripts/version.js mineure    → 1.50.1 → 1.51.0
     node scripts/version.js majeure    → 1.50.1 → 2.0.0
     node scripts/version.js 1.60.0     → version imposée
     node scripts/version.js --verifier → ne modifie rien, contrôle seulement

   Pourquoi un script : la version vit dans QUATRE endroits qui doivent
   rester alignés, et le nom du cache doit changer à chaque fois, sinon
   les navigateurs continuent de servir l'ancienne version. Le faire à la
   main a déjà provoqué des livraisons où les joueurs ne voyaient pas la
   mise à jour.
   =================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const lire  = f => fs.readFileSync(path.join(RACINE, f), "utf8");
const ecrire= (f, s) => fs.writeFileSync(path.join(RACINE, f), s);

/* ---------- état actuel ---------- */
function etatActuel() {
  const idx = lire("index.html"), sw = lire("sw.js");
  return {
    index:  (idx.match(/const VERSION\s*=\s*"([\d.]+)"/) || [])[1],
    sw:     (sw.match(/const V\s*=\s*"([\d.]+)"/) || [])[1],
    cache:  (sw.match(/const CACHE\s*=\s*"motus-v(\d+)"/) || [])[1],
    pkg:    JSON.parse(lire("package.json")).version,
    marques: [...new Set([...idx.matchAll(/\?v=([\d.]+)/g)].map(m => m[1]))]
  };
}

function verifier(e) {
  const soucis = [];
  if (!e.index) soucis.push("VERSION introuvable dans index.html");
  if (!e.sw)    soucis.push("const V introuvable dans sw.js");
  if (!e.cache) soucis.push("nom de cache introuvable ou mal formé dans sw.js");
  if (e.sw !== e.index)  soucis.push("sw.js annonce " + e.sw + " au lieu de " + e.index);
  if (e.pkg !== e.index) soucis.push("package.json annonce " + e.pkg + " au lieu de " + e.index);

  const perdues = e.marques.filter(v => v !== e.index);
  if (perdues.length) soucis.push("des ?v= restent sur " + perdues.join(", "));

  for (const f of ["rpg.html", "enfant.html"]) {
    const autres = [...new Set([...lire(f).matchAll(/\?v=([\d.]+)/g)].map(m => m[1]))]
      .filter(v => v !== e.index);
    if (autres.length) soucis.push(f + " reste sur " + autres.join(", "));
  }
  return soucis;
}

/* ---------- application ---------- */
function appliquer(ancienne, nouvelle, cache) {
  /* On remplace TOUTE étiquette ?v=, quelle que soit sa valeur : viser
     seulement l'ancienne version laissait passer les balises restées en
     arrière (rpg.html était figé en 1.34.1 depuis seize versions). */
  const reV = /\?v=[\d.]+/g;

  let idx = lire("index.html");
  idx = idx.replace(/const VERSION\s*=\s*"[\d.]+"/, 'const VERSION = "' + nouvelle + '"')
           .replace(reV, "?v=" + nouvelle);
  ecrire("index.html", idx);

  for (const f of ["rpg.html", "enfant.html"]) ecrire(f, lire(f).replace(reV, "?v=" + nouvelle));

  ecrire("sw.js", lire("sw.js")
    .replace(/const V\s*=\s*"[\d.]+"/, 'const V = "' + nouvelle + '"')
    .replace(/const CACHE\s*=\s*"motus-v\d+"/, 'const CACHE = "motus-v' + cache + '"'));

  const pkg = JSON.parse(lire("package.json"));
  pkg.version = nouvelle;
  ecrire("package.json", JSON.stringify(pkg, null, 2) + "\n");
}

/* ---------- exécution ---------- */
const arg = (process.argv[2] || "corrige").toLowerCase();
const e = etatActuel();

if (arg === "--verifier" || arg === "-v") {
  const soucis = verifier(e);
  if (soucis.length) {
    console.error("Versions incohérentes :");
    soucis.forEach(s => console.error("  ✗ " + s));
    process.exit(1);
  }
  console.log("Versions cohérentes : " + e.index + " (cache motus-v" + e.cache + ")");
  process.exit(0);
}

if (!e.index) { console.error("Version actuelle illisible dans index.html"); process.exit(2); }

let nouvelle;
if (/^\d+\.\d+\.\d+$/.test(arg)) nouvelle = arg;
else {
  const [maj, min, cor] = e.index.split(".").map(Number);
  if (arg === "majeure") nouvelle = (maj + 1) + ".0.0";
  else if (arg === "mineure") nouvelle = maj + "." + (min + 1) + ".0";
  else if (arg === "corrige") nouvelle = maj + "." + min + "." + (cor + 1);
  else { console.error("Argument inconnu : " + arg + "\nAttendu : corrige | mineure | majeure | X.Y.Z | --verifier"); process.exit(2); }
}

const cache = Number(e.cache) + 1;
appliquer(e.index, nouvelle, cache);

const apres = etatActuel();
const restants = verifier(apres);
if (restants.length) {
  console.error("La bascule a laissé des incohérences :");
  restants.forEach(s => console.error("  ✗ " + s));
  process.exit(1);
}
console.log(e.index + "  →  " + nouvelle + "   (cache motus-v" + e.cache + " → motus-v" + cache + ")");
console.log("Pense à lancer les tests avant de publier : npm test");
