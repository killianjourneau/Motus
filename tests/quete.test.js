/* ===================================================================
   Motus Quête : cohérence des données et ÉQUILIBRAGE.

   L'équilibrage se vérifie par simulation : c'est ce qui avait révélé que
   l'aventure était mathématiquement infaisable (PV des monstres ×13 face à
   des dégâts joueur quasi constants). Ces chiffres ne doivent pas repartir
   à la dérive sans qu'on le voie.
   =================================================================== */
"use strict";
const path = require("path");

module.exports = function ({ groupe, verifie, ok, egal, vide, RACINE }) {

  const w = {};
  global.window = w;
  delete require.cache[require.resolve(path.join(RACINE, "dico", "motus-rpg.js"))];
  require(path.join(RACINE, "dico", "motus-rpg.js"));
  const D = w.MOTUS_RPG;

  // ------------------------------------------------------------------
  groupe("Quête — contenu");

  verifie("les cinq actes sont complets", () => {
    egal(D.zones.length, 5);
    const soucis = [];
    D.zones.forEach((z, i) => {
      if (!z.nom || !z.intro) soucis.push("acte " + (i+1) + " incomplet");
      if (!z.monstres || z.monstres.length < 3) soucis.push("acte " + (i+1) + " : trop peu de monstres");
      if (!z.elites || !z.elites.length) soucis.push("acte " + (i+1) + " : aucune élite");
      if (!z.boss) soucis.push("acte " + (i+1) + " : aucun boss");
      if (!z.lens || !z.lens.length) soucis.push("acte " + (i+1) + " : longueurs de mots absentes");
    });
    vide(soucis);
  });

  verifie("chaque trait de monstre est défini", () => {
    const connus = Object.keys(D.traits);
    const inconnus = [];
    D.zones.forEach(z => {
      [].concat(z.monstres, z.elites, [z.boss]).forEach(m => {
        if (m && m.trait && !connus.includes(m.trait)) inconnus.push(m.n + " → " + m.trait);
      });
    });
    vide(inconnus, "traits inexistants");
  });

  verifie("aucun trait défini n'est inutilisé", () => {
    const utilises = new Set();
    D.zones.forEach(z => [].concat(z.monstres, z.elites, [z.boss])
      .forEach(m => m && m.trait && utilises.add(m.trait)));
    vide(Object.keys(D.traits).filter(t => !utilises.has(t)), "traits morts");
  });

  verifie("les longueurs de mots demandées existent réellement", () => {
    /* piège rencontré : aucun mot de 9 lettres n'existe dans motus-words.js */
    const mots = {};
    global.window = {};
    delete require.cache[require.resolve(path.join(RACINE, "dico", "motus-words.js"))];
    require(path.join(RACINE, "dico", "motus-words.js"));
    const W = global.window.MOTUS_WORDS;
    [].concat(W.court, W.normal, W.long).forEach(m => { mots[m.length] = (mots[m.length]||0) + 1; });
    const manquantes = [];
    D.zones.forEach((z, i) => z.lens.forEach(L => {
      if (!mots[L]) manquantes.push("acte " + (i+1) + " demande du " + L + " lettres");
    }));
    vide(manquantes);
  });

  verifie("chaque rencontre offre de vrais choix", () => {
    const soucis = [];
    (D.events || []).forEach(e => {
      if (!e.options || e.options.length < 2) soucis.push(e.id + " (moins de 2 options)");
      (e.options || []).forEach(o => { if (!o.texte) soucis.push(e.id + " (option sans libellé)"); });
    });
    vide(soucis);
  });

  verifie("les dilemmes n'ont aucune option purement bénéfique", () => {
    const soucis = [];
    (D.events || []).filter(e => e.amer).forEach(e => {
      const bonnes = e.options.filter(o => {
        const f = o.effet || {};
        return (f.hp > 0 || f.mp > 0 || f.xp > 0 || f.relique) && !(f.hp < 0 || f.mp < 0 || f.or < 0 || f.xp < 0);
      });
      if (bonnes.length) soucis.push(e.id);
    });
    vide(soucis, "un dilemme doit forcer un arbitrage");
  });

  verifie("chaque pouvoir et effet caché est bien implémenté", () => {
    /* Un effet déclaré dans les données mais absent du moteur ne se
       déclencherait jamais — invisible, donc jamais signalé par un joueur. */
    const moteur = require("fs").readFileSync(path.join(RACINE, "rpg.html"), "utf8");
    const manquants = [];
    D.zones.forEach((z, i) => {
      [].concat(z.monstres, z.elites, [z.boss]).forEach(m => {
        if (m.pouvoir && !moteur.includes('"' + m.pouvoir.id + '"'))
          manquants.push("acte " + (i+1) + " " + m.n + " : pouvoir " + m.pouvoir.id);
        if (m.cache && !moteur.includes('"' + m.cache + '"'))
          manquants.push("acte " + (i+1) + " " + m.n + " : effet caché " + m.cache);
      });
    });
    vide(manquants, "déclarés mais absents du moteur");
  });

  verifie("les actes retravaillés ont pouvoir, phrase et secret partout", () => {
    const soucis = [];
    [0, 1].forEach(z => {
      const zone = D.zones[z];
      [].concat(zone.monstres, zone.elites, [zone.boss]).forEach(m => {
        if (!m.pouvoir) soucis.push("acte " + (z+1) + " " + m.n + " : pas de pouvoir");
        if (!m.cri)     soucis.push("acte " + (z+1) + " " + m.n + " : pas de phrase");
        if (!m.cache)   soucis.push("acte " + (z+1) + " " + m.n + " : pas de secret");
      });
    });
    vide(soucis);
  });

  verifie("les secrets percés survivent à une nouvelle aventure", () => {
    /* Ils appartiennent à la COLLECTION, pas à la partie : les ranger dans P
       les aurait effacés au premier recommencement. */
    const moteur = require("fs").readFileSync(path.join(RACINE, "rpg.html"), "utf8");
    ok(/motus\.rpg2\.secrets/.test(moteur), "les secrets doivent avoir leur propre stockage");
    ok(!/P\.secrets/.test(moteur), "les secrets ne doivent pas vivre dans la partie");
  });

  verifie("l'avancement de la Quête alimente les badges", () => {
    const moteur = require("fs").readFileSync(path.join(RACINE, "rpg.html"), "utf8");
    const profil = require("fs").readFileSync(path.join(RACINE, "profiles", "profile.js"), "utf8");
    const jeu    = require("fs").readFileSync(path.join(RACINE, "index.html"), "utf8");
    ok(/motus\.rpg2\.progress/.test(moteur), "la Quête doit déposer son avancement");
    ok(/questProgress/.test(profil), "le profil doit savoir le recevoir");
    ok(/questProgress/.test(jeu),    "le jeu principal doit le relayer");
    vide(["qActes","qFins","qSecrets","qMonstres","qNiveau","qSansMort"]
      .filter(k => !profil.includes(k)), "compteurs absents du profil");
  });

  verifie("un adversaire n'a jamais deux pouvoirs à la fois", () => {
    /* Un ancien trait ET un nouveau pouvoir faisaient doublon à l'écran,
       et se cumulaient mécaniquement. */
    const doubles = [];
    D.zones.forEach((z, i) => {
      [].concat(z.monstres, z.elites, [z.boss]).forEach(m => {
        if (m.pouvoir && m.trait) doubles.push("acte " + (i+1) + " " + m.n);
      });
    });
    vide(doubles, "portent un trait ET un pouvoir");
  });

  verifie("percer un secret rafraîchit l'étiquette", () => {
    /* L'étiquette n'était dessinée qu'au début du combat : elle restait donc
       sur « 🔎 Secret » même après le déclenchement, et le joueur croyait
       que rien ne s'était passé. */
    const moteur = require("fs").readFileSync(path.join(RACINE, "rpg.html"), "utf8");
    const bloc = moteur.slice(moteur.indexOf("function revelerCache"));
    ok(/majEtiquettes\(\)/.test(bloc.slice(0, 500)),
       "revelerCache doit redessiner l'étiquette");
  });

  verifie("chaque effet caché a son explication", () => {
    // affichée une fois le secret percé — sans elle, l'étiquette serait vide
    const moteur = require("fs").readFileSync(path.join(RACINE, "rpg.html"), "utf8");
    const sans = [];
    D.zones.forEach(z => [].concat(z.monstres, z.elites, [z.boss]).forEach(m => {
      if (m.cache && !new RegExp(m.cache + "\\s*:").test(moteur)) sans.push(m.n);
    }));
    vide(sans, "effets cachés sans texte d'explication");
  });

  verifie("un adversaire à pouvoir annonce qu'il cache quelque chose", () => {
    // le joueur doit savoir qu'un secret existe, sans savoir lequel
    const moteur = require("fs").readFileSync(path.join(RACINE, "rpg.html"), "utf8");
    ok(/class="secret"/.test(moteur), "aucun indicateur de secret dans l'interface");
    ok(!/cache==="lache"[\s\S]{0,200}cTrait/.test(moteur), "le secret ne doit pas être annoncé d'avance");
  });

  verifie("chaque acte dispose d'assez de rencontres", () => {
    /* Une rencontre peut être réservée à un lieu (« zones »). Si un acte se
       retrouve avec trop peu d'options, on reverrait toujours les mêmes. */
    const soucis = [];
    for (let z = 0; z < 5; z++) {
      const ici = (D.events || []).filter(e => !e.zones || e.zones.indexOf(z) >= 0);
      const doux = ici.filter(e => !e.amer);
      if (doux.length < 6) soucis.push("acte " + (z+1) + " : " + doux.length + " rencontres neutres");
      if (!ici.some(e => e.amer)) soucis.push("acte " + (z+1) + " : aucun dilemme");
    }
    vide(soucis);
  });

  verifie("les rencontres de lieu visent un acte qui existe", () => {
    const mauvais = (D.events || [])
      .filter(e => e.zones && e.zones.some(z => z < 0 || z >= D.zones.length))
      .map(e => e.id);
    vide(mauvais, "zones hors des cinq actes");
  });

  verifie("les compétences et améliorations sont bien formées", () => {
    const soucis = [];
    (D.skills || []).forEach(s => { if (!s.id || !s.n || typeof s.cout !== "number") soucis.push("compétence " + (s.id||"?")); });
    (D.upgrades || []).forEach(u => { if (!u.id || !u.n) soucis.push("amélioration " + (u.id||"?")); });
    (D.relics || []).forEach(r => { if (!r.id || !r.n || !r.d) soucis.push("relique " + (r.id||"?")); });
    vide(soucis);
    ok(D.skills.length >= 5, "trop peu de compétences pour varier les parties");
    ok(D.relics.length >= 8, "trop peu de reliques");
  });

  // ------------------------------------------------------------------
  groupe("Quête — équilibrage");

  /* Simulation d'un parcours complet avec un joueur « moyen » :
     il trouve le mot en 3,5 tentatives, avec ~2 lettres bien placées et
     ~1,5 mal placées par essai. Les formules reproduisent celles du jeu. */
  function parcours() {
    let niveau = 1, xp = 0, bonus = { pv:0, atk:0 };
    const seuil  = () => 35 + 15 * (niveau - 1);
    const pvMax  = () => 70 + bonus.pv;
    const attaque= () => (niveau - 1) * 3 + bonus.atk;
    let pv = pvMax(), morts = 0, mots = 0, plusBas = 100;

    const stats = (genre, z) => {
      const basePv = 34 + z * 30, baseAtk = Math.round(4 + z * 2);
      if (genre === "elite") return { pv:Math.round(basePv*1.6), atk:Math.round(baseAtk*1.35), xp:36+z*16 };
      if (genre === "boss")  return { pv:Math.round(basePv*2.2), atk:Math.round(baseAtk*1.6),  xp:60+z*24 };
      return { pv:basePv, atk:baseAtk, xp:19+z*9 };
    };

    function combat(genre, z) {
      const s = stats(genre, z);
      let pvMonstre = s.pv, tours = 0;
      while (pvMonstre > 0 && tours < 80) {
        pvMonstre -= 2*3 + 1.5*1 + attaque() + 15/3.5;
        pv -= s.atk; tours++; mots += 1/3.5;
        if (pv <= 0) { morts++; pv = Math.round(pvMax()*0.6); return; }
      }
      plusBas = Math.min(plusBas, 100 * pv / pvMax());
      xp += s.xp;
      while (xp >= seuil()) { xp -= seuil(); niveau++;
        // un joueur sensé alterne survie et puissance
        if (niveau % 2) { bonus.pv += 18; pv += 18; } else bonus.atk += 3;
      }
      pv = Math.min(pvMax(), pv + Math.round(pvMax() * 0.15));   // souffle du vainqueur
    }

    for (let z = 0; z < 5; z++) {
      const etages = D.zones[z].etages || 4;
      for (let e = 0; e < etages - 1; e++) {
        combat(e === etages - 2 ? "elite" : "combat", z);
        if (e === etages - 2) pv = Math.min(pvMax(), pv + Math.round(pvMax() * 0.6));  // repos
      }
      combat("boss", z);
    }
    return { morts, niveau, mots: Math.round(mots), plusBas: Math.round(plusBas) };
  }

  const r = parcours();

  verifie("l'aventure est franchissable", () => {
    ok(r.morts <= 4, "trop de morts sur un parcours moyen : " + r.morts +
                     " (l'aventure était devenue infaisable par le passé)");
  });

  verifie("l'aventure reste exigeante", () => {
    ok(r.plusBas < 60, "le joueur ne descend jamais bas (" + r.plusBas + " % de PV au minimum) : aucun enjeu");
  });

  verifie("la durée d'une partie reste raisonnable", () => {
    ok(r.mots >= 20 && r.mots <= 70,
       r.mots + " mots à deviner ; visé 20-70 (c'était 295 avant refonte)");
  });

  verifie("la progression permet d'atteindre toutes les compétences", () => {
    const requis = Math.max(...D.skills.map(s => s.lvl || 1));
    ok(r.niveau >= requis,
       "niveau " + r.niveau + " atteint pour " + requis + " requis : une compétence resterait inaccessible");
  });

  verifie("aucun pouvoir ne rend un monstre ordinaire aussi coûteux qu'un boss", () => {
    /* Le Golem ignorait TOUS les bonus de dégâts : 9 tours et la moitié de la
       vie du joueur, pour un simple monstre de couloir. */
    const moteur = require("fs").readFileSync(path.join(RACINE, "rpg.html"), "utf8");
    const m = moteur.match(/durpierre"\)\s*dmg\s*=\s*([^;]+);/);
    ok(m, "le pouvoir du golem est introuvable");
    ok(/atkBonus\(\)/.test(m[1]),
       "un monstre ordinaire doit rester sensible à la force acquise du joueur");
  });

  verifie("les statistiques du bestiaire viennent de la vraie formule", () => {
    // sinon elles mentiraient au joueur dès le premier ajustement d'équilibrage
    const moteur = require("fs").readFileSync(path.join(RACINE, "rpg.html"), "utf8");
    const bloc = moteur.slice(moteur.indexOf("function showCodex"));
    ok(/foeStats\(/.test(bloc.slice(0, 1800)),
       "le bestiaire doit appeler foeStats, pas recopier des chiffres");
  });

  verifie("le boss final est battable sans être une formalité", () => {
    const niveau = 11, pvMax = 70 + 90, att = (niveau-1)*3 + 15;
    const pvBoss = Math.round((34 + 4*30) * 2.2), atkBoss = Math.round(Math.round(4 + 4*2) * 1.6);
    const parTour = 2*3 + 1.5 + att + 15/3.5;
    const tours = Math.ceil(pvBoss / parTour);
    const subis = tours * atkBoss;
    ok(subis < pvMax, "boss infaisable : " + subis + " dégâts pour " + pvMax + " PV");
    ok(subis > pvMax * 0.25, "boss trop facile : seulement " + Math.round(100*subis/pvMax) + " % des PV entamés");
  });
};
