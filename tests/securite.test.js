/* ===================================================================
   Sécurité des comptes (2.7.2) : le code d'un compte (son uuid) ne doit
   jamais sortir de la base pour un AUTRE joueur. On vérifie le schéma
   (masques, droits de lecture) et le client (aucune lecture directe de
   l'identifiant, masque calculé comme la base).
   =================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

module.exports = async function ({ groupe, verifie, ok, egal, vide, RACINE }) {
  const lire = (f) => fs.readFileSync(path.join(RACINE, f), "utf8");
  const sql = lire("duel/schema.sql");
  const v212 = sql.slice(sql.indexOf("-- v2.12 — SÉCURITÉ DES COMPTES"));
  groupe("Sécurité des comptes");

  verifie("tables : l'identifiant et les données privées ne sont plus lisibles", () => {
    ok(v212.length > 1000, "section v2.12 absente");
    ok(/revoke all on profiles from anon, authenticated/.test(v212), "profiles encore lisible en entier");
    const gp = (v212.match(/grant select \(([^)]*)\)\s*on profiles/) || [])[1] || "";
    ok(gp && !/\bid\b/.test(gp) && !/\bdata\b/.test(gp), "profiles : id ou data encore lisibles (" + gp + ")");
    const gd = (v212.match(/grant select \(([^)]*)\) on daily_results/) || [])[1] || "";
    ok(gd && !/player_id/.test(gd), "daily_results : player_id encore lisible");
    const gr = (v212.match(/grant select \(([^)]*)\) on race_records/) || [])[1] || "";
    ok(gr && !/player_id/.test(gr), "race_records : player_id encore lisible");
    ["memo_records", "traineau_records", "royale_rooms", "royale_players"].forEach(t =>
      ok(new RegExp("revoke all on [^;]*\\b" + t + "\\b").test(v212), t + " encore lisible"));
  });

  verifie("fonctions : un autre joueur n'est désigné que par son masque", () => {
    // la DERNIÈRE définition de chaque fonction est celle qui compte
    const derniere = (nom) => { const i = sql.lastIndexOf("create or replace function " + nom + "("); return i < 0 ? "" : sql.slice(i, sql.indexOf("$$;", sql.indexOf("$$", i) + 2)); };
    ok(/masque\(p\.player_id\)/.test(derniere("royale_state")), "royale_state renvoie les codes des joueurs");
    ok(/select masque\(d\.player_id\)/.test(derniere("defense_targets")), "defense_targets renvoie les codes");
    ok(/select masque\(a\.defender_id\)/.test(derniere("defense_history")), "defense_history renvoie les codes");
    ["duel_create", "duel_join", "duel_get", "duel_report", "duel_emote", "duel_moves", "race_create", "race_join", "duel_quick", "race_quick"]
      .forEach(f => { const c = derniere(f); ok(c && !/return v_row;/.test(c) && /duel_masque\(v_row\)/.test(c), f + " renvoie la ligne sans masque"); });
    ["defense_attack", "defense_report", "defense_rate"].forEach(f =>
      ok(/defense_cible\(p_target\)/.test(derniere(f)), f + " n'accepte pas le masque de la cible"));
    ok(/revoke execute on function defense_cible\(uuid\) from public, anon, authenticated/.test(v212), "le résolveur de masque doit rester interne");
  });

  verifie("le client ne lit ni n'écrit plus les tables par l'identifiant", () => {
    const prof = lire("profiles/profile.js"), duel = lire("duel/duel.js"), idx = lire("index.html");
    // seules exceptions : les replis pour une base pas encore mise à jour (où
    // l'identifiant était lisible de toute façon ; une base à jour les refuse)
    const horsReplis = [prof, duel, idx].join("\n").split("\n")
      .filter(l => !/getAncien\(|base pas à jour/.test(l)).join("\n");
    vide(horsReplis.match(/select=[^"&]*\bid\b/g) || [], "requête select=id");
    vide(horsReplis.match(/player_id=eq\./g) || [], "filtre player_id=eq.");
    // écriture : par les fonctions de la base ; l'écriture directe n'existe
    // plus que comme repli quand la fonction est absente (base pas à jour)
    ok(/rpcP\("profil_ecrire", donnees\)/.test(prof) && /if \(absente\(e\)\) pushAncien\(/.test(prof), "écriture directe du profil");
    ok((prof.match(/rest\/v1\/profiles", \{/g) || []).length === 1, "une seule écriture directe du profil (le repli)");
    ok(/if \(!absente\(e\)\) return false;\s*return fetch\(API \+ "\/rest\/v1\/daily_results\?on_conflict/.test(prof), "écriture directe des résultats du jour hors repli");
    ok(/id === m\.pub/.test(duel) && /pub: \(window\.Profile && window\.Profile\.masque\)/.test(duel), "le client ne se reconnaît pas par son masque");
  });

  verifie("schema.sql se rejoue en entier : chaque changement de type de retour est précédé d'un drop", () => {
    // PostgreSQL refuse « create or replace » si le type de retour change ;
    // rejouer tout le fichier recrée d'abord les ANCIENNES versions, donc
    // chaque définition d'une fonction dont le retour varie doit avoir son drop.
    const re = /create or replace function\s+(\w+)\s*\(([\s\S]*?)\)\s*returns\s+(table\s*\([\s\S]*?\)|setof \w+|\S+)/gi;
    const defs = []; let m;
    while ((m = re.exec(sql))) {
      const types = m[2].split(",").map(a => a.replace(/\bdefault\b.*/i, "").trim().split(/\s+/)[1] || "").join(",");
      defs.push({ nom: m[1], types, ret: m[3].replace(/\s+/g, " ").toLowerCase(), pos: m.index });
    }
    const manque = [];
    defs.forEach(d => {
      const autres = defs.filter(x => x.nom === d.nom && x.types === d.types);
      if (new Set(autres.map(x => x.ret)).size < 2) return;
      const avant = sql.slice(Math.max(0, d.pos - 400), d.pos);
      if (!new RegExp("drop function if exists " + d.nom + "\\(").test(avant))
        manque.push(d.nom + " (ligne " + (sql.slice(0, d.pos).split("\n").length) + ")");
    });
    vide(manque, "drop manquant avant");
  });

  verifie("fichiers déployés avant le SQL : rien ne casse (régression 2.7.2)", () => {
    const duel = lire("duel/duel.js"), prof = lire("profiles/profile.js"), idx = lire("index.html");
    // se reconnaître : par le masque (base à jour) OU par le code (base pas à jour)
    ok(/function soiMeme\(id, m\) \{ return !!id && \(id === m\.pub \|\| String\(id\)\.toLowerCase\(\) === m\.id\); \}/.test(duel), "soiMeme");
    ok(/moi: soiMeme\(x\.player_id, m\)/.test(duel), "Battle Royale : se reconnaître des deux façons");
    ok((duel.match(/soiMeme\(d\.p1_id, m\)/g) || []).length === 2, "Duel et Course : se reconnaître des deux façons");
    ok(/rpc\("royale_start", \{ p_code: code \}\)/.test(duel.slice(duel.indexOf("lobby: function"))), "sans vote côté base, « Lancer » doit lancer");
    // profil : sans les fonctions v2.12, retour aux anciennes requêtes
    ok(/e\.absente = r\.status === 404/.test(prof), "fonction absente non détectée");
    ["pushAncien(", "getAncien(\"profiles?select=*&id=eq.", "daily_results?on_conflict=player_id,game,day"].forEach(x =>
      ok(prof.includes(x.replace(/\\/g, "")), "repli manquant : " + x));
    // la salle d'attente ne met pas dehors sur une seule lecture
    ok(/if\(\+\+royAbsences >= 3\) royHorsSalle\("Tu n'es plus dans cette salle\."\)/.test(idx), "sortie de salle trop rapide");
  });

  verifie("le masque calculé par le jeu est celui de la base", () => {
    const src = lire("profiles/profile.js");
    const debut = src.indexOf("  function md5hex(str) {"), fin = src.indexOf("  function todayStr()");
    const f = new Function(src.slice(debut, fin) + "; return { md5hex, masqueDe };")();
    ["", "abc", "x".repeat(55), "y".repeat(56), "z".repeat(119)].forEach(t =>
      egal(f.md5hex(t), crypto.createHash("md5").update(t).digest("hex"), "md5 faux (" + t.length + " car.)"));
    const id = "11111111-1111-4111-8111-111111111111";
    const h = crypto.createHash("md5").update("mes-public:" + id).digest("hex");
    egal(f.masqueDe(id.toUpperCase()), [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join("-"));
    ok(/md5\('mes-public:' \|\| p::text\)::uuid/.test(v212), "la base n'utilise plus le même masque");
  });
};
