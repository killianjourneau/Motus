/* ===================================================================
   Battle Royale (2.7.2) : une partie ne compte qu'une fois, les badges
   gonflés sont retirés après relecture du serveur, les émotes sont
   celles du Duel, et personne ne lance seul une partie à plusieurs.
   =================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const { dispo } = require("./harness");

module.exports = async function ({ groupe, verifie, ignore, ok, egal, RACINE }) {
  const lire = (f) => fs.readFileSync(path.join(RACINE, f), "utf8");
  groupe("Battle Royale");

  verifie("serveur : lancement à l'unanimité sous 4 joueurs, et l'ancien bouton ne force plus", () => {
    const sql = lire("duel/schema.sql");
    const v211 = sql.slice(sql.indexOf("-- v2.11 — Battle Royale"));
    ok(v211.length > 100, "section v2.11 absente");
    ok(/when count\(\*\) >= 4 then bool_or\(coalesce\(pret, false\)\)\s+else bool_and\(coalesce\(pret, false\)\)/.test(v211), "règle de lancement");
    ok(/create or replace function royale_start\(p_code text\)[\s\S]*?if royale_peut_lancer\(p_code\) then perform royale_demarrer/.test(v211), "royale_start passe encore en force");
    ok(/revoke execute on function royale_demarrer\(text\) from public, anon, authenticated/.test(v211), "le lancement interne ne doit pas être appelable");
  });

  verifie("émotes : la liste blanche du serveur couvre toutes celles du Duel", () => {
    const idx = lire("index.html"), sql = lire("duel/schema.sql");
    const v211 = sql.slice(sql.indexOf("-- v2.11 — Battle Royale"));
    const liste = (v211.match(/p_emote !~ '\^\(([^)]+)\)\$'/) || [])[1] || "";
    const bloc = idx.slice(idx.indexOf("const DUEL_EMOTES = ["), idx.indexOf("];", idx.indexOf("const DUEL_EMOTES = [")));
    const ids = [...bloc.matchAll(/id:"([a-z]+)"/g)].map(m => m[1]);
    egal(ids.length, 8, "8 émotes de Duel attendues");
    ids.forEach(id => ok(liste.split("|").includes(id), "le serveur refuserait : " + id));
    ok(!/ROY_EMOTES/.test(idx), "l'ancienne liste de Battle Royale existe encore");
    ok(/royRecevoirEmotes\(d\);\s*royDessine\(d\);/.test(idx), "les émotes reçues doivent être lues à chaque relecture, même en pleine manche");
  });

  verifie("salle d'attente (2.7.4) : quitter, retirer un absent, partie rapide, lien d'invitation", () => {
    const idx = lire("index.html"), sql = lire("duel/schema.sql");
    const v213 = sql.slice(sql.indexOf("-- v2.13 — Battle Royale"));
    ok(v213.length > 500, "section v2.13 absente");
    // partie rapide : plus de limite d'âge, seulement une salle où quelqu'un attend vraiment
    const quick = v213.slice(v213.indexOf("create or replace function royale_quick("));
    ok(!/created_at > now\(\) - interval '3 minutes'/.test(quick.slice(0, quick.indexOf("$$;"))), "la partie rapide ignore encore les salles de plus de 3 min");
    ok(/vu_at >= now\(\) - interval '30 seconds'\)/.test(quick), "la partie rapide doit viser une salle avec un joueur présent");
    // retirer : seulement un absent, seulement par un joueur de la salle
    const ret = v213.slice(v213.indexOf("create or replace function royale_retirer("));
    ok(/masque\(player_id\) = p_cible and player_id <> p_id\s+and vu_at < now\(\) - interval '30 seconds'/.test(ret), "retirer doit viser un absent, par son masque");
    ok(/update royale_players set vu_at = now\(\)\s+where room_id = v_code and player_id = p_id and not fantome;\s+if not found then return 'absent'/.test(ret), "seul un joueur de la salle peut retirer");
    // client
    ok(/id="royQuitterSalle"/.test(idx) && /\$\("royQuitterSalle"\)\.addEventListener\("click", royQuitter\)/.test(idx), "bouton Quitter la salle");
    ok(/#royaleOverlay \[data-close\]"\)\.addEventListener\("click", \(\)=>\{\s*if\(royCodeCourant && royEtat && royEtat\.status === "waiting"\) royQuitter\(\);/.test(idx), "la croix doit quitter la salle d'attente");
    ok(/royEntrer\(Royale\.join\(royCodeNet\(br\)\)\)/.test(idx), "le lien d'invitation doit faire entrer directement");
    ok(/if\(!inviteEnCours && !store\.get\("motus\.tour",false\)/.test(idx), "le guide ne doit pas recouvrir une invitation");
    ok(/if\(\+\+royAbsences === 2\) royReinscrire\(\);/.test(idx), "un joueur retiré pendant une absence doit être réinscrit");
    const net = new Function("return " + idx.match(/function royCodeNet\(c\)\{[^\n]+\}/)[0])();
    egal(net(" o1lb "), "011B"); egal(net("a0f3"), "A0F3");
  });

  if (!dispo()) { ignore("compteurs du profil", "jsdom absent — lance : npm install"); return; }
  const { JSDOM } = require("jsdom");
  const src = lire("profiles/profile.js");
  function profil(avant, royale) {
    const dom = new JSDOM("<!doctype html><body><div id='toast'></div></body>", { runScripts: "outside-only", url: "http://localhost/" });
    if (avant) dom.window.localStorage.setItem("motus.profile", JSON.stringify(avant));
    if (royale) dom.window.Royale = royale;
    dom.window.eval(src);
    return dom.window.Profile;
  }

  verifie("l'écran de fin redessiné 20 fois ne compte qu'une partie", () => {
    const P = profil();
    for (let i = 0; i < 20; i++) P.royaleDone({ code: "AB12", rang: 1, total: 180 });
    egal(P.royaleCompte().j, 1);
    egal(P.royaleCompte().v, 1);
    ok(P.state.badges.includes("br1") && P.state.badges.includes("brwin"));
    ok(!P.state.badges.includes("br10"), "badge 10 parties après une seule");
    P.royaleDone({ code: "CD34", rang: 3, total: 90 });
    egal(P.royaleCompte().j, 2); egal(P.royaleCompte().p, 2);
  });

  verifie("badges gonflés : retirés seulement une fois le bilan du serveur relu", () => {
    const avant = { id: "00000000-0000-0000-0000-00000000000a", xp: 0, games: 0, wins: 0, level: 1,
      badges: ["br1", "br10", "brwin"], emblem: "br10",
      b: { royParties: 37, royVictoires: 12, royPodiums: 30, royMeilleurTotal: 200 } };
    // sans serveur : rien n'est retiré
    const P0 = profil(avant);
    ok(P0.state.badges.includes("br10"), "retiré sans preuve");
    // avec le bilan : une seule partie, gagnée
    const P = profil(avant, { configured: () => true, bilan: () => Promise.resolve([{ code: "AB12", rang: 1, total: 180 }]) });
    P.royaleBilan();
    return new Promise(r => setTimeout(r, 30)).then(() => {
      egal(P.state.b.royBilan, 1, "bilan non relu");
      egal(P.royaleCompte().j, 1);
      ok(!P.state.badges.includes("br10"), "le badge 10 parties doit partir");
      ok(P.state.badges.includes("brwin"), "la victoire était réelle");
      egal(P.state.emblem, "", "l'emblème retiré doit être rendu");
      ok(P.state.badges.includes("br1"));
    });
  });
};
