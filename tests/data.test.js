/* ===================================================================
   Cohérence des données. Aucune dépendance : ces tests tournent partout
   et couvrent les erreurs qui ont RÉELLEMENT eu lieu sur ce projet.
   =================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

module.exports = function ({ groupe, verifie, ok, egal, vide, RACINE }) {
  const dico = (f) => path.join(RACINE, "dico", f);

  /* charge un fichier de données qui pose ses valeurs sur window */
  function charger(fichiers) {
    const w = {};
    global.window = w;
    for (const f of fichiers) {
      delete require.cache[require.resolve(dico(f))];
      require(dico(f));
    }
    return w;
  }

  /* Mis en cache : sans ça on relisait le fichier pour CHACUN des ~18 000
     mots à vérifier, et la série passait de 2 s à près de 2 min. */
  const cacheDico = {};
  function motsAcceptes(L) {
    if (L in cacheDico) return cacheDico[L];
    const p = dico("dico-" + String(L).padStart(2, "0") + ".txt");
    cacheDico[L] = fs.existsSync(p)
      ? new Set(fs.readFileSync(p, "utf8").split("\n").filter(Boolean))
      : null;
    return cacheDico[L];
  }

  // ------------------------------------------------------------------
  groupe("Dictionnaires d'acceptation");

  verifie("chaque fichier est trié, sans doublon ni ligne mal formée", () => {
    const soucis = [];
    for (let L = 4; L <= 15; L++) {
      const p = dico("dico-" + String(L).padStart(2, "0") + ".txt");
      if (!fs.existsSync(p)) continue;
      const lignes = fs.readFileSync(p, "utf8").split("\n").filter(Boolean);
      if (new Set(lignes).size !== lignes.length) soucis.push(path.basename(p) + " (doublons)");
      const mauvais = lignes.filter(m => !/^[A-Z]+$/.test(m) || m.length !== L);
      if (mauvais.length) soucis.push(path.basename(p) + " (" + mauvais.length + " mots invalides)");
      for (let i = 1; i < lignes.length; i++) {
        if (lignes[i - 1] > lignes[i]) { soucis.push(path.basename(p) + " (non trié)"); break; }
      }
    }
    vide(soucis);
  });

  verifie("les mots signalés par les joueurs sont acceptés", () => {
    // régression : le filtre de contenu avait supprimé des mots légitimes
    const attendus = ["ANALPHABETE", "ANALPHABETISME", "ATTARDER", "SALOPETTE", "ANALGESIQUE"];
    const absents = attendus.filter(m => { const s = motsAcceptes(m.length); return s && !s.has(m); });
    vide(absents, "mots légitimes manquants");
  });

  verifie("les mots offensants restent exclus", () => {
    const interdits = ["CONNARD", "MERDEUX", "SALOPE", "NEGRE", "BAMBOULA", "PUTAIN", "ENCULE", "NIQUE"];
    const revenus = interdits.filter(m => { const s = motsAcceptes(m.length); return s && s.has(m); });
    vide(revenus, "mots offensants réapparus");
  });

  // ------------------------------------------------------------------
  groupe("Mots à deviner");

  verifie("tout mot tirable est accepté par le dictionnaire", () => {
    // régression : ANALES/ABRUTIE/ABRUTIS étaient tirables sans être validables
    const w = charger(["motus-words.js", "motus-expert.js", "motus-race.js"]);
    const pools = {
      "motus-words":  [].concat(w.MOTUS_WORDS.court, w.MOTUS_WORDS.normal, w.MOTUS_WORDS.long),
      "motus-expert": Object.values(w.MOTUS_EXPERT).flat(),
      "motus-race":   Object.values(w.MOTUS_RACE).flat()
    };
    const soucis = [];
    for (const [nom, mots] of Object.entries(pools)) {
      for (const m of mots) {
        const s = motsAcceptes(m.length);
        if (s && !s.has(m)) soucis.push(nom + ":" + m);
      }
    }
    vide(soucis, "mots indevinables");
  });

  // ------------------------------------------------------------------
  groupe("Thèmes documentés");

  verifie("chaque prénom tirable a son étymologie", () => {
    // régression : 72 % des prénoms tirables n'avaient aucune notice
    const w = charger(["motus-prenoms.js", "motus-prenoms-info.js"]);
    ok(Array.isArray(w.MOTUS_PRENOMS_SOL), "MOTUS_PRENOMS_SOL doit exister, sinon le jeu tire dans TOUTE la liste");
    vide(w.MOTUS_PRENOMS_SOL.filter(p => !w.MOTUS_PRENOMS_INFO[p]), "prénoms sans notice");
  });

  verifie("chaque personnage tirable a sa notice", () => {
    const w = charger(["motus-persos.js", "motus-persos-info.js"]);
    ok(Array.isArray(w.MOTUS_PERSOS_SOL), "MOTUS_PERSOS_SOL doit exister");
    vide(w.MOTUS_PERSOS_SOL.filter(p => !w.MOTUS_PERSOS_INFO[p]), "personnages sans notice");
  });

  verifie("tout personnage tirable est aussi acceptable à la saisie", () => {
    const w = charger(["motus-persos.js"]);
    const acceptes = new Set(w.MOTUS_PERSOS);
    vide(w.MOTUS_PERSOS_SOL.filter(p => !acceptes.has(p)), "tirables mais refusés");
  });

  verifie("les formes prénom+nom sont acceptées", () => {
    // régression : « bobmarley » était refusé alors que l'entrée est « MARLEY »
    const w = charger(["motus-persos.js"]);
    const a = new Set(w.MOTUS_PERSOS);
    vide(["BOBMARLEY", "ALPACINO", "MARILYNMONROE"].filter(m => !a.has(m)));
  });

  verifie("les noms tirables respectent les bornes du plateau", () => {
    /* Le TIRET est une lettre à part entière en Prénoms et Villes (touche
       dédiée au clavier) : il est donc autorisé. Seules les listes TIRABLES
       sont bornées 4-15 — la liste acceptée peut contenir des noms plus
       courts, on a juste le droit de les taper. */
    const w = charger(["motus-persos.js", "motus-prenoms.js"]);
    const mauvais = [].concat(w.MOTUS_PERSOS_SOL, w.MOTUS_PRENOMS_SOL)
      .filter(m => !/^[A-Z-]+$/.test(m) || m.length < 4 || m.length > 15);
    vide(mauvais, "hors bornes 4-15 ou caractères interdits");
  });

  verifie("le thème Personnages ne contient ni groupe ni objet", () => {
    // règle posée par l'utilisateur : uniquement des personnes/personnages
    const w = charger(["motus-persos.js", "motus-persos-info.js"]);
    const I = w.MOTUS_PERSOS_INFO;
    vide(Object.keys(I).filter(k => /^(Groupe|Duo|Épée|Objet|Œuvre)\b/i.test(I[k])), "entités non-personnes");
  });

  verifie("les coupures prénom/nom tombent à l'intérieur du nom", () => {
    const w = charger(["motus-persos.js", "motus-persos-info.js", "motus-persos-split.js"]);
    const S = w.MOTUS_PERSOS_SPLIT || {};
    const connus = new Set(w.MOTUS_PERSOS);
    const mauvais = Object.keys(S).filter(k => !connus.has(k) || S[k] < 1 || S[k] >= k.length);
    vide(mauvais, "coupures invalides");
  });

  // ------------------------------------------------------------------
  groupe("Profil et badges");

  verifie("aucun identifiant de badge en double", () => {
    // régression : les badges Personnages allaient écraser ceux des mots courts
    const src = fs.readFileSync(path.join(RACINE, "profiles", "profile.js"), "utf8");
    const ids = [...src.matchAll(/\{\s*id:\s*"([A-Za-z0-9_]+)"/g)].map(m => m[1]);
    ok(ids.length > 50, "trop peu de badges détectés, l'extraction a dû changer");
    vide(ids.filter((v, i) => ids.indexOf(v) !== i), "identifiants dupliqués");
  });

  // ------------------------------------------------------------------
  groupe("Appels au serveur");

  verifie("toute fonction SQL renvoyant une liste passe par rpcList", () => {
    /* régression majeure : rpc() ne renvoie que la PREMIÈRE ligne. Employé
       sur une fonction « returns table », il tronque silencieusement — c'est
       ce qui cachait les propositions et les défenses attaquables. */
    const sql = fs.readFileSync(path.join(RACINE, "duel", "schema.sql"), "utf8");
    const js = fs.readFileSync(path.join(RACINE, "duel", "duel.js"), "utf8");
    /* « returns table » ne signifie pas forcément plusieurs lignes :
       defense_attack en déclare une seule (le mot ciblé). On ne contrôle
       donc que les fonctions réellement multi-lignes. */
    const UNE_SEULE_LIGNE = ["defense_attack"];
    const listes = [...sql.matchAll(/create or replace function\s+(\w+)\s*\([^)]*\)\s*returns table/gi)]
      .map(m => m[1])
      .filter(fn => !UNE_SEULE_LIGNE.includes(fn));
    ok(listes.length > 0, "aucune fonction multi-lignes repérée");
    const fautifs = listes.filter(fn => new RegExp('\\brpc\\(\\s*"' + fn + '"').test(js));
    vide(fautifs, "appelées via rpc() au lieu de rpcList()");
  });

  verifie("chaque fonction SQL redéfinie est précédée de son drop", () => {
    /* PostgreSQL refuse un changement de type de retour, et garde deux
       surcharges si la signature change : sans drop, la migration casse. */
    const sql = fs.readFileSync(path.join(RACINE, "duel", "schema.sql"), "utf8");
    const aVerifier = ["perso_suggest", "perso_approved", "perso_pending", "defense_set", "defense_targets", "defense_feed"];
    vide(aVerifier.filter(fn => !new RegExp("drop function if exists\\s+" + fn + "\\s*\\(", "i").test(sql)),
         "sans drop préalable");
  });

  // ------------------------------------------------------------------
  groupe("Mesure d'audience");

  verifie("aucun identifiant n'est transmis avec les compteurs", () => {
    /* la mesure doit rester anonyme : stats_ping ne prend qu'une clé. */
    const sql = fs.readFileSync(path.join(RACINE, "duel", "schema.sql"), "utf8");
    const m = sql.match(/create or replace function stats_ping\(([^)]*)\)/i);
    ok(m, "stats_ping introuvable");
    ok(!/uuid/i.test(m[1]), "stats_ping reçoit un identifiant : la mesure ne serait plus anonyme");
  });

  verifie("les clés mesurées sont acceptées par la liste blanche SQL", () => {
    const sql = fs.readFileSync(path.join(RACINE, "duel", "schema.sql"), "utf8");
    const m = sql.match(/v_cle !~ '([^']+)'/);
    ok(m, "liste blanche introuvable dans stats_ping");
    const re = new RegExp(m[1]);
    const modes = ["court","normal","long","expert","pendu","daily","defi",
                   "prenoms","maladies","villes","persos","duel","race","defense"];
    const cles = ["visite","nouveau","fidele","installe"]
      .concat(modes.map(x => "partie:" + x))
      .concat(modes.map(x => "gagne:" + x));
    vide(cles.filter(c => !re.test(c)), "clés que la base refuserait");
  });

  verifie("la lecture des statistiques est réservée à l'administrateur", () => {
    const sql = fs.readFileSync(path.join(RACINE, "duel", "schema.sql"), "utf8");
    const bloc = sql.slice(sql.indexOf("function stats_read"));
    ok(/is_admin\(/.test(bloc.slice(0, 600)), "stats_read n'est pas protégée par is_admin");
  });

  // ------------------------------------------------------------------
  groupe("Cohérence des versions");

  verifie("index.html, sw.js et les ?v= annoncent la même version", () => {
    const idx = fs.readFileSync(path.join(RACINE, "index.html"), "utf8");
    const sw  = fs.readFileSync(path.join(RACINE, "sw.js"), "utf8");
    const vIdx = (idx.match(/const VERSION\s*=\s*"([\d.]+)"/) || [])[1];
    const vSw  = (sw.match(/const V\s*=\s*"([\d.]+)"/) || [])[1];
    ok(vIdx, "VERSION introuvable dans index.html");
    egal(vSw, vIdx, "sw.js et index.html divergent");

    /* Les TROIS pages, pas seulement index.html : rpg.html était resté
       figé seize versions en arrière sans que rien ne le signale. */
    const perdues = [];
    for (const f of ["index.html", "rpg.html", "enfant.html"]) {
      const h = fs.readFileSync(path.join(RACINE, f), "utf8");
      [...new Set([...h.matchAll(/\?v=([\d.]+)/g)].map(m => m[1]))]
        .filter(v => v !== vIdx)
        .forEach(v => perdues.push(f + " → " + v));
    }
    vide(perdues, "des ?v= traînent sur une ancienne version");
  });

  verifie("le cache du service worker change à chaque version", () => {
    const sw = fs.readFileSync(path.join(RACINE, "sw.js"), "utf8");
    ok(/const CACHE\s*=\s*"motus-v\d+"/.test(sw), "nom de cache absent ou mal formé");
  });

  /* ---------- Exercices quotidiens ----------
     Retours de joueurs : une question qui contient déjà la réponse rend
     l'exercice sans intérêt. Ces tests l'interdisent pour de bon. */
  verifie("grammaire : aucune indication ne donne la réponse", () => {
    const w = charger(["motus-grammaire.js"]);
    const G = w.MOTUS_GRAMMAIRE, n = (x) => x.normalize("NFC").toLowerCase().trim();
    const fuites = G.filter(x => x.i.split(/\s*\/\s*/).length === 1 && n(x.i) === n(x.r[0]))
                    .map(x => x.p);
    vide(fuites, "indication identique à la réponse");
  });

  verifie("grammaire : un choix n'est jamais trahi par sa position", () => {
    // la bonne réponse toujours en tête serait une fuite : ordre alphabétique imposé
    const w = charger(["motus-grammaire.js"]);
    const mal = w.MOTUS_GRAMMAIRE.filter(x => {
      const o = x.i.split(/\s*\/\s*/);
      return o.length > 1 && o.join("|") !== o.slice().sort((a, b) => a.localeCompare(b, "fr")).join("|");
    }).map(x => x.i);
    vide(mal, "choix non triés");
  });

  verifie("orthographe : la phrase ne contient jamais le mot à écrire", () => {
    const w = charger(["motus-ortho.js"]);
    const fuites = w.MOTUS_ORTHO.filter(x =>
      x.p.toLowerCase().split(/[^a-zàâäéèêëîïôöùûüç'-]+/).includes(x.r[0].toLowerCase())
    ).map(x => x.p);
    vide(fuites, "réponse présente dans la phrase");
  });

  verifie("orthographe : chaque exercice a une bonne graphie et trois fausses", () => {
    const w = charger(["motus-ortho.js"]);
    const pb = w.MOTUS_ORTHO.filter(x =>
      !x.c || x.c.length < 3 || new Set(x.c).size !== x.c.length ||
      x.c.some(c => c.toLowerCase() === x.r[0].toLowerCase())
    ).map(x => x.p);
    vide(pb, "leurres invalides");
  });

  verifie("les bibliothèques quotidiennes ont assez de réserve", () => {
    // l'entraînement libre tournerait en rond trop vite en dessous
    const g = charger(["motus-grammaire.js"]).MOTUS_GRAMMAIRE;
    const o = charger(["motus-ortho.js"]).MOTUS_ORTHO;
    ok(g.length >= 150, "grammaire : " + g.length + " exercices, 150 attendus");
    ok(o.length >= 130, "orthographe : " + o.length + " exercices, 130 attendus");
    egal(new Set(g.map(x => x.p)).size, g.length, "phrases de grammaire uniques");
    egal(new Set(o.map(x => x.p)).size, o.length, "phrases d'orthographe uniques");
  });

  verifie("tous les fichiers de données sont dans le cache hors-ligne", () => {
    const sw  = fs.readFileSync(path.join(RACINE, "sw.js"), "utf8");
    const idx = fs.readFileSync(path.join(RACINE, "index.html"), "utf8");
    const charges = [...idx.matchAll(/<script src="\.\/dico\/([\w-]+\.js)/g)].map(m => m[1]);
    vide(charges.filter(f => !sw.includes(f)), "chargés par le jeu mais absents du cache");
  });

  // ------------------------------------------------------------------
  groupe("Syntaxe");

  verifie("les scripts embarqués des pages HTML sont valides", () => {
    const soucis = [];
    for (const f of ["index.html", "enfant.html", "rpg.html"]) {
      const h = fs.readFileSync(path.join(RACINE, f), "utf8");
      const blocs = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
      blocs.forEach((b, i) => { try { new Function(b); } catch (e) { soucis.push(f + " bloc " + i + " : " + e.message); } });
    }
    vide(soucis);
  });

  verifie("les fichiers JavaScript autonomes sont valides", () => {
    const soucis = [];
    for (const f of ["sw.js", "duel/duel.js", "profiles/profile.js", "profiles/config.js"]) {
      const p = path.join(RACINE, f);
      if (!fs.existsSync(p)) continue;
      try { new Function(fs.readFileSync(p, "utf8")); } catch (e) { soucis.push(f + " : " + e.message); }
    }
    vide(soucis);
  });
};
