/* Profil joueur + badges + couche communautaire.
   - Stockage local (toujours) + synchronisation Supabase (si configurée).
   - Onglets : Profil · Badges · Classement · Aujourd'hui.
   - L'emblème choisi s'affiche à droite du pseudo dans le classement.
   - API : Profile.game, Profile.open(html), Profile.addGame({...}),
     Profile.defiDone({...}), Profile.submitDaily({...}). */
(function () {
  "use strict";

  var CFG = window.MOTUS_CONFIG || {};
  var API = (CFG.SUPABASE_URL || "").replace(/\/+$/, "");
  var KEY = CFG.SUPABASE_ANON_KEY || "";
  var configured = !!(API && KEY);

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }
  function todayStr() { var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }

  /* ---------- Niveaux ---------- */
  var TITLES = ["Débutant", "Apprenti", "Amateur", "Habitué", "Confirmé", "Expert", "Maître", "Champion", "Virtuose", "Légende"];
  function levelFromXp(xp) { var L = 1; while (50 * (L + 1) * L <= xp) L++; return L; }
  function levelInfo(xp) {
    var L = levelFromXp(xp), base = 50 * L * (L - 1), next = 50 * (L + 1) * L;
    return { level: L, title: TITLES[Math.min(L - 1, TITLES.length - 1)], inLevel: xp - base, span: next - base, toNext: next - xp, progress: next > base ? (xp - base) / (next - base) : 1 };
  }

  /* ---------- Compteurs détaillés (alimentés par addGame/defiDone) ---------- */
  function freshCounters(){
    return { daily:0, defi:0, one:0, two:0, last:0, f5:0, f10:0, f15:0, slow:0,
             mC:0, mN:0, mL:0, mP:0, mPe:0, mM:0, mV:0, mX:0, xRare:0, xClean:0, xStreak:0, xBest:0,
             modes:[], streak:0, best:0,
             dist:[0,0,0,0,0,0], lost:0, msSum:0, msCount:0,   // stats personnelles (v1.47)
             hyph:0, night:0, dawn:0, wknd:0, days:[], dayBest:0,
             defiFast:0, dailyOne:0, allDiff:0, longFast:0, comeback:0, noYellow:0,
             villeCap:0, villeMonde:0,
             duelPlay:0, duelWin:0, duelWinStreak:0, duelBestStreak:0, duelPerfect:0, duelRevenge:0,
             racePlay:0, raceWin:0, raceStreak:0, raceBest:0, raceClean:0, raceFast:0,
             raceWords:0, raceThemes:[],
             hints:0, cleanStreak:0, cleanBest:0, giveups:0, raceSolo:0,
             hint2Used:0, hintFirstTry:0, hintSixFail:0,
             defAtkPlay:0, defAtkWin:0, defAtkStreak:0, defAtkBest:0,
             defWinsAsDefender:0, defLossesAsDefender:0, defRepelStreak:0, defRepelBest:0,
             defMaxWordLen:0,
             penduPlay:0, penduWin:0, penduLoss:0, penduStreak:0, penduBest:0, penduClean:0, penduClose:0,
             hintMaladies:0, hintPrenoms:0, hintVilles:0, hintOnIndice:0,
             duelLostTo:[] };
  }

  /* ---------- Les 50 badges ----------
     e=emoji, n=nom, d=description, c=catégorie, h=caché, t=test(compteurs, profil) */
  var BADGES = [
    // — Débuts —
    {id:"start", e:"🎯", n:"Premier pas",        d:"Jouer une partie",              c:"Débuts", t:function(b,s){return s.games>=1;}},
    {id:"win1",  e:"🏆", n:"Première victoire",  d:"Trouver un premier mot",        c:"Débuts", t:function(b,s){return s.wins>=1;}},
    {id:"day1",  e:"📅", n:"Rituel",             d:"Trouver un mot du jour",        c:"Débuts", t:function(b){return b.daily>=1;}},
    {id:"defi1", e:"🔥", n:"Relevé",             d:"Réussir un défi du jour",       c:"Débuts", t:function(b){return b.defi>=1;}},
    {id:"tour",  e:"🧭", n:"Touche-à-tout",      d:"Jouer les 5 modes classiques",  c:"Débuts", t:function(b){return b.modes.length>=5;}, p:[function(b){return b.modes.length;},5]},

    // — Volume —
    {id:"g25",   e:"🎖️", n:"Habitué",            d:"25 parties jouées",             c:"Volume", t:function(b,s){return s.games>=25;}, p:[function(b,s){return s.games;},25]},
    {id:"g100",  e:"🏅", n:"Pilier",             d:"100 parties jouées",            c:"Volume", t:function(b,s){return s.games>=100;}, p:[function(b,s){return s.games;},100]},
    {id:"g500",  e:"💯", n:"Increvable",         d:"500 parties jouées",            c:"Volume", t:function(b,s){return s.games>=500;}, p:[function(b,s){return s.games;},500]},
    {id:"w10",   e:"🔟", n:"Dix sur dix",        d:"10 victoires",                  c:"Volume", t:function(b,s){return s.wins>=10;}, p:[function(b,s){return s.wins;},10]},
    {id:"w50",   e:"🥇", n:"Cinquantenaire",     d:"50 victoires",                  c:"Volume", t:function(b,s){return s.wins>=50;}, p:[function(b,s){return s.wins;},50]},
    {id:"w200",  e:"👑", n:"Couronné",           d:"200 victoires",                 c:"Volume", t:function(b,s){return s.wins>=200;}, p:[function(b,s){return s.wins;},200]},

    // — Niveau —
    {id:"lv5",   e:"⭐", n:"Étoile montante",    d:"Atteindre le niveau 5",         c:"Niveau", t:function(b,s){return s.level>=5;}, p:[function(b,s){return s.level;},5]},
    {id:"lv10",  e:"💎", n:"Diamant",            d:"Atteindre le niveau 10",        c:"Niveau", t:function(b,s){return s.level>=10;}, p:[function(b,s){return s.level;},10]},
    {id:"xp500", e:"🚀", n:"Décollage",          d:"500 XP cumulés",                c:"Niveau", t:function(b,s){return s.xp>=500;}, p:[function(b,s){return s.xp;},500]},
    {id:"xp2k",  e:"🌟", n:"Supernova",          d:"2 000 XP cumulés",              c:"Niveau", t:function(b,s){return s.xp>=2000;}, p:[function(b,s){return s.xp;},2000]},
    {id:"xp5k",  e:"☄️", n:"Comète",             d:"5 000 XP cumulés",              c:"Niveau", t:function(b,s){return s.xp>=5000;}, p:[function(b,s){return s.xp;},5000]},

    // — Précision —
    {id:"one1",  e:"🎱", n:"Coup de génie",      d:"Trouver un mot du premier coup",c:"Précision", t:function(b){return b.one>=1;}},
    {id:"one5",  e:"🔮", n:"Voyant",             d:"5 mots du premier coup",        c:"Précision", t:function(b){return b.one>=5;}, p:[function(b){return b.one;},5]},
    {id:"one20", e:"🧿", n:"Devin",              d:"20 mots du premier coup",       c:"Précision", t:function(b){return b.one>=20;}, p:[function(b){return b.one;},20]},
    {id:"two10", e:"✌️", n:"Deux temps",         d:"10 mots en 2 essais",           c:"Précision", t:function(b){return b.two>=10;}, p:[function(b){return b.two;},10]},
    {id:"nyel",  e:"🩸", n:"Sans détour",        d:"Gagner sans aucune lettre jaune",c:"Précision", t:function(b){return b.noYellow>=1;}},

    // — Vitesse —
    {id:"f10",   e:"⚡", n:"Réflexe",            d:"Un mot en moins de 10 secondes",c:"Vitesse", t:function(b){return b.f10>=1;}},
    {id:"f5",    e:"💨", n:"Éclair",             d:"Un mot en moins de 5 secondes", c:"Vitesse", t:function(b){return b.f5>=1;}},
    {id:"f15x10",e:"🌪️", n:"Tourbillon",         d:"10 mots en moins de 15 s",      c:"Vitesse", t:function(b){return b.f15>=10;}, p:[function(b){return b.f15;},10]},
    {id:"lfast", e:"🏎️", n:"Grande vitesse",     d:"Un mot long en moins de 30 s",  c:"Vitesse", t:function(b){return b.longFast>=1;}},
    {id:"dfast", e:"⏱️", n:"Chrono maîtrisé",    d:"Un défi bouclé en moins de 5 min",c:"Vitesse", t:function(b){return b.defiFast>=1;}},

    // — Modes —
    {id:"c10",   e:"🐤", n:"Petit format",       d:"10 mots courts trouvés",        c:"Modes", t:function(b){return b.mC>=10;}, p:[function(b){return b.mC;},10]},
    {id:"c50",   e:"🐥", n:"Concis",             d:"50 mots courts trouvés",        c:"Modes", t:function(b){return b.mC>=50;}, p:[function(b){return b.mC;},50]},
    {id:"n50",   e:"🎯", n:"Régulier",           d:"50 mots normaux trouvés",       c:"Modes", t:function(b){return b.mN>=50;}, p:[function(b){return b.mN;},50]},
    {id:"l10",   e:"🐘", n:"Grand format",       d:"10 mots longs trouvés",         c:"Modes", t:function(b){return b.mL>=10;}, p:[function(b){return b.mL;},10]},
    {id:"l50",   e:"🦕", n:"Colosse",            d:"50 mots longs trouvés",         c:"Modes", t:function(b){return b.mL>=50;}, p:[function(b){return b.mL;},50]},
    {id:"p10",   e:"👶", n:"Baptême",            d:"10 prénoms trouvés",            c:"Modes", t:function(b){return b.mP>=10;}, p:[function(b){return b.mP;},10]},
    {id:"p50",   e:"👨‍👩‍👧", n:"Généalogiste",  d:"50 prénoms trouvés",            c:"Modes", t:function(b){return b.mP>=50;}, p:[function(b){return b.mP;},50]},
    {id:"m10",   e:"🩺", n:"Externe",            d:"10 maladies trouvées",          c:"Modes", t:function(b){return b.mM>=10;}, p:[function(b){return b.mM;},10]},
    {id:"m50",   e:"🧬", n:"Professeur",         d:"50 maladies trouvées",          c:"Modes", t:function(b){return b.mM>=50;}, p:[function(b){return b.mM;},50]},
    {id:"v10",   e:"🏙️", n:"Voyageur",           d:"10 villes trouvées",            c:"Modes", t:function(b){return b.mV>=10;}, p:[function(b){return b.mV;},10]},
    {id:"v50",   e:"🗺️", n:"Géographe",          d:"50 villes trouvées",            c:"Modes", t:function(b){return b.mV>=50;}, p:[function(b){return b.mV;},50]},
    {id:"vcap",  e:"🏛️", n:"Tour du monde",      d:"10 capitales trouvées",         c:"Modes", t:function(b){return b.villeCap>=10;}, p:[function(b){return b.villeCap;},10]},
    {id:"vmonde",e:"🌍", n:"Globe-trotteur",     d:"15 villes étrangères trouvées", c:"Modes", t:function(b){return b.villeMonde>=15;}, p:[function(b){return b.villeMonde;},15]},
    {id:"pe10",  e:"🎭", n:"Physionomiste",      d:"10 personnages trouvés",        c:"Modes", t:function(b){return b.mPe>=10;}, p:[function(b){return b.mPe;},10]},
    {id:"pe50",  e:"🌟", n:"Biographe",          d:"50 personnages trouvés",        c:"Modes", t:function(b){return b.mPe>=50;}, p:[function(b){return b.mPe;},50]},
    {id:"x1",    e:"🎓", n:"Rigoureux",          d:"Trouver un mot en Expert",       c:"Modes", t:function(b){return b.mX>=1;}},
    {id:"x10",   e:"📐", n:"Méthodique",         d:"10 mots trouvés en Expert",      c:"Modes", t:function(b){return b.mX>=10;}, p:[function(b){return b.mX;},10]},
    {id:"x50",   e:"🧠", n:"Implacable",         d:"50 mots trouvés en Expert",      c:"Modes", t:function(b){return b.mX>=50;}, p:[function(b){return b.mX;},50]},
    {id:"xrare", e:"📚", n:"Érudit",             d:"10 mots trouvés en Expert avec les mots rares activés", c:"Modes", t:function(b){return b.xRare>=10;}, p:[function(b){return b.xRare;},10]},

    // — Duel —
    {id:"duel1",  e:"⚔️", n:"Provocateur",       d:"Jouer un premier duel",         c:"Duel", t:function(b){return b.duelPlay>=1;}},
    {id:"duelw1", e:"🤝", n:"Premier sang",      d:"Gagner un duel",                c:"Duel", t:function(b){return b.duelWin>=1;}},
    {id:"duelw10",e:"🎗️", n:"Duelliste",         d:"Gagner 10 duels",               c:"Duel", t:function(b){return b.duelWin>=10;}, p:[function(b){return b.duelWin;},10]},
    {id:"duelw25",e:"⚜️", n:"Bretteur",          d:"Gagner 25 duels",               c:"Duel", t:function(b){return b.duelWin>=25;}, p:[function(b){return b.duelWin;},25]},
    {id:"duels3", e:"🔥", n:"En feu",            d:"3 victoires de duel d'affilée", c:"Duel", t:function(b){return b.duelBestStreak>=3;}, p:[function(b){return b.duelBestStreak;},3]},
    {id:"duels10",e:"👑", n:"Invaincu",          d:"10 victoires de duel d'affilée",c:"Duel", t:function(b){return b.duelBestStreak>=10;}, p:[function(b){return b.duelBestStreak;},10]},
    {id:"duelperf",e:"🎯", n:"Sans appel",       d:"Gagner un duel en trouvant le mot du premier coup", c:"Duel", h:1, t:function(b){return b.duelPerfect>=1;}},
    {id:"duelrev", e:"🗡️", n:"Vengeance",        d:"Battre un joueur qui t'avait vaincu", c:"Duel", h:1, t:function(b){return b.duelRevenge>=1;}},

    // — Course —
    {id:"r1",     e:"⌨️", n:"Dactylo",          d:"Jouer une première course",     c:"Course", t:function(b){return b.racePlay>=1;}},
    {id:"rw1",    e:"🏁", n:"Premier sprint",   d:"Gagner une course",             c:"Course", t:function(b){return b.raceWin>=1;}},
    {id:"rw10",   e:"⏩", n:"Sprinteur",        d:"Gagner 10 courses",             c:"Course", t:function(b){return b.raceWin>=10;}, p:[function(b){return b.raceWin;},10]},
    {id:"rw25",   e:"🌠", n:"Fulgurant",        d:"Gagner 25 courses",             c:"Course", t:function(b){return b.raceWin>=25;}, p:[function(b){return b.raceWin;},25]},
    {id:"rs3",    e:"🧨", n:"Sans relâche",     d:"3 victoires de course d'affilée", c:"Course", t:function(b){return b.raceBest>=3;}, p:[function(b){return b.raceBest;},3]},
    {id:"rwords", e:"📝", n:"Copiste",          d:"200 mots recopiés en Course",   c:"Course", t:function(b){return b.raceWords>=200;}, p:[function(b){return b.raceWords;},200]},
    {id:"rtheme", e:"🎨", n:"Éclectique",       d:"Courir dans les 4 thèmes",      c:"Course", t:function(b){return (b.raceThemes||[]).length>=4;}, p:[function(b){return (b.raceThemes||[]).length;},4]},
    {id:"rclean", e:"💯", n:"Sans faute",       d:"Terminer une suite sans perdre une seule vie", c:"Course", h:1, t:function(b){return b.raceClean>=1;}},
    {id:"rfast",  e:"⏲️", n:"Doigts de fée",    d:"Terminer une suite en moins d'une minute", c:"Course", h:1, t:function(b){return b.raceFast>=1;}},
    {id:"rsolo",  e:"🏃", n:"Courir seul",      d:"Faire une course en entraînement", c:"Course", h:1, t:function(b){return b.raceSolo>=1;}},

    // — Indices —
    {id:"hint1",  e:"🆘", n:"Bouée de sauvetage", d:"Utiliser un indice pour la première fois", c:"Indices", t:function(b){return b.hints>=1;}},
    {id:"nohint", e:"🧘", n:"Sans aide",           d:"50 mots trouvés d'affilée sans indice", c:"Indices", h:1, t:function(b){return b.cleanBest>=50;}},
    {id:"hint2",  e:"💊", n:"Double dose",         d:"Utiliser 2 indices sur le même mot", c:"Indices", t:function(b){return b.hint2Used>=1;}},
    {id:"hintfast",e:"🎯", n:"Coup de pouce",      d:"Trouver un mot du premier coup avec un indice", c:"Indices", t:function(b){return b.hintFirstTry>=1;}},
    {id:"hintfail",e:"🤷", n:"Même pas aidé",      d:"Utiliser un indice et échouer après 6 tentatives", c:"Indices", t:function(b){return b.hintSixFail>=1;}},
    {id:"hint20", e:"📎", n:"Petites béquilles",   d:"Utiliser un indice 20 fois", c:"Indices", t:function(b){return b.hints>=20;}, p:[function(b){return b.hints;},20]},
    {id:"hint50", e:"🩹", n:"Grandes béquilles",   d:"Utiliser un indice 50 fois", c:"Indices", t:function(b){return b.hints>=50;}, p:[function(b){return b.hints;},50]},
    {id:"hint100",e:"🦽", n:"Dépendance totale",   d:"Utiliser un indice 100 fois", c:"Indices", t:function(b){return b.hints>=100;}, p:[function(b){return b.hints;},100]},
    {id:"hintmal",e:"🩺", n:"Diagnostic assisté",  d:"Trouver une maladie avec un indice", c:"Indices", t:function(b){return b.hintMaladies>=1;}},
    {id:"hintpre",e:"👶", n:"Souffleur",           d:"Trouver un prénom avec un indice", c:"Indices", t:function(b){return b.hintPrenoms>=1;}},
    {id:"hintvil",e:"🗺️", n:"Guide touristique",   d:"Trouver une ville avec un indice", c:"Indices", t:function(b){return b.hintVilles>=1;}},
    {id:"hintind",e:"🔮", n:"Mise en abyme",       d:"Utiliser un indice sur le mot INDICE", c:"Indices", h:1, t:function(b){return b.hintOnIndice>=1;}},

    // — Défense —
    {id:"defatk1",  e:"🗡️", n:"Premier assaut",    d:"Attaquer une défense pour la première fois", c:"Défense", t:function(b){return b.defAtkPlay>=1;}},
    {id:"defwin1",  e:"💥", n:"Première brèche",    d:"Percer une défense pour la première fois", c:"Défense", t:function(b){return b.defAtkWin>=1;}},
    {id:"defwin10", e:"🏹", n:"Brise-forteresse",   d:"Percer 10 défenses", c:"Défense", t:function(b){return b.defAtkWin>=10;}, p:[function(b){return b.defAtkWin;},10]},
    {id:"defwin25", e:"🪓", n:"Conquérant",         d:"Percer 25 défenses", c:"Défense", t:function(b){return b.defAtkWin>=25;}, p:[function(b){return b.defAtkWin;},25]},
    {id:"defatkstk",e:"🔥", n:"Rafale",             d:"Percer 3 défenses d'affilée", c:"Défense", t:function(b){return b.defAtkBest>=3;}},
    {id:"defsh1",   e:"🛡️", n:"Premier bouclier",   d:"Repousser une attaque pour la première fois", c:"Défense", t:function(b){return b.defWinsAsDefender>=1;}},
    {id:"defsh10",  e:"🏰", n:"Forteresse",         d:"Repousser 10 attaques", c:"Défense", t:function(b){return b.defWinsAsDefender>=10;}, p:[function(b){return b.defWinsAsDefender;},10]},
    {id:"defsh25",  e:"🏯", n:"Citadelle",          d:"Repousser 25 attaques", c:"Défense", t:function(b){return b.defWinsAsDefender>=25;}, p:[function(b){return b.defWinsAsDefender;},25]},
    {id:"defrep10", e:"🧱", n:"Rempart",            d:"Repousser 10 attaques d'affilée sans jamais tomber", c:"Défense", h:1, t:function(b){return b.defRepelBest>=10;}},
    {id:"definvio", e:"👑", n:"Inviolable",         d:"Repousser 30 attaques sans jamais avoir été percé", c:"Défense", h:1, t:function(b){return b.defWinsAsDefender>=30 && b.defLossesAsDefender===0;}},
    {id:"deflong",  e:"📏", n:"Mot fleuve",         d:"Poser un mot de défense de 15 lettres", c:"Défense", h:1, t:function(b){return b.defMaxWordLen>=15;}},

    // — Le Pendu —
    {id:"pendu1",  e:"🪢", n:"Corde coupée",     d:"Jouer une première partie de Pendu", c:"Pendu", t:function(b){return b.penduPlay>=1;}},
    {id:"penduw1", e:"🎉", n:"Gracié",           d:"Gagner une première partie de Pendu", c:"Pendu", t:function(b){return b.penduWin>=1;}},
    {id:"penduw10",e:"🤹", n:"Habitué de la potence", d:"Gagner 10 parties de Pendu", c:"Pendu", t:function(b){return b.penduWin>=10;}, p:[function(b){return b.penduWin;},10]},
    {id:"penduw25",e:"🎭", n:"Maître pendu",     d:"Gagner 25 parties de Pendu", c:"Pendu", t:function(b){return b.penduWin>=25;}, p:[function(b){return b.penduWin;},25]},
    {id:"penduskt",e:"🔥", n:"Chance insolente", d:"Gagner 5 parties de Pendu d'affilée", c:"Pendu", t:function(b){return b.penduBest>=5;}},
    {id:"penducln",e:"💯", n:"Sans une seule erreur", d:"Gagner une partie de Pendu sans jamais se tromper", c:"Pendu", h:1, t:function(b){return b.penduClean>=1;}},
    {id:"penducls",e:"😰", n:"Ric-rac",          d:"Gagner une partie de Pendu avec une seule vie restante", c:"Pendu", h:1, t:function(b){return b.penduClose>=1;}},
    {id:"pendulos",e:"🪦", n:"Corde au cou",     d:"Perdre 10 parties de Pendu", c:"Pendu", h:1, t:function(b){return b.penduLoss>=10;}},

    // — Quotidien —
    {id:"d7",    e:"🗓️", n:"Semaine pleine",     d:"7 mots du jour trouvés",        c:"Quotidien", t:function(b){return b.daily>=7;}, p:[function(b){return b.daily;},7]},
    {id:"d30",   e:"📆", n:"Mois complet",       d:"30 mots du jour trouvés",       c:"Quotidien", t:function(b){return b.daily>=30;}, p:[function(b){return b.daily;},30]},
    {id:"d100",  e:"🏛️", n:"Centenaire",         d:"100 mots du jour trouvés",      c:"Quotidien", t:function(b){return b.daily>=100;}, p:[function(b){return b.daily;},100]},
    {id:"df5",   e:"🔥", n:"Feu sacré",          d:"5 défis réussis",               c:"Quotidien", t:function(b){return b.defi>=5;}, p:[function(b){return b.defi;},5]},
    {id:"df25",  e:"🌋", n:"Volcan",             d:"25 défis réussis",              c:"Quotidien", t:function(b){return b.defi>=25;}, p:[function(b){return b.defi;},25]},
    {id:"days7", e:"🧱", n:"Assidu",             d:"Jouer 7 jours différents",      c:"Quotidien", t:function(b){return b.days.length>=7;}, p:[function(b){return b.days.length;},7]},
    {id:"days30",e:"🗿", n:"Monument",           d:"Jouer 30 jours différents",     c:"Quotidien", t:function(b){return b.days.length>=30;}, p:[function(b){return b.days.length;},30]},
    {id:"ds5",   e:"🔗", n:"Chaîne",             d:"5 jours consécutifs",           c:"Quotidien", t:function(b){return b.dayBest>=5;}, p:[function(b){return b.dayBest;},5]},

    // — Séries —
    {id:"st5",   e:"🎢", n:"Sur sa lancée",      d:"5 victoires d'affilée",         c:"Séries", t:function(b){return b.best>=5;}, p:[function(b){return b.best;},5]},
    {id:"st10",  e:"🌊", n:"Vague",              d:"10 victoires d'affilée",        c:"Séries", t:function(b){return b.best>=10;}, p:[function(b){return b.best;},10]},
    {id:"st25",  e:"🏔️", n:"Sommet",             d:"25 victoires d'affilée",        c:"Séries", t:function(b){return b.best>=25;}, p:[function(b){return b.best;},25]},

    // — Cachés —
    {id:"night", e:"🦉", n:"Oiseau de nuit",     d:"Jouer entre minuit et 5 h",     c:"Cachés", h:1, t:function(b){return b.night>=1;}},
    {id:"dawn",  e:"🐓", n:"Lève-tôt",           d:"Jouer entre 5 h et 7 h",        c:"Cachés", h:1, t:function(b){return b.dawn>=1;}},
    {id:"come",  e:"😅", n:"In extremis",        d:"Gagner au 6e essai",            c:"Cachés", h:1, t:function(b){return b.comeback>=1;}},
    {id:"come10",e:"🧗", n:"Funambule",          d:"10 victoires au 6e essai",      c:"Cachés", h:1, t:function(b){return b.comeback>=10;}},
    {id:"hyph",  e:"➖", n:"Trait d'union",      d:"Trouver un prénom composé",     c:"Cachés", h:1, t:function(b){return b.hyph>=1;}},
    {id:"dOne",  e:"🍀", n:"Jour de chance",     d:"Mot du jour du premier coup",   c:"Cachés", h:1, t:function(b){return b.dailyOne>=1;}},
    {id:"diff",  e:"🎰", n:"Sans doublon",       d:"Gagner un mot sans lettre répétée",c:"Cachés", h:1, t:function(b){return b.allDiff>=1;}},
    {id:"slow",  e:"🐢", n:"Prendre son temps",  d:"Trouver un mot après 10 minutes",c:"Cachés", h:1, t:function(b){return b.slow>=1;}},
    {id:"wknd",  e:"🛋️", n:"Grasse matinée",     d:"Jouer un week-end",             c:"Cachés", h:1, t:function(b){return b.wknd>=1;}},
    {id:"xclean",e:"💎", n:"Sans bavure",        d:"Gagner 10 mots en Expert sans perdre une seule tentative", c:"Cachés", h:1, t:function(b){return b.xClean>=10;}},
    {id:"xstrk", e:"⚔️", n:"Sang-froid",         d:"5 victoires d'affilée en Expert", c:"Cachés", h:1, t:function(b){return b.xBest>=5;}},
    {id:"giveup1",e:"🏳️", n:"Abandonné",          d:"Abandonner une partie", c:"Cachés", h:1, t:function(b){return b.giveups>=1;}}
  ];

  var BADGE_BY_ID = {};
  BADGES.forEach(function (b) { BADGE_BY_ID[b.id] = b; });
  var CATS = [];
  BADGES.forEach(function (b) { if (CATS.indexOf(b.c) < 0) CATS.push(b.c); });

  /* ---------- État ---------- */
  var state = store.get("motus.profile", null);
  if (!state) state = { id: uuid(), pseudo: "", xp: 0, games: 0, wins: 0, level: 1 };
  if (!state.id) state.id = uuid();
  if (!state.b) state.b = freshCounters();
  if (state.elo == null) state.elo = 1000;          // valeur serveur, relue à chaque synchro
  if (state.eloGames == null) state.eloGames = 0;
  else { var f = freshCounters(); for (var k in f) if (state.b[k] === undefined) state.b[k] = f[k]; }
  if (!state.badges) state.badges = [];
  if (!state.emblem) state.emblem = "";
  state.level = levelFromXp(state.xp);
  function saveLocal() { store.set("motus.profile", state); }

  function emblemEmoji() { var b = BADGE_BY_ID[state.emblem]; return b ? b.e : ""; }

  /* ---------- Déblocage des badges ---------- */
  function checkBadges(silent) {
    var gained = [];
    BADGES.forEach(function (bd) {
      if (state.badges.indexOf(bd.id) >= 0) return;
      var ok = false;
      try { ok = !!bd.t(state.b, state); } catch (e) { ok = false; }
      if (ok) { state.badges.push(bd.id); gained.push(bd); }
    });
    if (gained.length) {
      saveLocal();
      if (!silent) gained.forEach(function (bd, i) { setTimeout(function () { badgeToast(bd); }, i * 1600); });
      refreshOpen();
    }
    return gained;
  }

  /* ---------- Réseau (Supabase REST) ---------- */
  function headers(extra) {
    var h = { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json" };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function pushRemote() {
    if (!configured) return;
    state.updated_at = new Date().toISOString();
    fetch(API + "/rest/v1/profiles", {
      method: "POST",
      headers: headers({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ id: state.id, pseudo: state.pseudo, xp: state.xp, games: state.games,
                             wins: state.wins, level: state.level, badge: emblemEmoji(),
                             data: { b: state.b, badges: state.badges, emblem: state.emblem,
                                     emblemAt: state.emblemAt || 0,
                                     hintEarned: state.hintEarned || 0,
                                     hintSpent: state.hintSpent || 0,
                                     hintGrants: state.hintGrants || {} },
                             updated_at: state.updated_at })
    }).catch(function () {});
  }
  var pushTimer;
  function pushDebounced() { clearTimeout(pushTimer); pushTimer = setTimeout(pushRemote, 300); }
  function fetchRemote(id) {
    if (!configured) return Promise.resolve(null);
    return fetch(API + "/rest/v1/profiles?select=*&id=eq." + encodeURIComponent(id), { headers: headers(), cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (a) { return (a && a[0]) || null; })
      .catch(function () { return null; });
  }
  function countQuery(qs) {
    if (!configured) return Promise.resolve(null);
    return fetch(API + "/rest/v1/" + qs, { headers: headers({ "Prefer": "count=exact", "Range": "0-0" }), cache: "no-store" })
      .then(function (r) { var cr = r.headers.get("content-range") || "*/0"; return parseInt(cr.split("/")[1], 10) || 0; })
      .catch(function () { return null; });
  }
  /* Fusionne le profil distant avec le profil local.
     Règle : on ne perd jamais rien — on garde la plus grande valeur de chaque
     compteur et l'union des jours joués et des badges. */
  function mergeRemote(rem) {
    if (!rem) return;
    // Elo : calculé et détenu par la base. On le recopie tel quel, sans jamais
    // le fusionner ni le renvoyer — sinon un client pourrait le gonfler.
    state.elo = (rem.elo == null) ? 1000 : rem.elo;
    state.eloGames = rem.elo_games || 0;
    state.xp = Math.max(state.xp || 0, rem.xp || 0);
    state.games = Math.max(state.games || 0, rem.games || 0);
    state.wins = Math.max(state.wins || 0, rem.wins || 0);
    if (!state.pseudo && rem.pseudo) state.pseudo = rem.pseudo;

    var d = rem.data || {};
    var rb = d.b || {}, lb = state.b;
    Object.keys(lb).forEach(function (k) {
      if (k === "days" || k === "modes") return;
      if (typeof lb[k] === "number") lb[k] = Math.max(lb[k] || 0, rb[k] || 0);
    });
    // jours joués et modes essayés : union
    (rb.days || []).forEach(function (x) { if (lb.days.indexOf(x) < 0) lb.days.push(x); });
    (rb.modes || []).forEach(function (x) { if (lb.modes.indexOf(x) < 0) lb.modes.push(x); });
    if (!lb.duelLostTo) lb.duelLostTo = [];
    (rb.duelLostTo || []).forEach(function (x) { if (lb.duelLostTo.indexOf(x) < 0) lb.duelLostTo.push(x); });
    if (!lb.raceThemes) lb.raceThemes = [];
    (rb.raceThemes || []).forEach(function (x) { if (lb.raceThemes.indexOf(x) < 0) lb.raceThemes.push(x); });
    if (lb.days.length > 500) lb.days = lb.days.slice(-500);
    lb.dayBest = Math.max(lb.dayBest || 0, dayStreak(lb.days));
    // badges : union
    (d.badges || []).forEach(function (id) { if (state.badges.indexOf(id) < 0) state.badges.push(id); });
    // Emblème : le plus RÉCEMMENT choisi gagne. L'ancienne règle ne le
    // reprenait que si le local était vide, donc un changement fait sur un
    // appareil ne remontait jamais sur l'autre.
    var remAt = d.emblemAt || 0, locAt = state.emblemAt || 0;
    if (d.emblem && remAt > locAt) { state.emblem = d.emblem; state.emblemAt = remAt; }
    else if (!state.emblem && d.emblem) state.emblem = d.emblem;

    // Jetons d'indice : deux cumuls monotones, fusionnés par max — le solde
    // en découle, il n'est jamais fusionné directement.
    state.hintEarned = Math.max(state.hintEarned || 0, d.hintEarned || 0);
    state.hintSpent  = Math.max(state.hintSpent  || 0, d.hintSpent  || 0);
    var rg = d.hintGrants || {}, lg = state.hintGrants || (state.hintGrants = {});
    Object.keys(rg).forEach(function (k) { if (!lg[k]) lg[k] = rg[k]; });
    if (window.motusHintsRefresh) {
      try { window.motusHintsRefresh(state.hintEarned, state.hintSpent, lg); } catch (e) {}
    }

    state.level = levelFromXp(state.xp);
    checkBadges(true);
    saveLocal();
  }

  var syncing = false;
  function syncNow(cb) {
    if (!configured) { if (cb) cb(false); return; }
    if (syncing) return;
    syncing = true;
    fetchRemote(state.id).then(function (rem) {
      mergeRemote(rem);
      pushRemote();
      syncing = false;
      refreshOpen();
      if (cb) cb(true);
    }).catch(function () { syncing = false; if (cb) cb(false); });
  }
  function syncInit() { syncNow(); }

  /* ---------- Helpers ---------- */
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function el(id) { return document.getElementById(id); }
  function set(id, v) { var e = el(id); if (e) e.textContent = v; }
  function dayStreak(days) {
    var s = days.slice().sort(), best = s.length ? 1 : 0, cur = 1;
    for (var i = 1; i < s.length; i++) {
      var diff = Math.round((new Date(s[i]) - new Date(s[i - 1])) / 86400000);
      if (diff === 1) { cur++; if (cur > best) best = cur; }
      else if (diff > 1) { cur = 1; }
    }
    return best;
  }

  /* ---------- Styles ---------- */
  var STYLE = `
#profileOverlay .modal{ max-width:420px; max-height:88dvh; display:flex; flex-direction:column; }
#profileOverlay .pane{ overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; flex:1; min-height:0; padding-right:2px; }
#profileOverlay .prof-tabs{ flex:none; }
#profileOverlay .modal > .btn{ flex:none; }
.prof-tabs{ display:flex; gap:4px; margin:2px 0 14px; }
.ptab{ flex:1; height:36px; border:none; border-radius:9px; background:var(--cell); color:var(--ink-dim); font-weight:700; font-size:12px; cursor:pointer; box-shadow:inset 0 0 0 1.5px var(--cell-edge); padding:0 2px; }
.ptab.active{ background:var(--accent); color:#fff; box-shadow:none; }
.prof-row{ display:flex; gap:8px; margin-bottom:14px; }
.compte-ok{ color:#3ecf6b; font-size:12px; font-weight:700; }
.compte-ko{ color:#ffcb2e; font-size:12px; font-weight:700; }
.compte-note{ font-size:11.5px; color:var(--ink-dim); line-height:1.5; margin:8px 0; }
#pseudoInput,#restoreCode{ flex:1; height:44px; border:none; border-radius:10px; background:var(--cell); box-shadow:inset 0 0 0 1.5px var(--cell-edge); color:var(--ink); padding:0 12px; font-size:15px; font-weight:600; }
#pseudoInput:focus,#restoreCode:focus{ outline:none; box-shadow:inset 0 0 0 2px var(--accent); }
.prof-level{ margin-bottom:14px; }
.prof-lvl{ font-size:16px; font-weight:700; margin-bottom:8px; }
.xpbar{ height:14px; background:var(--cell); border-radius:8px; overflow:hidden; box-shadow:inset 0 0 0 1.5px var(--cell-edge); }
.xpbar>div{ height:100%; background:var(--accent); width:0; transition:width .5s ease; border-radius:8px; }
.xptext{ font-size:12px; color:var(--ink-dim); margin-top:4px; text-align:right; }
.emb-line{ display:flex; align-items:center; gap:8px; background:var(--cell); border-radius:10px; padding:8px 12px; margin-bottom:14px; font-size:13px; box-shadow:inset 0 0 0 1.5px var(--cell-edge); }
.emb-line .ee{ font-size:22px; }
.emb-line span{ color:var(--ink-dim); }
.bcat{ font-size:11px; color:var(--ink-dim); text-transform:uppercase; letter-spacing:.6px; font-weight:800; margin:14px 0 8px; display:flex; justify-content:space-between; align-items:baseline; }
.bcat-n{ font-size:11px; color:var(--ink-dim); font-weight:800; letter-spacing:0; }
.badge2.secret{ filter:none; opacity:.5; }
#nextGoals{ margin:4px 0 8px; }
.ng-title{ font-size:11px; color:var(--ink-dim); text-transform:uppercase; letter-spacing:.6px; font-weight:800; margin:0 0 8px; }
.ng-row{ display:flex; align-items:center; gap:10px; margin-bottom:8px; }
.ng-em{ font-size:22px; width:26px; text-align:center; }
.ng-body{ flex:1; min-width:0; }
.ng-name{ font-size:13px; font-weight:700; margin-bottom:3px; }
.ng-bar{ height:8px; background:var(--cell); border-radius:5px; overflow:hidden; box-shadow:inset 0 0 0 1.5px var(--cell-edge); }
.ng-bar>div{ height:100%; background:var(--accent); border-radius:5px; transition:width .5s ease; }
.ng-num{ font-size:12px; font-weight:800; color:var(--ink-dim); font-variant-numeric:tabular-nums; }
#badgeDetailOverlay .bd-modal{ max-width:340px; text-align:center; }
.bd-emoji{ font-size:60px; line-height:1; margin:8px 0 6px; }
.bd-name{ font-size:22px; font-weight:800; }
.bd-cat{ font-size:12px; color:var(--ink-dim); text-transform:uppercase; letter-spacing:.5px; font-weight:700; margin-top:2px; }
.bd-status{ margin:12px 0 4px; font-size:14px; font-weight:800; }
.bd-done{ color:#39d98a; }
.bd-lock{ color:var(--ink-dim); }
.bd-desc{ font-size:15px; color:var(--ink); margin:6px 4px 4px; line-height:1.4; }
.bd-prog{ margin:12px 4px 0; }
.bd-bar{ height:12px; background:var(--cell); border-radius:7px; overflow:hidden; box-shadow:inset 0 0 0 1.5px var(--cell-edge); }
.bd-bar>div{ height:100%; background:var(--accent); border-radius:7px; transition:width .5s ease; }
.bd-pnum{ font-size:13px; font-weight:800; color:var(--ink-dim); margin-top:5px; font-variant-numeric:tabular-nums; }
.bd-actions{ margin-top:16px; }
.bd-actions .btn{ margin:0; }
.badges{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
.badge2{ aspect-ratio:1; border-radius:12px; background:var(--cell); box-shadow:inset 0 0 0 1.5px var(--cell-edge); display:grid; place-items:center; font-size:24px; position:relative; cursor:pointer; border:none; color:var(--ink); padding:0; }
.badge2.off{ filter:grayscale(1); opacity:.3; cursor:default; }
.badge2.sel{ box-shadow:inset 0 0 0 2.5px var(--accent); }
.badge2 .pin{ position:absolute; top:2px; right:4px; font-size:10px; }
.bname{ font-size:9px; line-height:1.15; margin-top:2px; text-align:center; color:var(--ink-dim); }
.badge2.on .bname{ color:var(--ink); }
.bwrap{ display:flex; flex-direction:column; align-items:center; gap:2px; }
.bcount{ text-align:center; font-weight:800; font-size:15px; margin-bottom:2px; }
.bcount small{ display:block; font-weight:600; font-size:11px; color:var(--ink-dim); }
.lb{ display:flex; flex-direction:column; gap:5px; }
.lb .r{ display:flex; align-items:center; gap:8px; font-size:14px; padding:6px 10px; background:var(--cell); border-radius:8px; }
.lb .r .rk{ width:22px; color:var(--ink-dim); font-weight:800; }
.lb .r .nm{ flex:1; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lb .r .em{ font-size:16px; }
.lb .r .lv{ color:var(--ink-dim); font-size:12px; }
.lb .r.me{ box-shadow:inset 0 0 0 1.5px var(--accent); }
.rank-tabs{ display:flex; gap:6px; margin-bottom:12px; }
.rk-tab{ flex:1; height:34px; border:none; border-radius:9px; background:var(--cell); color:var(--ink-dim); box-shadow:inset 0 0 0 1.5px var(--cell-edge); font-weight:800; font-size:13px; cursor:pointer; }
.rk-tab.on{ background:var(--accent); color:#fff; box-shadow:none; }
.elo-line{ display:flex; align-items:center; justify-content:space-between; gap:10px; background:var(--cell); border-radius:12px; padding:11px 14px; margin-bottom:12px; box-shadow:inset 0 0 0 1.5px var(--cell-edge); }
.elo-line .lbl{ font-size:13px; color:var(--ink-dim); font-weight:700; }
.elo-line .val{ font-size:22px; font-weight:800; color:var(--accent); }
.elo-line small{ display:block; font-size:11px; color:var(--ink-dim); font-weight:700; }
.myrank{ text-align:center; font-weight:700; margin-bottom:12px; font-size:15px; }
.myrank b{ color:var(--accent); font-size:20px; }
.today-head{ text-align:center; margin-bottom:14px; }
.today-big{ font-size:34px; font-weight:800; }
.today-sub{ color:var(--ink-dim); font-size:13px; }
.prof-sync{ margin-top:14px; font-size:13px; color:var(--ink-dim); }
.prof-sync summary{ cursor:pointer; font-weight:700; color:var(--ink); margin-bottom:6px; }
#syncCode{ flex:1; font-size:11px; word-break:break-all; color:var(--ink-dim); background:var(--cell); padding:8px 10px; border-radius:8px; }
.prof-sync .btn{ width:auto; padding:0 14px; height:40px; margin:0; font-size:13px; flex:none; }
#savePseudo{ width:auto; padding:0 16px; height:44px; margin:0; flex:none; }
.refresh-btn{ width:100%; height:38px; margin:0 0 12px; font-size:13px; }
.refresh-btn.spin{ opacity:.6; pointer-events:none; }
.muted{ color:var(--ink-dim); text-align:center; font-size:14px; padding:10px 0; }
.dist-title{ font-size:12px; color:var(--ink-dim); text-transform:uppercase; letter-spacing:.4px; margin:4px 0 8px; }
.dist{ display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.dist .bar{ display:flex; align-items:center; gap:8px; font-size:13px; }
.dist .bar .k{ width:12px; color:var(--ink-dim); font-weight:700; }
.dist .bar .t{ background:var(--accent); height:22px; border-radius:5px; min-width:26px; display:flex; align-items:center; justify-content:flex-end; padding:0 8px; color:#fff; font-weight:700; font-size:12px; }
.perso{ margin-bottom:14px; }
.perso-t{ font-size:12px; color:var(--ink-dim); text-transform:uppercase; letter-spacing:.4px; margin:0 0 8px; }
.perso-themes{ display:flex; gap:8px; margin-bottom:10px; }
.perso-th{ flex:1; height:40px; border:none; border-radius:11px; background:var(--cell); color:var(--ink-dim); box-shadow:inset 0 0 0 1.5px var(--cell-edge); font-weight:700; font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; }
.perso-th.on{ background:var(--accent); color:#fff; box-shadow:none; }
.perso-swatches{ display:grid; grid-template-columns:repeat(7,1fr); gap:8px; }
.perso-sw{ display:flex; flex-direction:column; align-items:center; gap:4px; background:none; border:none; cursor:pointer; padding:2px; }
.perso-dot{ width:30px; height:30px; border-radius:50%; box-shadow:inset 0 0 0 2px rgba(255,255,255,.25); }
.perso-sw.on .perso-dot{ box-shadow:0 0 0 2px var(--bg), 0 0 0 4px var(--accent); }
#badgeToast{ position:fixed; left:50%; bottom:24px; transform:translate(-50%,20px); background:var(--ink); color:var(--bg); padding:12px 18px; border-radius:14px; display:flex; align-items:center; gap:10px; opacity:0; pointer-events:none; transition:.25s; z-index:300; box-shadow:0 10px 30px rgba(0,0,0,.45); max-width:88vw; }
#badgeToast.show{ opacity:1; transform:translate(-50%,0); }
#badgeToast .be{ font-size:28px; }
#badgeToast b{ display:block; font-size:14px; }
#badgeToast small{ opacity:.7; font-size:12px; }`;

  var MODAL = `
<div class="overlay" id="profileOverlay">
  <div class="modal">
    <button class="close-x" data-close-prof>&times;</button>
    <div class="prof-tabs">
      <button class="ptab active" data-tab="profil">Profil</button>
      <button class="ptab" data-tab="badges">Badges</button>
      <button class="ptab" data-tab="rank">Classement</button>
      <button class="ptab" data-tab="today">Auj.</button>
    </div>

    <div class="pane" id="pane-profil">
      <div class="prof-row">
        <input id="pseudoInput" placeholder="Ton pseudo" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false">
        <button class="btn" id="savePseudo">OK</button>
      </div>
      <div class="emb-line"><span class="ee" id="embEmoji">🎖️</span><div><b id="embName">Aucun emblème</b><br><span>Choisis-le dans l'onglet Badges</span></div></div>
      <div class="prof-level">
        <div class="prof-lvl">Niveau <b id="pLevel">1</b> · <span id="pTitle">Débutant</span></div>
        <div class="xpbar"><div id="pXpFill"></div></div>
        <div class="xptext" id="pXpText"></div>
      </div>
      <div class="stats">
        <div class="stat"><div class="n" id="pGames">0</div><div class="l">Parties</div></div>
        <div class="stat"><div class="n" id="pWins">0</div><div class="l">Victoires</div></div>
        <div class="stat"><div class="n" id="pXp">0</div><div class="l">XP total</div></div>
      </div>
      <div id="nextGoals"></div>
      <div id="adminSlot"></div>
      <div id="gameStats"></div>
      <div id="personalizeBox"></div>
      <details class="prof-sync" id="compteBox">
        <summary>Mon compte <span id="compteEtat"></span></summary>
        <p id="compteIntro"></p>
        <button class="btn" id="compteSave" style="width:100%">🔗 Sauvegarder mon compte</button>
        <p class="compte-note">Ce lien <b>est</b> ton compte : garde-le pour toi, et range-le quelque part
          (notes, courriel que tu t'envoies). Il sert à te retrouver sur un autre téléphone
          — ou sur celui-ci si tu effaces les données de ton navigateur.</p>
        <div class="prof-row"><code id="syncCode"></code><button class="btn ghost" id="copyCode">Copier</button></div>
        <p class="compte-note">Déjà un compte ailleurs ? Colle son code ici pour le récupérer.
          <b>Attention :</b> la progression de cet appareil sera fusionnée avec l'autre.</p>
        <div class="prof-row"><input id="restoreCode" placeholder="Coller un code ou un lien…" autocomplete="off"><button class="btn ghost" id="restoreBtn">Récupérer</button></div>
        <button class="btn ghost" id="syncBtn" style="width:100%">Synchroniser maintenant</button>
        <div id="syncMsg" style="text-align:center;margin-top:6px;font-size:12px"></div>
      </details>
    </div>

    <div class="pane" id="pane-badges" style="display:none">
      <div class="bcount" id="bCount"></div>
      <div id="badgeList"></div>
    </div>

    <div class="pane" id="pane-rank" style="display:none">
      <div class="rank-tabs">
        <button class="rk-tab on" data-rk="xp">Expérience</button>
        <button class="rk-tab" data-rk="elo">⚔️ Duel</button>
      </div>
      <div class="myrank" id="myRank"></div>
      <button class="btn ghost refresh-btn" id="btnRefreshRank">↻ Actualiser</button>
      <div id="leaderboard" class="lb"></div>
    </div>

    <div class="pane" id="pane-today" style="display:none">
      <button class="btn ghost refresh-btn" id="btnRefreshToday">↻ Actualiser</button>
      <div id="todayStats"></div>
    </div>

    <button class="btn ghost" data-close-prof style="margin-top:16px">Fermer</button>
  </div>
</div>
<div class="overlay" id="badgeDetailOverlay">
  <div class="modal bd-modal">
    <button class="close-x" id="bdClose">&times;</button>
    <div class="bd-emoji" id="bdEmoji">🏆</div>
    <div class="bd-name" id="bdName"></div>
    <div class="bd-cat" id="bdCat"></div>
    <div class="bd-status" id="bdStatus"></div>
    <div class="bd-desc" id="bdDesc"></div>
    <div class="bd-prog" id="bdProg"></div>
    <div class="bd-actions" id="bdActions"></div>
  </div>
</div>
<div id="badgeToast"><span class="be"></span><div><b></b><small></small></div></div>`;

  var mounted = false, curTab = "profil";
  function mount() {
    if (mounted || el("profileOverlay")) { mounted = true; return; }
    mounted = true;
    var st = document.createElement("style"); st.textContent = STYLE; document.head.appendChild(st);
    var wrap = document.createElement("div"); wrap.innerHTML = MODAL.trim();
    while (wrap.firstElementChild) document.body.appendChild(wrap.firstElementChild);

    function close() { closeBadgeDetail(); el("profileOverlay").classList.remove("open"); }
    var ov = el("profileOverlay");
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    var bdo = el("badgeDetailOverlay");
    if (bdo) {
      bdo.addEventListener("click", function (e) { if (e.target === bdo) closeBadgeDetail(); });
      var bx = el("bdClose"); if (bx) bx.addEventListener("click", closeBadgeDetail);
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-close-prof]"), function (b) { b.addEventListener("click", close); });
    Array.prototype.forEach.call(document.querySelectorAll(".ptab"), function (b) {
      b.addEventListener("click", function () { showTab(b.getAttribute("data-tab")); });
    });

    el("savePseudo").addEventListener("click", function () { setPseudo(el("pseudoInput").value); });
    el("pseudoInput").addEventListener("keydown", function (e) { if (e.key === "Enter") setPseudo(el("pseudoInput").value); });
    el("copyCode").addEventListener("click", function () {
      try { navigator.clipboard.writeText(state.id); el("copyCode").textContent = "Copié"; setTimeout(function () { el("copyCode").textContent = "Copier"; }, 1200); } catch (e) {}
    });
    el("syncBtn").addEventListener("click", function () {
      var m = el("syncMsg");
      if (!configured) { m.textContent = "Base non configurée"; return; }
      m.textContent = "Synchronisation…";
      syncNow(function (ok) { m.textContent = ok ? "À jour ✓" : "Échec — réessaie"; fillProfil(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".rk-tab"), function (b) {
      b.addEventListener("click", function () {
        if (rankMode === b.dataset.rk) return;
        rankMode = b.dataset.rk;
        Array.prototype.forEach.call(document.querySelectorAll(".rk-tab"), function (x) { x.classList.toggle("on", x === b); });
        loadRank();
      });
    });
    el("btnRefreshRank").addEventListener("click", function () {
      var b = el("btnRefreshRank"); b.classList.add("spin"); b.textContent = "Actualisation…";
      loadRank(function () { b.classList.remove("spin"); b.textContent = "↻ Actualiser"; });
    });
    el("btnRefreshToday").addEventListener("click", function () {
      var b = el("btnRefreshToday"); b.classList.add("spin"); b.textContent = "Actualisation…";
      loadToday(function () { b.classList.remove("spin"); b.textContent = "↻ Actualiser"; });
    });
    var boutonSave = el("compteSave");
    if (boutonSave) boutonSave.addEventListener("click", function () {
      var lien = location.origin + location.pathname + "?compte=" + state.id;
      var txt = "Mon compte " + (state.pseudo || "") + " — ouvre ce lien pour le récupérer :\n" + lien;
      marquerSauve();
      if (navigator.share) navigator.share({ text: txt }).catch(function () { copier(txt); });
      else copier(txt);
    });
    function copier(t) {
      try {
        navigator.clipboard.writeText(t);
        el("syncMsg").textContent = "Lien copié — range-le en lieu sûr ✓";
      } catch (e) { el("syncMsg").textContent = "Copie impossible : recopie le code ci-dessous."; }
    }
    /* Le joueur a fait la démarche : on cesse de le relancer. */
    function marquerSauve() {
      try { localStorage.setItem("motus.compteSauve", "1"); } catch (e) {}
      peindreCompte();
    }

    el("restoreBtn").addEventListener("click", function () {
      var brut = (el("restoreCode").value || "").trim();
      // on accepte aussi bien un lien complet qu'un code seul
      var m = brut.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      var code = m ? m[0] : brut;
      if (code === state.id) { el("syncMsg").textContent = "C'est déjà ce compte."; el("restoreCode").value = ""; return; }
      if (!/^[0-9a-f-]{16,}$/i.test(code)) { el("restoreCode").value = ""; el("restoreCode").placeholder = "Code invalide"; return; }
      if (!configured) { el("restoreCode").placeholder = "Base non configurée"; el("restoreCode").value = ""; return; }
      fetchRemote(code).then(function (rem) {
        if (!rem) { el("restoreCode").value = ""; el("restoreCode").placeholder = "Code introuvable"; return; }
        state.id = code;            // les deux appareils partagent désormais le même profil
        mergeRemote(rem);           // et on garde le meilleur des deux
        pushRemote();
        el("restoreCode").value = "";
        el("syncMsg").textContent = "Compte récupéré ✓";
        try { localStorage.setItem("motus.compteSauve", "1"); } catch (e) {}
        peindreCompte();
        fillProfil();
      });
    });
  }

  var btTimer;
  function badgeToast(bd) {
    mount();
    var t = el("badgeToast"); if (!t) return;
    t.querySelector(".be").textContent = bd.e;
    t.querySelector("b").textContent = "Badge débloqué : " + bd.n;
    t.querySelector("small").textContent = bd.d;
    t.classList.add("show");
    clearTimeout(btTimer);
    btTimer = setTimeout(function () { t.classList.remove("show"); }, 3000);
    try { navigator.vibrate && navigator.vibrate([10, 60, 10]); } catch (e) {}
  }

  function showTab(tab) {
    curTab = tab;
    Array.prototype.forEach.call(document.querySelectorAll(".ptab"), function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === tab); });
    ["profil", "badges", "rank", "today"].forEach(function (t) {
      var p = el("pane-" + t); if (p) p.style.display = (t === tab) ? "" : "none";
    });
    if (tab === "profil") fillProfil();
    else if (tab === "badges") fillBadges();
    else if (tab === "rank") loadRank();
    else if (tab === "today") loadToday();
  }

  function fillProfil() {
    var li = levelInfo(state.xp);
    set("pLevel", li.level); set("pTitle", li.title);
    var f = el("pXpFill"); if (f) f.style.width = Math.round(li.progress * 100) + "%";
    set("pXpText", li.inLevel + " / " + li.span + " XP  (encore " + li.toNext + ")");
    set("pGames", state.games); set("pWins", state.wins); set("pXp", state.xp);
    var pi = el("pseudoInput"); if (pi && document.activeElement !== pi) pi.value = state.pseudo || "";
    var sc = el("syncCode"); if (sc) sc.textContent = state.id;
    peindreCompte();
    var bd = BADGE_BY_ID[state.emblem];
    set("embEmoji", bd ? bd.e : "🎖️");
    set("embName", bd ? bd.n : "Aucun emblème");
    fillNextGoals();
  }

  /* Le joueur doit savoir, d'un coup d'œil, si sa progression survivrait à
     la perte de son téléphone. */
  function compteSauve() {
    try { return localStorage.getItem("motus.compteSauve") === "1"; } catch (e) { return false; }
  }
  function peindreCompte() {
    var et = el("compteEtat"), intro = el("compteIntro");
    if (!et) return;
    var ok = compteSauve();
    et.textContent = ok ? "· sauvegardé ✓" : "· non sauvegardé";
    et.className = ok ? "compte-ok" : "compte-ko";
    if (intro) intro.textContent = ok
      ? "Ta progression est récupérable ailleurs. Tu peux regénérer le lien à tout moment."
      : "Ta progression n'existe que sur cet appareil. Si tu le perds ou que tu effaces les données du navigateur, tout disparaît.";
  }

  /* Invitation à sauvegarder, une fois que le joueur a quelque chose à
     perdre — pas à la première partie, où il s'en moque à juste titre. */
  function inviterSauvegarde() {
    if (compteSauve()) return;
    if (state.games < 12 && state.level < 3) return;
    try {
      if (localStorage.getItem("motus.compteRappel") === String(state.games)) return;
      localStorage.setItem("motus.compteRappel", String(state.games));
    } catch (e) {}
    var t = el("badgeToast"); if (!t) return;
    t.innerHTML = '<b>Pense à sauvegarder ton compte</b><br><span style="font-size:12px">'
      + state.games + ' parties, niveau ' + levelInfo(state.xp).level
      + ' — tout est encore sur ce seul appareil.</span>';
    t.classList.add("show");
    clearTimeout(btTimer);
    btTimer = setTimeout(function () { t.classList.remove("show"); t.innerHTML = ""; }, 6000);
  }

  function badgeUnlocked(id) { return state.badges.indexOf(id) >= 0; }
  function badgeProgress(bd) {
    if (!bd.p) return null;
    var cur = 0; try { cur = bd.p[0](state.b, state) || 0; } catch (e) {}
    var tgt = bd.p[1];
    return { cur: Math.min(cur, tgt), tgt: tgt, ratio: tgt ? Math.min(cur / tgt, 1) : 1 };
  }

  function fillBadges() {
    var box = el("badgeList"); if (!box) return;
    var got = state.badges.length;
    el("bCount").innerHTML = got + " / " + BADGES.length + " badges<small>Touche un badge pour voir à quoi il correspond</small>";
    var html = "";
    CATS.forEach(function (cat) {
      var list = BADGES.filter(function (b) { return b.c === cat; });
      var owned = list.filter(function (b) { return badgeUnlocked(b.id); }).length;
      html += '<div class="bcat">' + escapeHtml(cat) + '<span class="bcat-n">' + owned + '/' + list.length + '</span></div><div class="badges">';
      list.forEach(function (b) {
        var on = badgeUnlocked(b.id);
        var secret = b.h && !on;
        var emo = secret ? "❓" : b.e;
        var nm = secret ? "Secret" : b.n;
        html += '<div class="bwrap"><button class="badge2' + (on ? " on" : " off") + (secret ? " secret" : "") + (state.emblem === b.id ? " sel" : "") +
                '" data-badge="' + b.id + '">' + emo +
                (state.emblem === b.id ? '<span class="pin">📌</span>' : "") + "</button>" +
                '<div class="bname">' + escapeHtml(nm) + "</div></div>";
      });
      html += "</div>";
    });
    box.innerHTML = html;
    Array.prototype.forEach.call(box.querySelectorAll(".badge2"), function (btn) {
      btn.addEventListener("click", function () { openBadgeDetail(btn.getAttribute("data-badge")); });
    });
  }

  function closeBadgeDetail() { var o = el("badgeDetailOverlay"); if (o) o.classList.remove("open"); }
  function openBadgeDetail(id) {
    var bd = BADGE_BY_ID[id]; if (!bd) return;
    var on = badgeUnlocked(id);
    var secret = bd.h && !on;
    el("bdEmoji").textContent = secret ? "❓" : bd.e;
    el("bdName").textContent = secret ? "Badge secret" : bd.n;
    el("bdCat").textContent = bd.c + (bd.h ? " · caché" : "");
    var desc = el("bdDesc"), prog = el("bdProg"), act = el("bdActions"), status = el("bdStatus");
    if (secret) {
      desc.textContent = "Continue à jouer pour le découvrir…";
      status.textContent = ""; prog.innerHTML = ""; act.innerHTML = "";
    } else {
      desc.textContent = bd.d;
      var pr = badgeProgress(bd);
      if (on) {
        status.innerHTML = '<span class="bd-done">✓ Débloqué</span>';
        prog.innerHTML = "";
        var isE = state.emblem === id;
        act.innerHTML = '<button class="btn" id="bdEmblem">' + (isE ? "Retirer l'emblème" : "Définir comme emblème") + "</button>";
        el("bdEmblem").addEventListener("click", function () {
          state.emblem = isE ? "" : id;
          state.emblemAt = Date.now();   // horodaté : c'est le choix le plus récent qui gagne entre appareils
          saveLocal(); pushDebounced();
          fillBadges(); fillProfil(); closeBadgeDetail();
        });
      } else {
        status.innerHTML = '<span class="bd-lock">🔒 Verrouillé</span>';
        prog.innerHTML = pr ? ('<div class="bd-bar"><div style="width:' + Math.round(pr.ratio * 100) + '%"></div></div><div class="bd-pnum">' + pr.cur + " / " + pr.tgt + "</div>") : "";
        act.innerHTML = "";
      }
    }
    el("badgeDetailOverlay").classList.add("open");
  }

  function fillNextGoals() {
    var box = el("nextGoals"); if (!box) return;
    var cand = [];
    BADGES.forEach(function (bd) {
      if (badgeUnlocked(bd.id) || bd.h) return;   // ni obtenus, ni cachés
      var pr = badgeProgress(bd);
      if (pr) cand.push({ bd: bd, pr: pr });
    });
    cand.sort(function (a, b) { return (b.pr.ratio - a.pr.ratio) || (a.pr.tgt - b.pr.tgt); });
    var top = cand.slice(0, 3);
    if (!top.length) { box.innerHTML = ""; return; }
    var html = '<div class="ng-title">Prochains objectifs</div>';
    top.forEach(function (x) {
      html += '<div class="ng-row"><span class="ng-em">' + x.bd.e + '</span>' +
              '<div class="ng-body"><div class="ng-name">' + escapeHtml(x.bd.n) + '</div>' +
              '<div class="ng-bar"><div style="width:' + Math.round(x.pr.ratio * 100) + '%"></div></div></div>' +
              '<span class="ng-num">' + x.pr.cur + "/" + x.pr.tgt + "</span></div>";
    });
    box.innerHTML = html;
  }

  var rankMode = "xp";
  function loadRank(done) {
    var box = el("leaderboard"), mr = el("myRank");
    if (!configured) { mr.textContent = ""; box.innerHTML = '<div class="muted">Classement disponible une fois la base configurée.</div>'; if (done) done(); return; }
    mr.textContent = "…"; box.innerHTML = '<div class="muted">Chargement…</div>';

    if (rankMode === "elo") return loadRankElo(done);

    Promise.all([countQuery("profiles?select=id&xp=gt." + state.xp), countQuery("profiles?select=id")])
      .then(function (r) {
        if (r[0] != null && r[1] != null) mr.innerHTML = "Ta place : <b>#" + (r[0] + 1) + "</b> sur " + r[1] + " joueurs";
        else mr.textContent = "";
      });
    fetch(API + "/rest/v1/profiles?select=id,pseudo,level,xp,badge&order=xp.desc&limit=20", { headers: headers(), cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        if (!rows.length) { box.innerHTML = '<div class="muted">Personne encore — sois le premier !</div>'; return; }
        box.innerHTML = rows.map(function (p, i) {
          var me = p.id === state.id ? " me" : "";
          var nm = (p.pseudo && p.pseudo.trim()) ? p.pseudo : "Anonyme";
          var em = p.badge ? '<span class="em">' + escapeHtml(p.badge) + "</span>" : "";
          return '<div class="r' + me + '"><span class="rk">' + (i + 1) + '</span><span class="nm">' + escapeHtml(nm) + "</span>" + em +
                 '<span class="lv">Niv. ' + (p.level || 1) + " · " + (p.xp || 0) + " XP</span></div>";
        }).join("");
      })
      .catch(function () { box.innerHTML = '<div class="muted">Classement indisponible</div>'; })
      .then(function () { if (done) done(); });
  }

  /* Classement Elo : seuls les joueurs ayant disputé au moins un duel y figurent. */
  function loadRankElo(done) {
    var box = el("leaderboard"), mr = el("myRank");
    var myElo = state.elo || 1000, myGames = state.eloGames || 0;
    var head = '<div class="elo-line"><div><span class="lbl">Ton classement Duel</span>'
             + '<small>' + (myGames ? myGames + (myGames > 1 ? " duels classés" : " duel classé") : "aucun duel classé") + '</small></div>'
             + '<span class="val">' + myElo + '</span></div>';

    Promise.all([
      countQuery("profiles?select=id&elo_games=gt.0&elo=gt." + myElo),
      countQuery("profiles?select=id&elo_games=gt.0")
    ]).then(function (r) {
      if (!myGames) { mr.innerHTML = head + "Joue un duel pour entrer au classement."; }
      else if (r[0] != null && r[1] != null) mr.innerHTML = head + "Ta place : <b>#" + (r[0] + 1) + "</b> sur " + r[1] + " joueurs classés";
      else mr.innerHTML = head;
    });

    fetch(API + "/rest/v1/profiles?select=id,pseudo,badge,elo,elo_games&elo_games=gt.0&order=elo.desc&limit=20", { headers: headers(), cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        if (!rows.length) { box.innerHTML = '<div class="muted">Aucun duel classé pour l\'instant — lance le premier !</div>'; return; }
        box.innerHTML = rows.map(function (p, i) {
          var me = p.id === state.id ? " me" : "";
          var nm = (p.pseudo && p.pseudo.trim()) ? p.pseudo : "Anonyme";
          var em = p.badge ? '<span class="em">' + escapeHtml(p.badge) + "</span>" : "";
          return '<div class="r' + me + '"><span class="rk">' + (i + 1) + '</span><span class="nm">' + escapeHtml(nm) + "</span>" + em +
                 '<span class="lv">' + (p.elo || 1000) + " · " + (p.elo_games || 0) + " duels</span></div>";
        }).join("");
      })
      .catch(function () { box.innerHTML = '<div class="muted">Classement indisponible</div>'; })
      .then(function () { if (done) done(); });
  }

  function loadToday(done) {
    var box = el("todayStats");
    var g = window.Profile.game || "motus", d = todayStr();
    var label = g === "rebus" ? "rébus du jour" : "mot du jour";
    if (!configured) { box.innerHTML = '<div class="muted">Stats communautaires disponibles une fois la base configurée.</div>'; if (done) done(); return; }
    box.innerHTML = '<div class="muted">Chargement…</div>';
    var base = API + "/rest/v1/daily_results?game=eq." + g + "&day=eq." + d;
    Promise.all([
      fetch(base + "&select=won,tries", { headers: headers(), cache: "no-store" }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }),
      fetch(base + "&won=eq.true&select=pseudo,tries&order=tries.asc,created_at.asc&limit=10", { headers: headers(), cache: "no-store" }).then(function (r) { return r.ok ? r.json() : []; })
    ]).then(function (res) {
      var rows = res[0], top = res[1];
      var total = rows.length, solved = rows.filter(function (x) { return x.won; }).length;
      var pct = total ? Math.round(solved / total * 100) : 0;
      var html = '<div class="today-head"><div class="today-big">' + total + '</div><div class="today-sub">' +
                 (total > 1 ? "joueurs ont tenté le " : "joueur a tenté le ") + label + "</div></div>";
      html += '<div class="dist-title">' + pct + "% de réussite (" + solved + "/" + total + ")</div>";
      if (g === "motus") {
        var dist = {}; for (var i = 1; i <= 6; i++) dist[i] = 0;
        rows.forEach(function (x) { if (x.won && x.tries >= 1 && x.tries <= 6) dist[x.tries]++; });
        var max = Math.max(1, dist[1], dist[2], dist[3], dist[4], dist[5], dist[6]);
        html += '<div class="dist-title">Essais de la communauté</div><div class="dist">';
        for (var j = 1; j <= 6; j++) { var v = dist[j], w = Math.max(Math.round(v / max * 100), 8); html += '<div class="bar"><span class="k">' + j + '</span><div class="t" style="width:' + w + '%">' + v + "</div></div>"; }
        html += "</div>";
      }
      html += '<div class="dist-title">Top du jour</div>';
      if (!top.length) html += '<div class="muted">Personne n\'a encore trouvé aujourd\'hui.</div>';
      else html += '<div class="lb">' + top.map(function (p, i) {
        var nm = (p.pseudo && p.pseudo.trim()) ? p.pseudo : "Anonyme";
        var t = g === "motus" ? (p.tries + " essai" + (p.tries > 1 ? "s" : "")) : "trouvé";
        return '<div class="r"><span class="rk">' + (i + 1) + '</span><span class="nm">' + escapeHtml(nm) + '</span><span class="lv">' + t + "</span></div>";
      }).join("") + "</div>";
      box.innerHTML = html;
    }).catch(function () {
      box.innerHTML = '<div class="muted">Stats du jour indisponibles.<br>(La table <b>daily_results</b> existe-t-elle ?)</div>';
    }).then(function () { if (done) done(); });
  }

  function refreshOpen() {
    var o = el("profileOverlay"); if (!o || !o.classList.contains("open")) return;
    if (curTab === "profil") fillProfil();
    else if (curTab === "badges") fillBadges();
  }

  function setPseudo(n) { state.pseudo = (n || "").slice(0, 16); saveLocal(); pushDebounced(); fillProfil(); }
  function open(gameStatsHTML) {
    mount();
    var g = el("gameStats"); if (g) g.innerHTML = gameStatsHTML || "";
    showTab("profil");
    el("profileOverlay").classList.add("open");
    syncNow();                        // on récupère ce qui a été joué ailleurs
  }

  /* ---------- API publique ---------- */
  var CLASSIC = ["court", "normal", "long", "prenoms", "maladies"];

  window.Profile = {
    state: state,
    configured: configured,
    game: "motus",
    levelInfo: levelInfo,
    badges: BADGES,
    open: open,
    setPseudo: setPseudo,

    /* Une partie terminée.
       {won, xp, mode, sub, tries, ms, answer, noYellow} */
    addGame: function (o) {
      o = o || {};
      var b = state.b, now = new Date();
      state.games += (o.gamesInc == null ? 1 : o.gamesInc);
      if (o.won) state.wins++;
      state.xp += (o.xp || 0);
      state.level = levelFromXp(state.xp);

      // jours de jeu
      var day = todayStr();
      if (b.days.indexOf(day) < 0) {
        b.days.push(day);
        if (b.days.length > 500) b.days = b.days.slice(-500);
        b.dayBest = dayStreak(b.days);
      }
      var h = now.getHours(), dw = now.getDay();
      if (h < 5) b.night++; else if (h < 7) b.dawn++;
      if (dw === 0 || dw === 6) b.wknd++;

      var m = o.mode || "normal";
      if (CLASSIC.indexOf(m) >= 0 && b.modes.indexOf(m) < 0) b.modes.push(m);

      // comptage des indices : indépendant du résultat (victoire, échec ou abandon)
      if (o.hintCount) {
        b.hints += o.hintCount;
        if (o.hintCount >= 2) b.hint2Used = (b.hint2Used || 0) + 1;
        if (String(o.answer || "") === "INDICE") b.hintOnIndice = (b.hintOnIndice || 0) + 1;
      }

      if (o.won) {
        b.streak++; if (b.streak > b.best) b.best = b.streak;
        var t = o.tries || 0, ms = o.ms || 0;
        // répartition personnelle : en combien d'essais je trouve d'habitude
        if (!Array.isArray(b.dist) || b.dist.length !== 6) b.dist = [0,0,0,0,0,0];
        if (t >= 1 && t <= 6) b.dist[t-1]++;
        if (ms > 0) { b.msSum = (b.msSum || 0) + ms; b.msCount = (b.msCount || 0) + 1; }
        if (t === 1) b.one++;
        if (t > 0 && t <= 2) b.two++;
        if (t >= 6) b.comeback++;
        if (ms > 0 && ms < 5000) b.f5++;
        if (ms > 0 && ms < 10000) b.f10++;
        if (ms > 0 && ms < 15000) b.f15++;
        if (ms > 600000) b.slow++;
        if (o.noYellow) b.noYellow++;

        // compteurs par mode (le défi compte via sa longueur du moment)
        var key = (m === "defi" || m === "daily") ? (o.sub || "") : m;
        if (key === "court") b.mC++;
        else if (key === "normal") b.mN++;
        else if (key === "long") b.mL++;
        else if (key === "prenoms") b.mP++;
        else if (key === "persos") b.mPe++;
        else if (key === "maladies") b.mM++;
        else if (key === "villes") { b.mV++; if (o.capital) b.villeCap++; if (o.foreign) b.villeMonde++; }
        else if (key === "expert") {
          b.mX++;
          if (o.rare) b.xRare++;
          if (o.clean) b.xClean++;
          b.xStreak++; if (b.xStreak > b.xBest) b.xBest = b.xStreak;
        }

        if (m === "daily") { b.daily++; if (t === 1) b.dailyOne++; }
        if (key === "long" && ms > 0 && ms < 30000) b.longFast++;

        var a = String(o.answer || "");
        if (a.indexOf("-") >= 0 && m === "prenoms") b.hyph++;
        if (a.length > 3) {
          var uniq = {}, dup = false;
          for (var i = 0; i < a.length; i++) { if (uniq[a[i]]) { dup = true; break; } uniq[a[i]] = 1; }
          if (!dup) b.allDiff++;
        }
        if (o.hint) {
          b.cleanStreak = 0;
          if (t === 1) b.hintFirstTry = (b.hintFirstTry || 0) + 1;
          if (key === "maladies") b.hintMaladies = (b.hintMaladies || 0) + 1;
          if (key === "prenoms") b.hintPrenoms = (b.hintPrenoms || 0) + 1;
          if (key === "villes") b.hintVilles = (b.hintVilles || 0) + 1;
          if (key === "persos") b.hintPersos = (b.hintPersos || 0) + 1;
        }
        else { b.cleanStreak++; if (b.cleanStreak > b.cleanBest) b.cleanBest = b.cleanStreak; }
      } else {
        b.streak = 0;
        b.lost = (b.lost || 0) + 1;      // pour un taux de réussite honnête
        if (m === "expert") b.xStreak = 0;
        if (o.hint && o.sixFail) b.hintSixFail = (b.hintSixFail || 0) + 1;
      }

      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
      setTimeout(inviterSauvegarde, 2200);   // après l'écran de résultat
    },

    /* Course terminée. {won, finished, words, lives, ms, theme}
       'won' = a gagné la course ; 'finished' = a recopié toute la suite. */
    raceDone: function (o) {
      o = o || {};
      var b = state.b;
      if (!b.raceThemes) b.raceThemes = [];
      b.racePlay++;
      b.raceWords += (o.words || 0);
      if (o.theme && b.raceThemes.indexOf(o.theme) < 0) b.raceThemes.push(o.theme);
      if (o.finished) {
        if (o.lives >= 3) b.raceClean++;                 // aucune faute de frappe
        if (o.ms > 0 && o.ms < 60000) b.raceFast++;
      }
      if (o.won) {
        b.raceWin++;
        b.raceStreak++;
        if (b.raceStreak > b.raceBest) b.raceBest = b.raceStreak;
      } else {
        b.raceStreak = 0;
      }
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* Attaque terminée (gagnée ou perdue) — côté attaquant. */
    defenseAttackResult: function (o) {
      o = o || {};
      var b = state.b;
      b.defAtkPlay++;
      if (o.won) {
        b.defAtkWin++; b.defAtkStreak++;
        if (b.defAtkStreak > b.defAtkBest) b.defAtkBest = b.defAtkStreak;
      } else {
        b.defAtkStreak = 0;
      }
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* Nouvelles entrées (pas encore vues) du journal des attaques subies —
       côté défenseur. À traiter dans l'ordre chronologique (la plus
       ancienne d'abord) pour que la série se calcule correctement. */
    defenseFeedNew: function (list) {
      if (!list || !list.length) return;
      var b = state.b;
      list.forEach(function (a) {
        if (a.won) { b.defLossesAsDefender++; b.defRepelStreak = 0; }
        else { b.defWinsAsDefender++; b.defRepelStreak++; if (b.defRepelStreak > b.defRepelBest) b.defRepelBest = b.defRepelStreak; }
      });
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* Un mot de défense vient d'être posé. */
    defenseWordSet: function (o) {
      o = o || {};
      var b = state.b;
      if ((o.len || 0) > b.defMaxWordLen) b.defMaxWordLen = o.len;
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* Course en entraînement : ne compte NI pour l'XP NI pour la progression
       normale des badges de Course (c'est un mode d'entraînement, pas une
       vraie partie) — seul ce compteur dédié existe, pour un unique badge secret. */
    raceSolo: function () {
      var b = state.b;
      b.raceSolo = (b.raceSolo || 0) + 1;
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* Abandon d'une partie : uniquement pour le badge secret dédié. */
    giveUp: function () {
      var b = state.b;
      b.giveups = (b.giveups || 0) + 1;
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* Le Pendu terminé. {won, wrong, lives} — 'wrong' = erreurs commises,
       'lives' = nombre total de vies disponibles pour la partie. */
    penduDone: function (o) {
      o = o || {};
      var b = state.b;
      b.penduPlay++;
      if (o.won) {
        b.penduWin++; b.penduStreak++;
        if (b.penduStreak > b.penduBest) b.penduBest = b.penduStreak;
        if ((o.wrong || 0) === 0) b.penduClean++;
        if ((o.lives || 0) - (o.wrong || 0) === 1) b.penduClose++;
      } else {
        b.penduLoss++; b.penduStreak = 0;
      }
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* Duel terminé. {won, perfect, oppId} — 'won' = a gagné le duel, pas juste trouvé le mot. */
    duelDone: function (o) {
      o = o || {};
      var b = state.b;
      if (!b.duelLostTo) b.duelLostTo = [];
      b.duelPlay++;
      if (o.won) {
        b.duelWin++;
        b.duelWinStreak++;
        if (b.duelWinStreak > b.duelBestStreak) b.duelBestStreak = b.duelWinStreak;
        if (o.perfect) b.duelPerfect++;
        if (o.oppId && b.duelLostTo.indexOf(o.oppId) >= 0) {
          b.duelRevenge++;
          b.duelLostTo = b.duelLostTo.filter(function (x) { return x !== o.oppId; });
        }
      } else {
        b.duelWinStreak = 0;
        if (o.oppId && b.duelLostTo.indexOf(o.oppId) < 0) {
          b.duelLostTo.push(o.oppId);
          if (b.duelLostTo.length > 60) b.duelLostTo = b.duelLostTo.slice(-60);
        }
      }
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* Défi du jour terminé. {success, ms} */
    defiDone: function (o) {
      o = o || {};
      var b = state.b;
      if (o.success) {
        b.defi++;
        if (o.ms > 0 && o.ms < 300000) b.defiFast++;
      }
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* Le jeu tient les jetons ; il nous les confie pour qu'ils suivent le
       compte d'un appareil à l'autre. */
    setHints: function (earned, spent, grants) {
      state.hintEarned = Math.max(state.hintEarned || 0, earned || 0);
      state.hintSpent  = Math.max(state.hintSpent  || 0, spent  || 0);
      if (grants) {
        var lg = state.hintGrants || (state.hintGrants = {});
        Object.keys(grants).forEach(function (k) { if (!lg[k]) lg[k] = grants[k]; });
      }
      saveLocal(); pushDebounced();
    },

    submitDaily: function (o) {
      if (!configured || !o) return;
      fetch(API + "/rest/v1/daily_results?on_conflict=player_id,game,day", {
        method: "POST",
        headers: headers({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify({ player_id: state.id, pseudo: state.pseudo, game: o.game, day: o.day,
                               tries: (o.tries == null ? null : o.tries), won: !!o.won })
      }).catch(function () {});
    }
  };

  checkBadges(true);   // rattrape les badges mérités par un profil existant
  saveLocal();

  // resynchronise au retour sur l'application (autre appareil entre-temps)
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) syncNow();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mount(); syncInit(); });
  else { mount(); syncInit(); }
})();
