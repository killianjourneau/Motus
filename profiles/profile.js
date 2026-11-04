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
  /* MD5 (texte ASCII) — sert uniquement à calculer son propre « masque »
     public, identique à celui de la base (fonction SQL masque). */
  function md5hex(str) {
    function add(x, y) { var l = (x & 0xffff) + (y & 0xffff); return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xffff); }
    function rol(n, c) { return (n << c) | (n >>> (32 - c)); }
    function cmn(q, a, b, x, s, t) { return add(rol(add(add(a, q), add(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
    var n = str.length, x = [], i;
    for (i = 0; i < n; i++) x[i >> 2] |= (str.charCodeAt(i) & 0xff) << ((i % 4) * 8);
    x[n >> 2] |= 0x80 << ((n % 4) * 8);
    x[(((n + 8) >> 6) + 1) * 16 - 2] = n * 8;
    var len = (((n + 8) >> 6) + 1) * 16;
    for (i = 0; i < len; i++) x[i] = x[i] | 0;
    var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (i = 0; i < len; i += 16) {
      var oa = a, ob = b, oc = c, od = d;
      a = ff(a, b, c, d, x[i], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586); c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426); c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417); c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101); c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
      a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632); c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i], 20, -373897302);
      a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083); c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690); c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784); c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
      a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463); c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353); c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i], 11, -358537222); c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835); c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
      a = ii(a, b, c, d, x[i], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415); c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606); c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744); c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379); c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
      a = add(a, oa); b = add(b, ob); c = add(c, oc); d = add(d, od);
    }
    var out = "", w = [a, b, c, d];
    for (i = 0; i < 16; i++) out += ((w[i >> 2] >>> ((i % 4) * 8)) & 0xff).toString(16).padStart(2, "0");
    return out;
  }
  /* Le masque public d'un code de compte : md5('mes-public:' + code) au
     format uuid — exactement ce que renvoie la base à la place du code. */
  function masqueDe(id) {
    var h = md5hex("mes-public:" + String(id || "").toLowerCase());
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
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
             qActes:0, qFins:0, qSecrets:0, qMonstres:0, qNiveau:0, qSansMort:0,
             jrTotal:0, jrTousJeux:0, jrDuo:0, jrSerieDuo:0, jrJours:0,
             memoTotal:0, memoReussites:0, memoBest:60, memoSerie:0, memoBestSerie:0,
             royParties:0, royVictoires:0, royPodiums:0, royMeilleurTotal:0, royCodes:{}, royBilan:0, royJouees:0,
             gramJours:0, gramParfaits:0, gramSerie:0, gramBestSerie:0, gramBonnes:0, gramDernier:"",
             hwPeur:0, hwPeurWin:0, hwBonbonsTotal:0, hwBonbonsBest:0, hwJours:[],
             trCourses:0, trMeilleur:0, trObstacles:0, trCadeaux:0,
             orthoJours:0, orthoParfaits:0, orthoSerie:0, orthoBestSerie:0, orthoBonnes:0, orthoDernier:"",
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
    {id:"q1",    e:"🗺️", n:"Premier pas",        d:"Terminer le 1ᵉʳ acte de la Quête",      c:"Quête", t:function(b){return b.qActes>=1;}, p:[function(b){return b.qActes;},1]},
    {id:"q3",    e:"🧭", n:"Longue route",        d:"Terminer 3 actes de la Quête",          c:"Quête", t:function(b){return b.qActes>=3;}, p:[function(b){return b.qActes;},3]},
    {id:"qfin",  e:"📕", n:"Le Lexique",          d:"Terminer l'aventure entière",           c:"Quête", t:function(b){return b.qFins>=1;}, p:[function(b){return b.qFins;},1]},
    {id:"qpur",  e:"🕊️", n:"Sans une chute",      d:"Terminer l'aventure sans mourir",       c:"Quête", t:function(b){return b.qSansMort>=1;}, p:[function(b){return b.qSansMort;},1]},
    {id:"qsec1", e:"🔎", n:"Curieux",             d:"Percer 1 secret de créature",           c:"Quête", t:function(b){return b.qSecrets>=1;}, p:[function(b){return b.qSecrets;},1]},
    {id:"qsec8", e:"🕵️", n:"Fin limier",          d:"Percer 8 secrets de créatures",         c:"Quête", t:function(b){return b.qSecrets>=8;}, p:[function(b){return b.qSecrets;},8]},
    {id:"qbest", e:"📖", n:"Bestiaire nourri",    d:"Rencontrer 20 créatures différentes",   c:"Quête", t:function(b){return b.qMonstres>=20;}, p:[function(b){return b.qMonstres;},20]},
    {id:"qlvl",  e:"⚔️", n:"Apprenti confirmé",   d:"Atteindre le niveau 10 en Quête",       c:"Quête", t:function(b){return b.qNiveau>=10;}, p:[function(b){return b.qNiveau;},10]},
    // Saison : badges d'événement, obtenables seulement pendant l'événement
    // mais conservés pour toujours ensuite.
    // — Compagnon (boutique du chat) —
    {id:"chat1", e:"🐈‍⬛", n:"Ami des chats",      d:"Adopter un chat noir dans la boutique", c:"Compagnon", t:function(b,s){return !!(s.boutique && s.boutique.objets && ("chat" in s.boutique.objets));}},
    {id:"chat5", e:"🎩", n:"Chat coquet",         d:"Offrir 5 objets à ton chat",            c:"Compagnon", t:function(b,s){return objetsChat(s)>=5;}, p:[function(b,s){return objetsChat(s);},5]},
    {id:"chatAmi", e:"💞", n:"Inséparables",      d:"Atteindre la complicité maximale avec ton chat", c:"Compagnon",
      t:function(b,s){return complicMax(s) >= 100;}, p:[function(b,s){return complicMax(s);}, 100]},
    {id:"chatTout",e:"👑",n:"Chat royal",         d:"Offrir à ton chat tous les objets de la boutique", c:"Compagnon",
      t:function(b,s){ var C = window.Boutique && Boutique.catalogue; return !!C && C.every(function(x){ return x.cadeau || (s.boutique && s.boutique.objets && (x.id in s.boutique.objets)); }); },
      p:[function(b,s){return objetsChat(s);}, 22]},
    {id:"av1",   e:"🗓️", n:"Première case",       d:"Ouvrir une case du calendrier de l'avent", c:"Saison", t:function(b,s){return casesAvent(s)>=1;}, p:[function(b,s){return casesAvent(s);},1]},
    {id:"av12",  e:"🎄", n:"À mi-chemin",         d:"Ouvrir 12 cases du calendrier de l'avent", c:"Saison", t:function(b,s){return casesAvent(s)>=12;}, p:[function(b,s){return casesAvent(s);},12]},
    {id:"av24",  e:"🎁", n:"Calendrier complet",  d:"Ouvrir les 24 cases du calendrier de l'avent", c:"Saison", t:function(b,s){return casesAvent(s)>=24;}, p:[function(b,s){return casesAvent(s);},24]},
    {id:"avmot5",  e:"🧝", n:"Lutin malin",        d:"Trouver 5 mots du calendrier de l'avent", c:"Saison", t:function(b,s){return motsAvent(s)>=5;}, p:[function(b,s){return motsAvent(s);},5]},
    {id:"avmot20", e:"❄️", n:"Maître des neiges",  d:"Trouver 20 mots du calendrier de l'avent", c:"Saison", t:function(b,s){return motsAvent(s)>=20;}, p:[function(b,s){return motsAvent(s);},20]},
    {id:"avfidele",e:"⏰", n:"Fidèle au poste",     d:"Ouvrir les 24 cases du calendrier, chacune le jour même", c:"Saison", h:1, t:function(b,s){return aventSansRattrapage(s);}},
    {id:"avpate",  e:"🍖", n:"Repas de fête",       d:"Offrir une pâtée de fête à ton chat", c:"Saison", t:function(b,s){return !!(s.boutique && s.boutique.pates && Object.keys(s.boutique.pates).length);}},
    {id:"avtenue", e:"🎅", n:"Tenue de fête",       d:"Habiller un chat de 3 accessoires de Noël à la fois", c:"Saison", t:function(b,s){return tenueNoel(s)>=3;}, p:[function(b,s){return tenueNoel(s);},3]},
    {id:"tr1",     e:"🛷", n:"Premier attelage",   d:"Faire une course de Traîneau (course du jour ou tentative bonus)", c:"Saison", t:function(b){return (b.trCourses||0)>=1;}},
    {id:"tr1000",  e:"🦌", n:"Grand galop",        d:"Marquer 1 000 points en une course de Traîneau", c:"Saison", t:function(b){return (b.trMeilleur||0)>=1000;}, p:[function(b){return b.trMeilleur||0;},1000]},
    {id:"tr3000",  e:"🌠", n:"Flèche des neiges",  d:"Marquer 3 000 points en une course de Traîneau", c:"Saison", t:function(b){return (b.trMeilleur||0)>=3000;}, p:[function(b){return b.trMeilleur||0;},3000]},
    {id:"tr100",   e:"🪓", n:"Bûcheron des neiges",d:"Faire exploser 100 obstacles en Traîneau", c:"Saison", t:function(b){return (b.trObstacles||0)>=100;}, p:[function(b){return b.trObstacles||0;},100]},
    {id:"tr50",    e:"📮", n:"Postier du Père Noël", d:"Ramasser 50 cadeaux en Traîneau", c:"Saison", t:function(b){return (b.trCadeaux||0)>=50;}, p:[function(b){return b.trCadeaux||0;},50]},
    {id:"embNoel", e:"🎄", n:"Esprit de Noël",    d:"Ouvrir la case du 20 décembre du calendrier de l'avent", c:"Saison", t:function(b,s){return !!(s.boutique && s.boutique.objets && ("embleme:noel" in s.boutique.objets));}},
    {id:"aube",  e:"🤍", n:"Une aube blanche",    d:"Accueillir Aube, la chatte blanche", c:"Saison", t:function(b,s){return !!(s.boutique && s.boutique.objets && ("aube" in s.boutique.objets));}},
    {id:"hw1",   e:"🎃", n:"Premier frisson",     d:"Jouer un Mot terrifiant (Halloween)",   c:"Saison", t:function(b){return b.hwPeur>=1;}, p:[function(b){return b.hwPeur;},1]},
    {id:"hw5",   e:"👻", n:"Chasseur de fantômes", d:"Trouver 5 Mots terrifiants",           c:"Saison", t:function(b){return b.hwPeurWin>=5;}, p:[function(b){return b.hwPeurWin;},5]},
    {id:"hw15",  e:"🧛", n:"Seigneur de la nuit", d:"Trouver 15 Mots terrifiants",           c:"Saison", t:function(b){return b.hwPeurWin>=15;}, p:[function(b){return b.hwPeurWin;},15]},
    {id:"hwj10", e:"🦇", n:"Nuits blanches",      d:"Jouer 10 jours pendant Halloween",      c:"Saison", t:function(b){return (b.hwJours||[]).length>=10;}, p:[function(b){return (b.hwJours||[]).length;},10]},
    {id:"hwb50", e:"🍬", n:"Gourmand",            d:"Attraper 50 bonbons au total",          c:"Saison", t:function(b){return b.hwBonbonsTotal>=50;}, p:[function(b){return b.hwBonbonsTotal;},50]},
    {id:"hwb25", e:"🍭", n:"Sac plein",           d:"Attraper 25 bonbons en une partie",     c:"Saison", t:function(b){return b.hwBonbonsBest>=25;}, p:[function(b){return b.hwBonbonsBest;},25]},
    {id:"hwb300",e:"🍫", n:"Insatiable",          d:"Attraper 300 bonbons au total",         c:"Saison", t:function(b){return b.hwBonbonsTotal>=300;}, p:[function(b){return b.hwBonbonsTotal;},300]},
    {id:"or1",   e:"🔤", n:"Premier mot",        d:"Faire 1 Orthographe du jour",          c:"Orthographe", t:function(b){return b.orthoJours>=1;}, p:[function(b){return b.orthoJours;},1]},
    {id:"or10",  e:"📖", n:"Bon orthographe",     d:"Faire 10 Orthographes du jour",        c:"Orthographe", t:function(b){return b.orthoJours>=10;}, p:[function(b){return b.orthoJours;},10]},
    {id:"orp",   e:"💎", n:"Zéro faute",          d:"Un sans-faute en Orthographe",         c:"Orthographe", t:function(b){return b.orthoParfaits>=1;}, p:[function(b){return b.orthoParfaits;},1]},
    {id:"orp10", e:"🏅", n:"Orthographe sûre",    d:"10 sans-faute en Orthographe",         c:"Orthographe", t:function(b){return b.orthoParfaits>=10;}, p:[function(b){return b.orthoParfaits;},10]},
    {id:"orser", e:"📅", n:"Chaque jour",         d:"7 jours de suite en Orthographe",      c:"Orthographe", t:function(b){return b.orthoBestSerie>=7;}, p:[function(b){return b.orthoBestSerie;},7]},
    {id:"or50",  e:"🗂️", n:"Cinquante mots",      d:"50 mots correctement écrits",          c:"Orthographe", t:function(b){return b.orthoBonnes>=50;}, p:[function(b){return b.orthoBonnes;},50]},
    {id:"gr1",   e:"✍️", n:"Première dictée",     d:"Faire 1 Grammaire du jour",            c:"Grammaire", t:function(b){return b.gramJours>=1;}, p:[function(b){return b.gramJours;},1]},
    {id:"gr10",  e:"📝", n:"Plume assidue",        d:"Faire 10 Grammaires du jour",          c:"Grammaire", t:function(b){return b.gramJours>=10;}, p:[function(b){return b.gramJours;},10]},
    {id:"grp",   e:"💯", n:"Sans une faute",       d:"Un sans-faute en Grammaire du jour",   c:"Grammaire", t:function(b){return b.gramParfaits>=1;}, p:[function(b){return b.gramParfaits;},1]},
    {id:"grp10", e:"🎓", n:"Grammairien",          d:"10 sans-faute en Grammaire",           c:"Grammaire", t:function(b){return b.gramParfaits>=10;}, p:[function(b){return b.gramParfaits;},10]},
    {id:"grser", e:"🔥", n:"Régularité",           d:"7 jours de suite en Grammaire",        c:"Grammaire", t:function(b){return b.gramBestSerie>=7;}, p:[function(b){return b.gramBestSerie;},7]},
    {id:"gr50",  e:"📚", n:"Cinquante bonnes",     d:"50 bonnes réponses au total",          c:"Grammaire", t:function(b){return b.gramBonnes>=50;}, p:[function(b){return b.gramBonnes;},50]},
    // Battle Royale : comptées partie par partie (code de salle → rang), pour
    // qu'une même partie ne compte jamais deux fois (voir royC)
    {id:"br1",   e:"👑", n:"Entrée dans l'arène", d:"Jouer 1 Battle Royale",              c:"Battle Royale", t:function(b){return royC(b).j>=1;}, p:[function(b){return royC(b).j;},1]},
    {id:"br10",  e:"⚔️", n:"Habitué de l'arène",  d:"Jouer 10 Battle Royale",             c:"Battle Royale", t:function(b){return royC(b).j>=10;}, p:[function(b){return royC(b).j;},10]},
    {id:"brwin", e:"🏆", n:"Dernier debout",      d:"Gagner une Battle Royale",            c:"Battle Royale", t:function(b){return royC(b).v>=1;}, p:[function(b){return royC(b).v;},1]},
    {id:"brw5",  e:"👑", n:"Souverain",           d:"Gagner 5 Battle Royale",              c:"Battle Royale", t:function(b){return royC(b).v>=5;}, p:[function(b){return royC(b).v;},5]},
    {id:"brpod", e:"🥉", n:"Régulier du podium",  d:"Finir 10 fois dans les 3 premiers",   c:"Battle Royale", t:function(b){return royC(b).p>=10;}, p:[function(b){return royC(b).p;},10]},
    {id:"br300", e:"💯", n:"Score massif",        d:"Dépasser 300 points sur une partie",  c:"Battle Royale", t:function(b){return b.royMeilleurTotal>=300;}, p:[function(b){return b.royMeilleurTotal;},300]},
    {id:"me1",   e:"🧠", n:"Première mémoire",   d:"Réussir 1 grille de Mémorisation",       c:"Mémorisation", t:function(b){return b.memoReussites>=1;}, p:[function(b){return b.memoReussites;},1]},
    {id:"me10",  e:"💡", n:"Bonne mémoire",       d:"Réussir 10 grilles de Mémorisation",     c:"Mémorisation", t:function(b){return b.memoReussites>=10;}, p:[function(b){return b.memoReussites;},10]},
    {id:"me20",  e:"📸", n:"Mémoire photographique", d:"Descendre à 20 s d'affichage",       c:"Mémorisation", t:function(b){return b.memoBest<=20;}, p:[function(b){return Math.max(0,60-b.memoBest);},40]},
    {id:"me10s", e:"⚡", n:"Coup d'œil",          d:"Descendre à 10 s d'affichage",           c:"Mémorisation", t:function(b){return b.memoBest<=10;}, p:[function(b){return Math.max(0,60-b.memoBest);},50]},
    {id:"me2s",  e:"👁️", n:"Œil absolu",          d:"Descendre à 2 s — le minimum",           c:"Mémorisation", t:function(b){return b.memoBest<=2;}, p:[function(b){return Math.max(0,60-b.memoBest);},58]},
    {id:"mese",  e:"🔗", n:"Sans faillir",        d:"5 grilles réussies d'affilée",           c:"Mémorisation", t:function(b){return b.memoBestSerie>=5;}, p:[function(b){return b.memoBestSerie;},5]},
    {id:"jr1",   e:"🧸", n:"Premières lettres",   d:"Jouer 1 partie en mode Junior",         c:"Junior", t:function(b){return b.jrTotal>=1;}, p:[function(b){return b.jrTotal;},1]},
    {id:"jr25",  e:"🌟", n:"Petit habitué",        d:"Jouer 25 parties en mode Junior",       c:"Junior", t:function(b){return b.jrTotal>=25;}, p:[function(b){return b.jrTotal;},25]},
    {id:"jr100", e:"🏅", n:"Champion junior",       d:"Jouer 100 parties en mode Junior",      c:"Junior", t:function(b){return b.jrTotal>=100;}, p:[function(b){return b.jrTotal;},100]},
    {id:"jrall", e:"🎨", n:"Touche-à-tout",        d:"Essayer les 4 jeux du mode Junior",     c:"Junior", t:function(b){return b.jrTousJeux>=4;}, p:[function(b){return b.jrTousJeux;},4]},
    {id:"jrduo", e:"👯", n:"À deux, c'est mieux",  d:"Jouer 10 parties à deux en Junior",     c:"Junior", t:function(b){return b.jrDuo>=10;}, p:[function(b){return b.jrDuo;},10]},
    {id:"jrser", e:"🤝", n:"Complices",            d:"5 parties à deux d'affilée en Junior",  c:"Junior", t:function(b){return b.jrSerieDuo>=5;}, p:[function(b){return b.jrSerieDuo;},5]},
    {id:"jrjour",e:"📅", n:"Habitude prise",       d:"Jouer en Junior sur 7 jours différents",c:"Junior", t:function(b){return b.jrJours>=7;}, p:[function(b){return b.jrJours;},7]},
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

  /* Battle Royale : b.royCodes = { CODE: rang } ; parties, victoires,
     podiums en découlent. royJouees en garde une copie pour les statistiques. */
  function royC(b) {
    var c = (b && b.royCodes) || {}, r = { j: 0, v: 0, p: 0 };
    Object.keys(c).forEach(function (k) { var g = +c[k] || 0; if (g < 1) return; r.j++; if (g === 1) r.v++; if (g <= 3) r.p++; });
    return r;
  }
  function royFusion(b, autres) {
    if (!b.royCodes || typeof b.royCodes !== "object") b.royCodes = {};
    Object.keys(autres || {}).forEach(function (k) {
      var g = +autres[k] || 0;
      if (g >= 1 && !b.royCodes[k]) b.royCodes[k] = g;
    });
    b.royJouees = royC(b).j;
  }
  /* Relit une fois par session les parties terminées côté serveur : rattrape
     celles jouées avant la 2.7.2 (ou sur un appareil hors ligne), et autorise
     le retrait des badges gonflés. */
  var royBilanLu = false;
  function royBilanSync(essai) {
    if (royBilanLu) return;
    if (!window.Royale || !Royale.bilan || !Royale.configured || !Royale.configured()) {
      if ((essai || 0) < 5) setTimeout(function () { royBilanSync((essai || 0) + 1); }, 3000);
      return;
    }
    royBilanLu = true;
    Royale.bilan().then(function (rows) {
      if (!Array.isArray(rows)) { royBilanLu = false; return; }
      var f = {};
      rows.forEach(function (r) { if (r && r.code) f[String(r.code).toUpperCase()] = +r.rang || 0;
                                  if ((+r.total || 0) > (state.b.royMeilleurTotal || 0)) state.b.royMeilleurTotal = +r.total; });
      royFusion(state.b, f);
      state.b.royBilan = 1;
      checkBadges(true); saveLocal(); pushDebounced(); refreshOpen();
    });
  }

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
  // Duel : les adversaires sont désormais désignés par leur masque, plus par
  // leur code. Les anciennes entrées (codes) sont converties une fois.
  if (!state.b.duelLostToMasque) {
    state.b.duelLostTo = (state.b.duelLostTo || []).map(masqueDe);
    state.b.duelLostToMasque = 1;
  }
  state.level = levelFromXp(state.xp);
  function saveLocal() { store.set("motus.profile", state); }

  /* Boutique du chat : objets en union (chacun une fois, au prix payé),
     tenue, nom et affichage au choix le plus récent. Même règle que
     boutique/boutique.js — un achat n'est jamais perdu ni compté deux fois. */
  function fusionBoutique(a, b) {
    // la boutique chargée connaît toutes les règles (croquettes, bonus…) : elle fait foi
    if (window.Boutique && Boutique.fusion) { try { return Boutique.fusion(a, b); } catch (e) {} }
    a = a || {}; b = b || {};
    var r = { objets: {}, porte: a.porte || {}, porteAt: a.porteAt || 0, nom: a.nom || "Minuit", nomAt: a.nomAt || 0,
              visible: a.visible !== false, visibleAt: a.visibleAt || 0 };
    [a.objets || {}, b.objets || {}].forEach(function (o) {
      Object.keys(o).forEach(function (k) { var p = +o[k]; if (!(k in r.objets) && p >= 0 && isFinite(p)) r.objets[k] = p; });
    });
    if ((b.porteAt || 0) > r.porteAt) { r.porte = b.porte || {}; r.porteAt = b.porteAt; }
    if ((b.nomAt || 0) > r.nomAt && b.nom) { r.nom = b.nom; r.nomAt = b.nomAt; }
    if ((b.visibleAt || 0) > r.visibleAt) { r.visible = b.visible !== false; r.visibleAt = b.visibleAt; }
    // complicité avec le chat : un cumul, qui ne fait que grandir
    r.complicite = Math.max(+a.complicite || 0, +b.complicite || 0);
    // Aube (calendrier de l'avent) : sa tenue, son nom, son affichage — au plus récent
    var xa = a.aube || {}, ya = b.aube || {};
    r.aube = { porte: xa.porte || {}, porteAt: xa.porteAt || 0, nom: xa.nom || "Aube", nomAt: xa.nomAt || 0,
               visible: xa.visible !== false, visibleAt: xa.visibleAt || 0 };
    if ((ya.porteAt || 0) > r.aube.porteAt) { r.aube.porte = ya.porte || {}; r.aube.porteAt = ya.porteAt; }
    if ((ya.nomAt || 0) > r.aube.nomAt && ya.nom) { r.aube.nom = ya.nom; r.aube.nomAt = ya.nomAt; }
    if ((ya.visibleAt || 0) > r.aube.visibleAt) { r.aube.visible = ya.visible !== false; r.aube.visibleAt = ya.visibleAt; }
    r.aube.complicite = Math.max(+xa.complicite || 0, +ya.complicite || 0);
    // croquettes (v2.9) : gains au maximum par clé, repas / bonus / pâtées en union
    var ca = a.croq || {}, cb = b.croq || {};
    r.croq = { gains: {}, repas: {} };
    [ca.gains || {}, cb.gains || {}].forEach(function (g) { Object.keys(g).forEach(function (k) { r.croq.gains[k] = Math.max(r.croq.gains[k] || 0, +g[k] || 0); }); });
    [ca.repas || {}, cb.repas || {}].forEach(function (g) { Object.keys(g).forEach(function (k) { if (!(k in r.croq.repas)) r.croq.repas[k] = g[k]; }); });
    ["bonus", "pates"].forEach(function (f) {
      r[f] = {};
      [a[f] || {}, b[f] || {}].forEach(function (g) { Object.keys(g).forEach(function (k) { if (!(k in r[f])) r[f][k] = g[k]; }); });
    });
    return r;
  }
  // objets ACHETÉS pour le chat (ni l'adoption, ni la médaille qu'il offre lui-même)
  /* Même règle que le jeu : gains réunis (chacun une fois), dépenses
     additionnées appareil par appareil, bases figées au maximum. */
  function fusionJetons(a, b) {
    a = a || {}; b = b || {};
    var r = { base: Math.max(+a.base || 0, +b.base || 0), spentBase: Math.max(+a.spentBase || 0, +b.spentBase || 0), set: {}, dev: {} };
    [a.set || {}, b.set || {}].forEach(function (s) { Object.keys(s).forEach(function (k) { r.set[k] = 1; }); });
    [a.dev || {}, b.dev || {}].forEach(function (d) { Object.keys(d).forEach(function (k) { r.dev[k] = Math.max(r.dev[k] || 0, +d[k] || 0); }); });
    return r;
  }
  /* Toute l'XP passe par ici : on annonce le passage de niveau (le son
     « niveau » existait, mais rien ne le jouait). */
  /* Plafonds du jour : 500 XP par mode, et 50 XP en tout pour les défaites
     (10 abandons) — enchaîner le même mode ou abandonner en boucle finit par
     ne plus rien rapporter. Le registre voyage avec le profil : deux
     appareils partagent les mêmes plafonds. */
  var XP_MODE_MAX = 500, XP_PERTES_MAX = 50;
  var NOMS_MODES = { normal: "Normal", court: "Court", long: "Long", expert: "Expert", daily: "Mot du jour",
    defi: "Défi du jour", peur: "Mot terrifiant", prenoms: "Prénoms", villes: "Villes", persos: "Personnages",
    maladies: "Maladies", duel: "Duel", race: "Course", defense: "Défense", royale: "Battle Royale",
    pendu: "Pendu", memo: "Mémorisation", gram: "Grammaire", ortho: "Orthographe", bonbons: "Bonbons",
    entrainement: "Entraînement" };
  function xpJour() {
    var j = state.xpJour, jour = todayStr();
    if (!j || j.day !== jour) j = state.xpJour = { day: jour, modes: {}, pertes: 0, avis: {} };
    if (!j.modes) j.modes = {}; if (!j.avis) j.avis = {}; j.pertes = +j.pertes || 0;
    return j;
  }
  function fusionXpJour(a, b) {
    if (!b || !b.day) return a;
    if (!a || !a.day || b.day > a.day) return { day: b.day, modes: Object.assign({}, b.modes || {}), pertes: +b.pertes || 0, avis: Object.assign({}, b.avis || {}) };
    if (b.day < a.day) return a;
    Object.keys(b.modes || {}).forEach(function (k) { a.modes[k] = Math.max(+a.modes[k] || 0, +b.modes[k] || 0); });
    a.pertes = Math.max(+a.pertes || 0, +b.pertes || 0);
    Object.keys(b.avis || {}).forEach(function (k) { a.avis[k] = 1; });
    return a;
  }
  function plafonner(n, mode, perte) {
    var j = xpJour(), cle = mode || "normal", deja = +j.modes[cle] || 0;
    var g = Math.min(n, Math.max(0, XP_MODE_MAX - deja)), motif = g < n ? "mode:" + cle : "";
    if (perte) {
      var g2 = Math.min(g, Math.max(0, XP_PERTES_MAX - j.pertes));
      if (g2 < g) motif = "pertes";
      g = g2; j.pertes += g;
    }
    j.modes[cle] = deja + g;
    if (motif && !j.avis[motif]) {
      j.avis[motif] = 1;
      bulle('<span class="be">🔒</span><div><b>' + (motif === "pertes"
          ? "Plus d'XP pour les défaites aujourd'hui</b><small>" + XP_PERTES_MAX + " XP au plus par jour. Les victoires rapportent toujours.</small>"
          : "Plafond d'XP atteint en " + echapper(NOMS_MODES[cle] || cle) + "</b><small>" + XP_MODE_MAX + " XP par mode et par jour : essaie un autre mode !</small>")
        + "</div>", 3600);
    }
    return g;
  }
  function gagnerXp(n, mode, perte) {
    n = Math.max(0, Math.round(n || 0));
    if (n > 0) n = plafonner(n, mode, perte);
    var avant = levelFromXp(state.xp || 0);
    state.xp = (state.xp || 0) + n;
    state.level = levelFromXp(state.xp);
    if (state.level > avant) {
      var info = levelInfo(state.xp);
      bulle('<span class="be">⬆️</span><div><b>Niveau ' + state.level + ' atteint !</b><small>' + echapper(info.title) + '</small></div>',
        3200, function () { try { if (window.motusSon) window.motusSon("niveau"); } catch (e) {} });
    }
  }
  // les rattrapages du calendrier (« avent-07 ») sont payés mais ne sont pas des objets
  function objetsChat(s) { var o = (s && s.boutique && s.boutique.objets) || {}; return Object.keys(o).filter(function (k) { return k !== "chat" && k.indexOf("avent") !== 0 && +o[k] > 0; }).length; }
  // la complicité la plus haute parmi les chats (chacun a la sienne depuis la v2.9)
  function complicMax(s) { var bq = (s && s.boutique) || {}; return Math.max(+bq.complicite || 0, +((bq.aube || {}).complicite) || 0); }
  // calendrier de l'avent : mots trouvés, et cases toutes ouvertes le jour même (aucun rattrapage)
  function motsAvent(s) { var o = (s && s.boutique && s.boutique.objets) || {}; return Object.keys(o).filter(function (k) { return /^avent-\d\d-ok$/.test(k); }).length; }
  function aventSansRattrapage(s) { var o = (s && s.boutique && s.boutique.objets) || {}; return casesAvent(s) >= 24 && !Object.keys(o).some(function (k) { return /^avent-\d\d$/.test(k); }); }
  // le plus d'accessoires de Noël portés en même temps par un même chat
  var NOEL_ACC = ["bonnet", "lutin", "rennes", "sucreOrge", "nez", "echarpeNoel", "clochette", "manteau"];
  function tenueNoel(s) {
    var bq = (s && s.boutique) || {}, max = 0;
    [bq.porte || {}, (bq.aube || {}).porte || {}].forEach(function (p) {
      var n = Object.keys(p).filter(function (slot) { return NOEL_ACC.indexOf(p[slot]) >= 0; }).length;
      if (n > max) max = n;
    });
    return max;
  }
  // cases du calendrier de l'avent ouvertes (jouées)
  function casesAvent(s) { var o = (s && s.boutique && s.boutique.objets) || {}; return Object.keys(o).filter(function (k) { return /^avent-\d\d-j$/.test(k); }).length; }
  // moment de la dernière partie jouée sur CET appareil : départage les séries à la fusion
  function joue() { state.b.jeuAt = Date.now(); }

  /* Séries EN COURS : contrairement aux totaux, elles redescendent (une défaite
     les remet à zéro). Les fusionner en gardant le maximum ressuscitait une
     série perdue dès la synchronisation suivante. On garde donc la valeur de
     l'appareil qui a joué en dernier. Les records (best…) restent au maximum. */
  var EN_COURS = ["streak", "xStreak", "cleanStreak", "memoSerie", "gramSerie", "orthoSerie",
                  "duelWinStreak", "raceStreak", "defAtkStreak", "defRepelStreak", "penduStreak",
                  "gramDernier", "orthoDernier"];

  function emblemEmoji() { var b = BADGE_BY_ID[state.emblem]; return b ? b.e : ""; }

  /* ---------- Déblocage des badges ---------- */
  /* Battle Royale : jusqu'à la 2.7.2, l'écran de fin comptait une partie à
     chaque rafraîchissement (toutes les 2,5 s), d'où des badges « 10 parties »
     après une seule. Les compteurs ont été refaits à partir des parties
     réellement terminées (royCodes, recopiées du serveur) ; ces badges-là sont
     retirés s'ils ne sont pas mérités — seulement une fois le bilan serveur
     relu, pour ne jamais retirer un badge gagné honnêtement. */
  var BADGES_ROY_RECOMPTES = ["br10", "brwin", "brw5", "brpod"];
  function retirerBadgesRoyFaux() {
    if (!state.b.royBilan) return false;
    var retire = false;
    BADGES_ROY_RECOMPTES.forEach(function (id) {
      var i = state.badges.indexOf(id), bd = BADGE_BY_ID[id];
      if (i < 0 || !bd) return;
      var ok = false; try { ok = !!bd.t(state.b, state); } catch (e) {}
      if (ok) return;
      state.badges.splice(i, 1); retire = true;
      if (state.emblem === id) { state.emblem = ""; state.emblemAt = Date.now(); }
    });
    return retire;
  }
  function checkBadges(silent) {
    var gained = [];
    if (retirerBadgesRoyFaux()) { saveLocal(); pushDebounced(); }
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
  /* Fonctions de la base. Depuis la 2.7.2, le profil et les résultats du jour
     ne sont plus lus ni écrits directement dans les tables : le code du compte
     (state.id) ne doit jamais pouvoir être lu par quelqu'un d'autre. */
  function rpcP(nom, params) {
    return fetch(API + "/rest/v1/rpc/" + nom, {
      method: "POST", headers: headers(), body: JSON.stringify(params || {}), cache: "no-store"
    }).then(function (r) {
      return r.text().then(function (t) {
        var d = null; try { d = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) {
          var e = new Error((d && (d.message || d.hint)) || ("http-" + r.status));
          // fonction inconnue de la base : schema.sql v2.12 pas encore exécuté
          e.absente = r.status === 404 || (d && d.code === "PGRST202");
          if (e.absente) baseAncienne(nom);
          throw e;
        }
        return d;
      });
    });
  }
  /* Le code de ce compte a été remplacé (sur un autre appareil) : on arrête
     d'écrire avec l'ancien, et on dit au joueur quoi faire. */
  var codeRetire = false;
  function signalerCodeRetire() {
    if (codeRetire) return;
    codeRetire = true;
    bulle('<div><b>Ton code de compte a changé</b><small>Il a été renouvelé sur un autre appareil. '
      + 'Profil → Mon compte : colle le nouveau code pour retrouver ta progression.</small></div>', 9000);
  }
  function estRetire(e) { return /code-change/.test(String(e && e.message || e)); }
  function maPub() { return masqueDe(state.id); }
  /* Base pas encore mise à jour (schema.sql v2.12 non exécuté) : on retombe
     sur les anciennes requêtes, pour que rien ne se perde en attendant. */
  var baseAJour = true;
  function baseAncienne(nom) {
    if (!baseAJour) return;
    baseAJour = false;
    try { console.warn("Mot en Six : la base n'a pas la fonction " + nom + " — exécuter duel/schema.sql (v2.11 et v2.12)."); } catch (e) {}
  }
  function absente(e) { return !!(e && e.absente); }
  function pushAncien(corps) {
    return fetch(API + "/rest/v1/profiles", {
      method: "POST", headers: headers({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(corps)
    }).catch(function () {});
  }
  function getAncien(chemin) {
    return fetch(API + "/rest/v1/" + chemin, { headers: headers(), cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  function pushRemote() {
    if (!configured || codeRetire) return;
    state.updated_at = new Date().toISOString();
    var donnees = {
      p_id: state.id, p_pseudo: state.pseudo || "", p_xp: state.xp || 0, p_games: state.games || 0,
      p_wins: state.wins || 0, p_level: state.level || 1, p_badge: emblemEmoji(),
      p_updated_at: state.updated_at,
      p_data: { b: state.b, badges: state.badges, emblem: state.emblem,
                                     emblemAt: state.emblemAt || 0,
                                     hintEarned: state.hintEarned || 0,
                                     hintSpent: state.hintSpent || 0,
                                     hintGrants: state.hintGrants || {},
                                     pronom: state.pronom || "il",
                                     pronomAt: state.pronomAt || 0,
                                     boutique: state.boutique || null,
                                     jetons: state.jetons || null,
                                     xpJour: state.xpJour || null }
    };
    rpcP("profil_ecrire", donnees).catch(function (e) {
      if (estRetire(e)) return signalerCodeRetire();
      if (absente(e)) pushAncien({ id: donnees.p_id, pseudo: donnees.p_pseudo, xp: donnees.p_xp, games: donnees.p_games,
                                   wins: donnees.p_wins, level: donnees.p_level, badge: donnees.p_badge,
                                   data: donnees.p_data, updated_at: donnees.p_updated_at });
    });
  }
  var pushTimer;
  /* File des résultats du jour non transmis (mot du jour, défi, grammaire,
     orthographe joués hors ligne). Un seul résultat par jeu et par jour. */
  var CLE_FILE = "motus.dailyQueue";
  function lireFile() { try { return JSON.parse(localStorage.getItem(CLE_FILE) || "[]"); } catch (e) { return []; } }
  function ecrireFile(f) { try { localStorage.setItem(CLE_FILE, JSON.stringify(f.slice(-30))); } catch (e) {} }
  function mettreEnAttente(o) {
    var f = lireFile().filter(function (x) { return !(x.game === o.game && x.day === o.day); });
    f.push({ game: o.game, day: o.day, tries: o.tries, won: !!o.won });
    ecrireFile(f);
  }
  function envoyerJour(o) {
    // submitDailyBrut renvoie déjà vrai ou faux
    return window.Profile.submitDailyBrut(o).then(function (ok) { return ok === true; });
  }

  function majPronom() {
    var p = state.pronom === "elle" ? "elle" : "il";
    Array.prototype.forEach.call(document.querySelectorAll(".pronom-choix button"),
      function (b) { b.classList.toggle("on", b.dataset.pr === p); });
  }
  var pronoms = {}, pronomsEnCours = {};
  /* Pronom d'un autre joueur, lu sur son profil.
     Le premier appel ne le connaît pas encore (il faut le demander au
     serveur) : il répond « il » par défaut, puis signale l'arrivée de la
     vraie valeur par l'événement « motus-pronom », pour que le jeu réécrive
     ses textes. La valeur est relue toutes les 2 minutes : un joueur peut
     la changer en cours de partie. */
  var PRONOM_FRAIS = 120000;
  function pronomCharger(id) {
    if (!id || id === state.id || id === maPub() || !configured || navigator.onLine === false) return Promise.resolve(pronomDe(id));
    if (pronomsEnCours[id]) return pronomsEnCours[id];
    var avant = pronoms[id] && pronoms[id].p;
    // id est le MASQUE de l'adversaire (la base ne donne plus son code)
    pronomsEnCours[id] = rpcP("profil_pronom", { p_pub: id }).catch(function (e) {
      if (!absente(e)) return null;
      return getAncien("profiles?select=data&id=eq." + encodeURIComponent(id))
        .then(function (a) { return (a && a[0] && a[0].data && a[0].data.pronom === "elle") ? "elle" : (a && a[0] ? "il" : null); });
    }).then(function (r) {
      delete pronomsEnCours[id];
      if (r !== "il" && r !== "elle") return avant || "il";          // un échec n'est pas retenu : on retentera
      var p = r;
      pronoms[id] = { p: p, t: Date.now() };
      if (p !== (avant || "il")) {
        try { window.dispatchEvent(new CustomEvent("motus-pronom", { detail: { id: id, pronom: p } })); } catch (e) {}
      }
      return p;
    });
    return pronomsEnCours[id];
  }
  function pronomDe(id) {
    if (!id) return "il";
    if (id === state.id || id === maPub()) return state.pronom === "elle" ? "elle" : "il";
    var c = pronoms[id];
    if (!c || Date.now() - c.t > PRONOM_FRAIS) pronomCharger(id);
    return c ? c.p : "il";       // par défaut, en attendant la réponse
  }

  function pushDebounced() { clearTimeout(pushTimer); pushTimer = setTimeout(pushRemote, 300); }
  /* Son propre profil (ou celui d'un code qu'on veut récupérer). Rend
     « retire » si ce code a été remplacé par un nouveau. */
  function fetchRemote(id) {
    if (!configured) return Promise.resolve(null);
    return rpcP("profil_lire", { p_id: id })
      .then(function (a) { return (Array.isArray(a) ? a[0] : a) || null; })
      .catch(function (e) {
        if (estRetire(e)) return "retire";
        if (absente(e)) return getAncien("profiles?select=*&id=eq." + encodeURIComponent(id)).then(function (a) { return (a && a[0]) || null; });
        return null;
      });
  }
  /* Lignes d'un classement ; sur une base pas à jour (pas de colonne pub),
     l'ancienne requête par identifiant. */
  function classementBrut(chemin) {
    return fetch(API + "/rest/v1/" + chemin, { headers: headers(), cache: "no-store" })
      .then(function (r) {
        if (r.ok) return r.json();
        return getAncien(chemin.replace("select=pub,", "select=id,")).then(function (l) { return l || []; });
      });
  }
  function countQuery(qs) {
    if (!configured) return Promise.resolve(null);
    return fetch(API + "/rest/v1/" + qs, { headers: headers({ "Prefer": "count=exact", "Range": "0-0" }), cache: "no-store" })
      .then(function (r) {
        if (!r.ok && /select=pub/.test(qs)) return countQuery(qs.replace("select=pub", "select=id"));   // base pas à jour
        var cr = r.headers.get("content-range") || "*/0"; return parseInt(cr.split("/")[1], 10) || 0;
      })
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
    var distantPlusRecent = (rb.jeuAt || 0) > (lb.jeuAt || 0);
    Object.keys(lb).forEach(function (k) {
      if (k === "days" || k === "modes") return;
      if (EN_COURS.indexOf(k) >= 0) {
        if (distantPlusRecent && rb[k] !== undefined) lb[k] = rb[k];
        return;
      }
      if (typeof lb[k] === "number") lb[k] = Math.max(lb[k] || 0, rb[k] || 0);
    });
    // jours joués et modes essayés : union
    (rb.days || []).forEach(function (x) { if (lb.days.indexOf(x) < 0) lb.days.push(x); });
    (rb.modes || []).forEach(function (x) { if (lb.modes.indexOf(x) < 0) lb.modes.push(x); });
    if (!lb.duelLostTo) lb.duelLostTo = [];
    (rb.duelLostToMasque ? (rb.duelLostTo || []) : (rb.duelLostTo || []).map(masqueDe))
      .forEach(function (x) { if (lb.duelLostTo.indexOf(x) < 0) lb.duelLostTo.push(x); });
    if (!lb.raceThemes) lb.raceThemes = [];
    (rb.raceThemes || []).forEach(function (x) { if (lb.raceThemes.indexOf(x) < 0) lb.raceThemes.push(x); });
    // Battle Royale : union des parties (une partie = un code de salle)
    royFusion(lb, rb.royCodes);
    if (lb.days.length > 500) lb.days = lb.days.slice(-500);
    lb.dayBest = Math.max(lb.dayBest || 0, dayStreak(lb.days));
    // badges : union
    (d.badges || []).forEach(function (id) { if (state.badges.indexOf(id) < 0) state.badges.push(id); });
    // Emblème : le plus RÉCEMMENT choisi gagne. L'ancienne règle ne le
    // reprenait que si le local était vide, donc un changement fait sur un
    // appareil ne remontait jamais sur l'autre.
    var remAt = d.emblemAt || 0, locAt = state.emblemAt || 0;
    if (d.emblem && remAt > locAt) { state.emblem = d.emblem; state.emblemAt = remAt; }
    // pronom : le choix le plus récent gagne, comme pour l'emblème
    if ((d.pronom === "il" || d.pronom === "elle") && (d.pronomAt || 0) > (state.pronomAt || 0)) {
      state.pronom = d.pronom; state.pronomAt = d.pronomAt;
    }
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
    // registre des jetons (v2.7) : gains réunis, dépenses par appareil
    if (d.jetons) {
      state.jetons = fusionJetons(state.jetons, d.jetons);
      if (window.motusJetonsRefresh) { try { window.motusJetonsRefresh(state.jetons); } catch (e) {} }
    }
    // boutique : un achat fait sur un autre appareil rejoint celui-ci
    if (d.boutique) {
      state.boutique = fusionBoutique(state.boutique, d.boutique);
      if (window.motusBoutiqueRefresh) { try { window.motusBoutiqueRefresh(state.boutique); } catch (e) {} }
    }

    // plafonds d'XP du jour : partagés entre appareils
    if (d.xpJour) state.xpJour = fusionXpJour(state.xpJour, d.xpJour);

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
      if (rem === "retire") { signalerCodeRetire(); syncing = false; if (cb) cb(false); return; }
      mergeRemote(rem);
      pushRemote();
      syncing = false;
      royBilanSync();
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
.pronom-line{ display:flex; align-items:center; justify-content:space-between; gap:10px;
  margin:8px 0 4px; font-size:12.5px; color:var(--ink-dim); font-weight:600; }
.pronom-choix{ display:flex; gap:4px; flex:none; }
.pronom-choix button{ border:none; border-radius:9px; background:var(--cell); color:var(--ink-dim);
  box-shadow:inset 0 0 0 1.5px var(--cell-edge); font-weight:800; font-size:14px; padding:7px 14px; cursor:pointer; }
.pronom-choix button.on{ background:var(--accent); color:#fff; box-shadow:none; }
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
#badgeToast small{ display:block; }
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
      <div class="pronom-line"><span>Les autres joueurs parlent de toi en disant</span>
        <div class="pronom-choix"><button data-pr="il">il</button><button data-pr="elle">elle</button></div>
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
        <p class="compte-note">Ton code a pu circuler (lien partagé, capture d'écran) ? Remplace-le :
          l'ancien ne marchera plus nulle part. Tes autres appareils te demanderont le nouveau.</p>
        <button class="btn ghost" id="compteNouveau" style="width:100%">🔄 Changer mon code</button>
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
        <button class="rk-tab" data-rk="memo">🧠 Mémo</button>
      </div>
      <div class="myrank" id="myRank"></div>
      <button class="btn ghost refresh-btn" id="btnRefreshRank">↻ Actualiser</button>
      <div id="leaderboard" class="lb"></div>
    </div>

    <div class="pane" id="pane-today" style="display:none">
      <div class="rank-tabs" id="todayTabs">
        <button class="rk-tab on" data-td="motus">📅 Mot</button>
        <button class="rk-tab" data-td="defi">🔥 Défi</button>
        <button class="rk-tab" data-td="gram">✍️ Gram.</button>
        <button class="rk-tab" data-td="ortho">🔤 Ortho.</button>
        <button class="rk-tab hw-tab" data-td="peur" style="display:none">🎃 Peur</button>
        <button class="rk-tab hw-tab" data-td="bonbons" style="display:none">🍬 Bonbons</button>
      </div>
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

    Array.prototype.forEach.call(document.querySelectorAll(".pronom-choix button"), function (b) {
      b.addEventListener("click", function () {
        state.pronom = b.dataset.pr === "elle" ? "elle" : "il";
        state.pronomAt = Date.now();
        saveLocal(); pushDebounced(); majPronom();
      });
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
    Array.prototype.forEach.call(document.querySelectorAll("#todayTabs .rk-tab"), function (b) {
      b.addEventListener("click", function () {
        if (todayMode === b.dataset.td) return;
        todayMode = b.dataset.td;
        Array.prototype.forEach.call(document.querySelectorAll("#todayTabs .rk-tab"),
          function (x) { x.classList.toggle("on", x === b); });
        loadToday();
      });
    });
    el("btnRefreshToday").addEventListener("click", function () {
      var b = el("btnRefreshToday"); b.classList.add("spin"); b.textContent = "Actualisation…";
      loadToday(function () { b.classList.remove("spin"); b.textContent = "↻ Actualiser"; });
    });
    var boutonSave = el("compteSave");
    if (boutonSave) boutonSave.addEventListener("click", function () {
      // depuis l'ancienne adresse GitHub : le lien mène à la nouvelle (le compte y est récupéré via le serveur)
      var base = /(^|\.)github\.io$/.test(location.hostname) ? "https://mot-en-six.gamesbyneur.workers.dev/"
               : location.origin + location.pathname;
      var lien = base + "?compte=" + state.id;
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

    var boutonNouveau = el("compteNouveau");
    if (boutonNouveau) boutonNouveau.addEventListener("click", function () {
      var m = el("syncMsg");
      if (!configured || navigator.onLine === false) { m.textContent = "Il faut être connecté."; return; }
      if (!confirm("Remplacer ton code de compte ?\n\nL'ancien code et les anciens liens ne marcheront plus. "
                 + "Sur tes autres appareils, il faudra coller le nouveau code.")) return;
      m.textContent = "Changement…";
      pushRemote();                                   // la dernière progression part avec le compte
      setTimeout(function () {
        rpcP("compte_nouveau_code", { p_id: state.id }).then(function (nouveau) {
          if (!nouveau || typeof nouveau !== "string") throw new Error("vide");
          state.id = nouveau.toLowerCase(); codeRetire = false;
          try { localStorage.removeItem("motus.compteSauve"); } catch (e) {}
          saveLocal(); peindreCompte(); fillProfil();
          m.textContent = "Nouveau code en place ✓ — sauvegarde-le avec le bouton 🔗";
        }).catch(function (e) {
          m.textContent = estRetire(e) ? "Ce code avait déjà été remplacé." : "Échec — réessaie plus tard.";
        });
      }, 700);
    });

    el("restoreBtn").addEventListener("click", function () {
      var brut = (el("restoreCode").value || "").trim();
      // on accepte aussi bien un lien complet qu'un code seul
      var m = brut.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      var code = m ? m[0] : brut;
      if (code === state.id) { el("syncMsg").textContent = "C'est déjà ce compte."; el("restoreCode").value = ""; return; }
      if (!/^[0-9a-f-]{16,}$/i.test(code)) { el("restoreCode").value = ""; el("restoreCode").placeholder = "Code invalide"; return; }
      if (!configured) { el("restoreCode").placeholder = "Base non configurée"; el("restoreCode").value = ""; return; }
      fetchRemote(code).then(function (rem) {
        if (rem === "retire") { el("restoreCode").value = ""; el("syncMsg").textContent = "Ce code a été remplacé : utilise le nouveau."; return; }
        if (!rem) { el("restoreCode").value = ""; el("restoreCode").placeholder = "Code introuvable"; return; }
        state.id = code.toLowerCase();   // les deux appareils partagent désormais le même profil
        codeRetire = false;
        mergeRemote(rem);           // et on garde le meilleur des deux
        pushRemote();
        royBilanLu = false; royBilanSync();   // les parties du compte retrouvé
        el("restoreCode").value = "";
        el("syncMsg").textContent = "Compte récupéré ✓";
        try { localStorage.setItem("motus.compteSauve", "1"); } catch (e) {}
        peindreCompte();
        fillProfil();
      });
    });
  }

  var btTimer;
  /* Une seule bulle sert aux badges et au rappel de sauvegarde : ses
     messages passent donc par une FILE, chacun son tour. Auparavant le
     rappel écrasait la bulle d'un badge, puis en vidait le contenu — et
     plus aucun badge ne s'affichait jusqu'au rechargement de la page. */
  var bulleFile = [], bulleOccupee = false;
  function bulle(contenu, ms, avant) {
    bulleFile.push({ contenu: contenu, ms: ms, avant: avant });
    if (!bulleOccupee) bulleSuivante();
  }
  function bulleSuivante() {
    var m = bulleFile.shift();
    if (!m) { bulleOccupee = false; return; }
    bulleOccupee = true;
    mount();
    var t = el("badgeToast");
    if (!t) { bulleOccupee = false; bulleFile = []; return; }
    t.innerHTML = m.contenu;                    // reconstruit à chaque fois : jamais de structure manquante
    if (m.avant) { try { m.avant(); } catch (e) {} }
    t.classList.add("show");
    clearTimeout(btTimer);
    btTimer = setTimeout(function () {
      t.classList.remove("show");
      setTimeout(bulleSuivante, 300);           // le temps que la bulle disparaisse
    }, m.ms);
  }
  function echapper(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function badgeToast(bd) {
    bulle('<span class="be">' + echapper(bd.e) + '</span><div><b>Badge débloqué : ' + echapper(bd.n) + '</b><small>' + echapper(bd.d) + '</small></div>',
      3200, function () {
        // le moteur sonore vit dans le jeu : on l'appelle sans le dupliquer ici
        try { if (window.motusSon) window.motusSon("badge"); } catch (e) {}
        try { navigator.vibrate && navigator.vibrate([10, 60, 10]); } catch (e) {}
      });
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
    else if (tab === "today") {
      // les autres jeux (rébus…) n'ont qu'un exercice : le sélecteur
      // n'aurait rien à sélectionner
      var tabs = el("todayTabs");
      if (tabs) tabs.style.display = ((window.Profile.game || "motus") === "motus") ? "" : "none";
      // onglets d'Halloween : seulement pendant l'événement
      var hw = window.MOTUS_HALLOWEEN, j = todayStr();
      var actif = !!(hw && j >= hw.debut && j <= hw.fin);
      Array.prototype.forEach.call(document.querySelectorAll("#todayTabs .hw-tab"),
        function (x) { x.style.display = actif ? "" : "none"; });
      loadToday();
    }
  }

  function fillProfil() {
    var li = levelInfo(state.xp);
    set("pLevel", li.level); set("pTitle", li.title);
    var f = el("pXpFill"); if (f) f.style.width = Math.round(li.progress * 100) + "%";
    set("pXpText", li.inLevel + " / " + li.span + " XP  (encore " + li.toNext + ")");
    set("pGames", state.games); set("pWins", state.wins); set("pXp", state.xp);
    var pi = el("pseudoInput"); if (pi && document.activeElement !== pi) pi.value = state.pseudo || "";
    majPronom();
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
    // un rappel tous les 3 jours au plus (il revenait après CHAQUE partie :
    // la clé enregistrée était le nombre de parties, qui change à chaque fois)
    try {
      var dernier = +localStorage.getItem("motus.compteRappelAt") || 0;
      if (Date.now() - dernier < 3 * 86400000) return;
      localStorage.setItem("motus.compteRappelAt", String(Date.now()));
    } catch (e) {}
    bulle('<div><b>Pense à sauvegarder ton compte</b><small>' + state.games + ' parties, niveau ' + levelInfo(state.xp).level
      + ' — tout est encore sur ce seul appareil.</small></div>', 6000);
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
  function horsLigneMsg(box, done) {
    if (navigator.onLine !== false) return false;
    box.innerHTML = '<div class="muted">📡 Hors ligne — le classement reviendra avec la connexion.</div>';
    if (done) done();
    return true;
  }
  function loadRank(done) {
    if (horsLigneMsg(el("leaderboard"), done)) { el("myRank").innerHTML = ""; return; }
    var box = el("leaderboard"), mr = el("myRank");
    if (!configured) { mr.textContent = ""; box.innerHTML = '<div class="muted">Classement disponible une fois la base configurée.</div>'; if (done) done(); return; }
    mr.textContent = "…"; box.innerHTML = '<div class="muted">Chargement…</div>';

    if (rankMode === "elo") return loadRankElo(done);
    if (rankMode === "memo") return loadRankMemo(done);

    Promise.all([countQuery("profiles?select=pub&xp=gt." + state.xp), countQuery("profiles?select=pub")])
      .then(function (r) {
        if (r[0] != null && r[1] != null) mr.innerHTML = "Ta place : <b>#" + (r[0] + 1) + "</b> sur " + r[1] + " joueurs";
        else mr.textContent = "";
      });
    classementBrut("profiles?select=pub,pseudo,level,xp,badge&order=xp.desc&limit=20")
      .then(function (rows) {
        if (!rows.length) { box.innerHTML = '<div class="muted">Personne encore — sois le premier !</div>'; return; }
        box.innerHTML = rows.map(function (p, i) {
          var me = (p.pub ? p.pub === maPub() : p.id === state.id) ? " me" : "";
          var nm = (p.pseudo && p.pseudo.trim()) ? p.pseudo : "Anonyme";
          var em = p.badge ? '<span class="em">' + escapeHtml(p.badge) + "</span>" : "";
          return '<div class="r' + me + '"><span class="rk">' + (i + 1) + '</span><span class="nm">' + escapeHtml(nm) + "</span>" + em +
                 '<span class="lv">Niv. ' + (p.level || 1) + " · " + (p.xp || 0) + " XP</span></div>";
        }).join("");
      })
      .catch(function () { box.innerHTML = '<div class="muted">Classement indisponible</div>'; })
      .then(function () { if (done) done(); });
  }

  /* Classement Mémorisation : le temps d'affichage le plus BAS gagne — donc
     un classement croissant, pas décroissant comme XP et Elo. Utilise l'API
     déjà exposée par duel.js (window.Memo), pas de requête REST directe ici. */
  function loadRankMemo(done) {
    var box = el("leaderboard"), mr = el("myRank");
    var mesSecondes = state.b.memoBest, mesReussites = state.b.memoReussites || 0;
    mr.innerHTML = '<div class="elo-line"><div><span class="lbl">Ton record</span>'
      + '<small>' + (mesReussites ? mesReussites + " grille" + (mesReussites > 1 ? "s" : "") + " réussie" + (mesReussites > 1 ? "s" : "") : "aucune grille réussie") + '</small></div>'
      + '<span class="val">' + (mesSecondes < 60 ? mesSecondes + " s" : "—") + '</span></div>';
    if (!window.Memo || !window.Memo.configured || !window.Memo.configured()) {
      box.innerHTML = '<div class="muted">Classement disponible une fois la base configurée.</div>';
      if (done) done();
      return;
    }
    window.Memo.top(20).then(function (rows) {
      if (!rows || !rows.length) { box.innerHTML = '<div class="muted">Personne encore — sois le premier !</div>'; return; }
      box.innerHTML = rows.map(function (p, i) {
        var moi = (p.pseudo && p.pseudo === state.pseudo) ? " me" : "";
        var nm = (p.pseudo && p.pseudo.trim()) ? p.pseudo : "Anonyme";
        return '<div class="r' + moi + '"><span class="rk">' + (i + 1) + '</span><span class="nm">' + escapeHtml(nm) + '</span>'
             + '<span class="lv">' + p.secondes + ' s · ' + (p.reussites || 0) + ' réussites</span></div>';
      }).join("");
    }).catch(function () { box.innerHTML = '<div class="muted">Classement indisponible</div>'; })
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
      countQuery("profiles?select=pub&elo_games=gt.0&elo=gt." + myElo),
      countQuery("profiles?select=pub&elo_games=gt.0")
    ]).then(function (r) {
      if (!myGames) { mr.innerHTML = head + "Joue un duel pour entrer au classement."; }
      else if (r[0] != null && r[1] != null) mr.innerHTML = head + "Ta place : <b>#" + (r[0] + 1) + "</b> sur " + r[1] + " joueurs classés";
      else mr.innerHTML = head;
    });

    classementBrut("profiles?select=pub,pseudo,badge,elo,elo_games&elo_games=gt.0&order=elo.desc&limit=20")
      .then(function (rows) {
        if (!rows.length) { box.innerHTML = '<div class="muted">Aucun duel classé pour l\'instant — lance le premier !</div>'; return; }
        box.innerHTML = rows.map(function (p, i) {
          var me = (p.pub ? p.pub === maPub() : p.id === state.id) ? " me" : "";
          var nm = (p.pseudo && p.pseudo.trim()) ? p.pseudo : "Anonyme";
          var em = p.badge ? '<span class="em">' + escapeHtml(p.badge) + "</span>" : "";
          return '<div class="r' + me + '"><span class="rk">' + (i + 1) + '</span><span class="nm">' + escapeHtml(nm) + "</span>" + em +
                 '<span class="lv">' + (p.elo || 1000) + " · " + (p.elo_games || 0) + " duels</span></div>";
        }).join("");
      })
      .catch(function () { box.innerHTML = '<div class="muted">Classement indisponible</div>'; })
      .then(function () { if (done) done(); });
  }

  /* Les quatre exercices quotidiens partagent la table daily_results, le
     champ « game » les distingue. « tries » n'a pas le même sens partout :
     nombre d'essais pour le mot du jour, nombre de fautes pour les autres. */
  var TODAY_EX = {
    // « art » porte l'article : « le mot du jour » mais « l'orthographe du jour »
    motus: { art:"le ", label:"mot du jour",         barres:"essais", unite:function(n){ return n + " essai" + (n>1?"s":""); } },
    defi:  { art:"le ", label:"défi du jour",        barres:"fautes", unite:function(n){ return n===0 ? "sans faute" : n + " raté" + (n>1?"s":""); } },
    gram:  { art:"la ", label:"grammaire du jour",   barres:"fautes", unite:function(n){ return n===0 ? "sans faute" : n + " faute" + (n>1?"s":""); } },
    peur:    { art:"le ", label:"mot terrifiant", barres:"essais", unite:function(n){ return n + " essai" + (n>1?"s":""); } },
    // plus il y a de bonbons, mieux c'est : classement décroissant
    bonbons: { art:"les ", label:"bonbons du jour", barres:"aucune", ordre:"desc", score:true,
               unite:function(n){ return n + " bonbon" + (n>1?"s":""); } },
    traineau: { art:"le ", label:"Traîneau du jour", barres:"aucune", ordre:"desc", score:true,
                unite:function(n){ return n + " point" + (n>1?"s":""); } },
    ortho: { art:"l'",  label:"orthographe du jour", barres:"fautes", unite:function(n){ return n===0 ? "sans faute" : n + " faute" + (n>1?"s":""); } }
  };
  var todayMode = "motus";

  function loadToday(done) {
    var box = el("todayStats");
    if (horsLigneMsg(box, done)) return;
    var jeu = window.Profile.game || "motus";
    // le sélecteur n'a de sens que pour Motus : un autre jeu garde le sien
    var g = (jeu === "motus") ? todayMode : jeu, d = todayStr();
    var conf = TODAY_EX[g] || { art:"l'", label:"exercice du jour", barres:"essais",
                                unite:function(n){ return n + ""; } };
    var label = jeu === "rebus" ? "le rébus du jour" : (conf.art + conf.label);
    if (!configured) { box.innerHTML = '<div class="muted">Stats communautaires disponibles une fois la base configurée.</div>'; if (done) done(); return; }
    box.innerHTML = '<div class="muted">Chargement…</div>';
    var base = API + "/rest/v1/daily_results?game=eq." + g + "&day=eq." + d;
    Promise.all([
      fetch(base + "&select=won,tries", { headers: headers(), cache: "no-store" }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }),
      // jeu à score (bonbons) : chaque participant est classé, pas
      // seulement ceux qui ont « réussi » — sinon un score de 9 disparaissait
      fetch(base + (conf.score ? "" : "&won=eq.true") + "&select=pseudo,tries&order=tries." + (conf.ordre === "desc" ? "desc" : "asc") + ",created_at.asc&limit=10", { headers: headers(), cache: "no-store" }).then(function (r) { return r.ok ? r.json() : []; })
    ]).then(function (res) {
      var rows = res[0], top = res[1];
      var total = rows.length, solved = rows.filter(function (x) { return x.won; }).length;
      var pct = total ? Math.round(solved / total * 100) : 0;
      var html = '<div class="today-head"><div class="today-big">' + total + '</div><div class="today-sub">' +
                 (total > 1 ? "joueurs ont tenté " : "joueur a tenté ") + label + "</div></div>";
      if (conf.score) {
        var sc = rows.map(function (x) { return x.tries || 0; });
        var best = sc.length ? Math.max.apply(null, sc) : 0;
        var moy = sc.length ? Math.round(sc.reduce(function (a, b) { return a + b; }, 0) / sc.length) : 0;
        html += '<div class="dist-title">Record du jour : ' + conf.unite(best) + " · moyenne : " + conf.unite(moy) + "</div>";
      } else {
        html += '<div class="dist-title">' + pct + "% de réussite (" + solved + "/" + total + ")</div>";
      }
      if (conf.barres === "essais") {
        var dist = {}; for (var i = 1; i <= 6; i++) dist[i] = 0;
        rows.forEach(function (x) { if (x.won && x.tries >= 1 && x.tries <= 6) dist[x.tries]++; });
        var max = Math.max(1, dist[1], dist[2], dist[3], dist[4], dist[5], dist[6]);
        html += '<div class="dist-title">Essais de la communauté</div><div class="dist">';
        for (var j = 1; j <= 6; j++) { var v = dist[j], w = Math.max(Math.round(v / max * 100), 8); html += '<div class="bar"><span class="k">' + j + '</span><div class="t" style="width:' + w + '%">' + v + "</div></div>"; }
        html += "</div>";
      } else if (conf.barres === "fautes") {
        // ici « tries » compte les fautes : 0 à 3, et 0 est le meilleur
        var df = {0:0, 1:0, 2:0, 3:0};
        rows.forEach(function (x) { var t = x.tries; if (t >= 0 && t <= 3) df[t]++; });
        var mx = Math.max(1, df[0], df[1], df[2], df[3]);
        html += '<div class="dist-title">Fautes de la communauté</div><div class="dist">';
        for (var k = 0; k <= 3; k++) {
          var vf = df[k], wf = Math.max(Math.round(vf / mx * 100), 8);
          html += '<div class="bar"><span class="k">' + (k === 0 ? "0 ✓" : k) + '</span>'
                + '<div class="t" style="width:' + wf + '%">' + vf + "</div></div>";
        }
        html += "</div>";
      }
      html += '<div class="dist-title">Top du jour</div>';
      if (!top.length) html += '<div class="muted">' + (conf.score ? "Personne n\'a encore joué aujourd\'hui." : "Personne n\'a encore trouvé aujourd\'hui.") + '</div>';
      else html += '<div class="lb">' + top.map(function (p, i) {
        var nm = (p.pseudo && p.pseudo.trim()) ? p.pseudo : "Anonyme";
        var t = (p.tries == null) ? "trouvé" : conf.unite(p.tries);
        return '<div class="r"><span class="rk">' + (i + 1) + '</span><span class="nm">' + escapeHtml(nm) + '</span><span class="lv">' + t + "</span></div>";
      }).join("") + "</div>";
      box.innerHTML = html;
    }).catch(function () {
      box.innerHTML = '<div class="muted">Statistiques du jour indisponibles pour le moment.</div>';
    }).then(function () { if (done) done(); });
  }

  function refreshOpen() {
    var o = el("profileOverlay"); if (!o || !o.classList.contains("open")) return;
    if (curTab === "profil") fillProfil();
    else if (curTab === "badges") fillBadges();
  }

  function setPseudo(n) {
    // première fois qu'un pseudo est choisi : une étape de l'entonnoir des débuts (anonyme)
    if (!state.pseudo && n && window.motusMesure) { try { window.motusMesure("fun:pseudo"); } catch (e) {} }
    state.pseudo = (n || "").slice(0, 16); saveLocal(); pushDebounced(); fillProfil();
  }
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
      joue();
      o = o || {};
      var b = state.b, now = new Date();
      state.games += (o.gamesInc == null ? 1 : o.gamesInc);
      if (o.won) state.wins++;
      gagnerXp(o.xp || 0, o.mode || "normal", !o.won);

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
      joue();
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
      joue();
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
      joue();
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

    /* Traîneau (Noël) : une course qui compte (course du jour ou tentative bonus). */
    traineauDone: function (o) {
      joue();
      o = o || {};
      var b = state.b;
      b.trCourses = (b.trCourses || 0) + 1;
      b.trMeilleur = Math.max(b.trMeilleur || 0, +o.score || 0);
      b.trObstacles = (b.trObstacles || 0) + (+o.detruits || 0);
      b.trCadeaux = (b.trCadeaux || 0) + (+o.cadeaux || 0);
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
      joue();
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
      joue();
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
      joue();
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
    setBoutique: function (o) {
      state.boutique = fusionBoutique(state.boutique, o);
      // un achat local est déjà dans o ; la tenue et le nom de o sont les plus récents
      if (o) { state.boutique.porte = o.porte || {}; state.boutique.porteAt = o.porteAt || 0;
               state.boutique.nom = o.nom || "Minuit"; state.boutique.nomAt = o.nomAt || 0;
               state.boutique.visible = o.visible !== false; state.boutique.visibleAt = o.visibleAt || 0; }
      saveLocal(); checkBadges(); pushDebounced();
    },

    setJetons: function (j) {
      state.jetons = fusionJetons(state.jetons, j);
      state.hintEarned = Math.max(state.hintEarned || 0, (+state.jetons.base || 0) + Object.keys(state.jetons.set).length);
      saveLocal(); pushDebounced();
    },

    setHints: function (earned, spent, grants) {
      state.hintEarned = Math.max(state.hintEarned || 0, earned || 0);
      state.hintSpent  = Math.max(state.hintSpent  || 0, spent  || 0);
      if (grants) {
        var lg = state.hintGrants || (state.hintGrants = {});
        Object.keys(grants).forEach(function (k) { if (!lg[k]) lg[k] = grants[k]; });
      }
      saveLocal(); pushDebounced();
    },

    /* Avancement de Motus Quête. Le jeu vit dans une autre page : il nous
       envoie ses compteurs, on ne garde que le meilleur atteint. */
    /* Compteurs cumulés de Motus Junior — même principe que la Quête :
       cette page n'a pas accès au profil, elle nous envoie ses chiffres. */
    /* Mémorisation : le record est le temps d'affichage le plus BAS, donc
       on garde le minimum et non le maximum comme pour les autres. */
    /* Battle Royale : on ne garde que ce qui a du sens dans la durée —
       parties jouées, victoires, podiums, meilleur score. */
    /* Grammaire du jour : une seule participation compte par journée, comme
       le mot du jour. La série se casse si un jour est sauté. */
    /* Sert les deux exercices quotidiens : le préfixe des compteurs change,
       la logique de série est identique. */
    /* Halloween : kind = "peur" (mot terrifiant) ou "bonbons". Les jours
       joués sont comptés une seule fois chacun. */
    halloweenDone: function (o) {
      joue();
      o = o || {};
      var b = state.b, jour = new Date().toISOString().slice(0, 10);
      if (!Array.isArray(b.hwJours)) b.hwJours = [];
      if (b.hwJours.indexOf(jour) < 0) b.hwJours.push(jour);
      if (o.kind === "peur") {
        b.hwPeur = (b.hwPeur || 0) + 1;
        if (o.won) b.hwPeurWin = (b.hwPeurWin || 0) + 1;
      } else if (o.kind === "bonbons") {
        var n = Math.max(0, o.score || 0);
        b.hwBonbonsTotal = (b.hwBonbonsTotal || 0) + n;
        if (n > (b.hwBonbonsBest || 0)) b.hwBonbonsBest = n;
      }
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    gramDone: function (o) {
      joue();
      o = o || {};
      var pre = (o.quel === "ortho") ? "ortho" : "gram";
      var b = state.b, jour = new Date().toISOString().slice(0, 10);
      if (b[pre + "Dernier"] === jour) return;      // déjà compté aujourd'hui
      var hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      b[pre + "Serie"] = (b[pre + "Dernier"] === hier) ? (b[pre + "Serie"] || 0) + 1 : 1;
      if (b[pre + "Serie"] > (b[pre + "BestSerie"] || 0)) b[pre + "BestSerie"] = b[pre + "Serie"];
      b[pre + "Dernier"] = jour;
      b[pre + "Jours"] = (b[pre + "Jours"] || 0) + 1;
      b[pre + "Bonnes"] = (b[pre + "Bonnes"] || 0) + (o.score || 0);
      if (o.parfait) b[pre + "Parfaits"] = (b[pre + "Parfaits"] || 0) + 1;
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* Une partie compte UNE fois, identifiée par son code de salle : l'écran
       de fin peut se redessiner autant de fois qu'il veut. */
    royaleDone: function (o) {
      o = o || {};
      var b = state.b, code = String(o.code || "").toUpperCase();
      if (!code || !(o.rang >= 1)) return false;
      if (!b.royCodes || typeof b.royCodes !== "object") b.royCodes = {};
      if (b.royCodes[code]) return false;
      joue();
      var f = {}; f[code] = o.rang;
      royFusion(b, f);
      if ((o.total || 0) > (b.royMeilleurTotal || 0)) b.royMeilleurTotal = o.total;
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
      return true;
    },
    royaleCompte: function () { return royC(state.b); },
    /* Mon identifiant PUBLIC : c'est lui que la base renvoie pour me désigner
       dans une partie (jamais mon code de compte). */
    get pub() { return maPub(); },
    // false tant que duel/schema.sql v2.12 n'a pas été exécuté sur la base
    get baseAJour() { return baseAJour; },
    masque: masqueDe,
    royaleBilan: function () { royBilanLu = false; royBilanSync(); },

    memoDone: function (o) {
      joue();
      o = o || {};
      var b = state.b;
      b.memoTotal = (b.memoTotal || 0) + 1;
      if (o.won) {
        b.memoReussites = (b.memoReussites || 0) + 1;
        b.memoSerie = (b.memoSerie || 0) + 1;
        if (b.memoSerie > (b.memoBestSerie || 0)) b.memoBestSerie = b.memoSerie;
      } else {
        b.memoSerie = 0;
      }
      if (typeof o.best === "number") b.memoBest = Math.min(b.memoBest || 60, o.best);
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    juniorProgress: function (o) {
      o = o || {};
      var b = state.b;
      ["jrTotal","jrTousJeux","jrDuo","jrSerieDuo","jrJours"].forEach(function (k) {
        if (typeof o[k] === "number") b[k] = Math.max(b[k] || 0, o[k]);
      });
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    questProgress: function (o) {
      o = o || {};
      var b = state.b;
      ["qActes","qFins","qSecrets","qMonstres","qNiveau","qSansMort"].forEach(function (k) {
        if (typeof o[k] === "number") b[k] = Math.max(b[k] || 0, o[k]);
      });
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* Renvoie une promesse : true si le serveur a bien enregistré. L'appelant
       peut ainsi rejouer l'envoi plus tard — auparavant, un échec réseau
       était avalé et le joueur manquait au classement du jour. L'envoi est
       idempotent (upsert sur joueur + jeu + jour) : le rejouer est sans risque. */
    submitDaily: function (o) {
      if (!configured || !o) return Promise.resolve(false);
      return envoyerJour(o).then(function (ok) {
        if (!ok) mettreEnAttente(o);          // hors ligne : on le garde pour plus tard
        return ok;
      });
    },

    /* Au retour du réseau (et au démarrage) : renvoie les résultats du jour
       restés en attente, puis le profil complet. */
    pronomDe: pronomDe,
    pronomCharger: pronomCharger,

    /* XP gagnée hors d'une partie de mots (grammaire, orthographe, bonbons,
       mémorisation), soumise aux mêmes plafonds du jour :
       elle fait monter de niveau sans compter comme une partie (ni dans les
       victoires, ni dans les séries). */
    ajouterXp: function (n, mode, perte) {
      if (!(n > 0)) return;
      joue(); gagnerXp(n, mode || "autre", !!perte);
      saveLocal(); checkBadges(); pushDebounced(); refreshOpen();
    },

    /* ---------- Administration : fiche d'un joueur ----------
       Uniquement ce que le jeu enregistre déjà pour les classements et la
       synchronisation (voir la page de confidentialité) : rien de plus
       n'est collecté pour cela. */
    adminChercher: function (q) {
      if (!configured) return Promise.resolve([]);
      q = String(q || "").replace(/[*,()%]/g, "").trim().slice(0, 30);
      // la fiche s'ouvre par le MASQUE du joueur (r.id) : son code ne sort pas
      return rpcP("admin_joueurs", { p_admin: state.id, p_q: q || null })
        .then(function (l) { return (Array.isArray(l) ? l : []).map(function (r) { r.id = r.pub; return r; }); })
        .catch(function (e) {
          if (!absente(e)) return [];
          var filtre = q ? "&pseudo=ilike." + encodeURIComponent("*" + q + "*") : "";
          return getAncien("profiles?select=id,pseudo,level,games,wins,badge,updated_at" + filtre
                           + "&order=updated_at.desc.nullslast&limit=" + (q ? 30 : 25)).then(function (l) { return l || []; });
        });
    },
    adminFiche: function (pub) {
      if (!configured || !pub) return Promise.resolve(null);
      var depuis = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
      if (!baseAJour) return Promise.all([
        getAncien("profiles?select=*&id=eq." + encodeURIComponent(pub)),
        getAncien("daily_results?player_id=eq." + encodeURIComponent(pub) + "&day=gte." + depuis + "&select=game,day,tries,won&order=day.desc&limit=600")
      ]).then(function (x) { return x[0] && x[0][0] ? { profil: x[0][0], jours: x[1] || [] } : null; });
      return Promise.all([
        rpcP("admin_fiche", { p_admin: state.id, p_pub: pub }).catch(function () { return null; }),
        rpcP("admin_jours", { p_admin: state.id, p_pub: pub, p_depuis: depuis }).catch(function () { return []; })
      ]).then(function (x) {
        var p = Array.isArray(x[0]) ? x[0][0] : x[0];
        if (!p) return null;
        p.id = pub;
        return { profil: p, jours: Array.isArray(x[1]) ? x[1] : [] };
      });
    },
    badgesInfo: function () { return BADGES.map(function (b) { return { id: b.id, e: b.e, n: b.n, c: b.c }; }); },

    rattraper: function (avecProfil) {
      if (!configured || navigator.onLine === false) return;
      var file = lireFile();
      if (file.length) {
        ecrireFile([]);
        file.forEach(function (o) {
          envoyerJour(o).then(function (ok) { if (!ok) mettreEnAttente(o); });
        });
      }
      // le profil complet, seulement au RETOUR du réseau : au démarrage, la
      // synchronisation normale doit d'abord récupérer une éventuelle
      // progression faite sur un autre appareil
      if (avecProfil) pushRemote();
    },

    /* Historique d'un jeu du jour pour CE joueur : [{day, won}], du plus
       récent au plus ancien. null en cas d'échec (hors ligne, serveur). */
    historiqueJour: function (jeu) {
      if (!configured || !state.id) return Promise.resolve(null);
      return rpcP("jour_mes_resultats", { p_id: state.id, p_game: jeu, p_day: null, p_limit: 400 })
        .then(function (l) { return Array.isArray(l) ? l.map(function (r) { return { day: r.day, won: r.won }; }) : null; })
        .catch(function (e) {
          if (!absente(e)) return null;
          return getAncien("daily_results?player_id=eq." + encodeURIComponent(state.id) + "&game=eq." + encodeURIComponent(jeu)
                           + "&select=day,won&order=day.desc&limit=400");
        });
    },

    /* Le résultat de CE joueur pour un jeu du jour : {tries, won} s'il a
       déjà joué (sur n'importe quel appareil), null s'il n'a pas joué,
       undefined si l'on ne peut pas savoir (hors ligne, serveur absent). */
    resultatJour: function (jeu, jour) {
      if (!configured || !state.id || navigator.onLine === false) return Promise.resolve(undefined);
      return rpcP("jour_mes_resultats", { p_id: state.id, p_game: jeu, p_day: jour, p_limit: 1 })
        .then(function (l) { return Array.isArray(l) ? (l[0] ? { tries: l[0].tries, won: l[0].won } : null) : undefined; })
        .catch(function (e) {
          if (!absente(e)) return undefined;
          return getAncien("daily_results?player_id=eq." + encodeURIComponent(state.id) + "&game=eq." + encodeURIComponent(jeu)
                           + "&day=eq." + encodeURIComponent(jour) + "&select=tries,won&limit=1")
            .then(function (l) { return Array.isArray(l) ? (l[0] || null) : undefined; });
        });
    },

    submitDailyBrut: function (o) {
      /* ignore-duplicates : le PREMIER résultat du jour fait foi. Avant, le
         dernier envoyé écrasait le précédent : on pouvait rejouer le mot du
         jour sur un second appareil, réponse connue, et améliorer son score. */
      if (codeRetire) return Promise.resolve(false);
      return rpcP("jour_ecrire", { p_id: state.id, p_pseudo: state.pseudo || "", p_game: o.game, p_day: o.day,
                                   p_tries: (o.tries == null ? null : o.tries), p_won: !!o.won })
        .then(function (ok) { return ok !== false; })
        .catch(function (e) {
          if (estRetire(e)) { signalerCodeRetire(); return false; }
          if (!absente(e)) return false;
          return fetch(API + "/rest/v1/daily_results?on_conflict=player_id,game,day", {
            method: "POST", headers: headers({ "Prefer": "resolution=ignore-duplicates,return=minimal" }),
            body: JSON.stringify({ player_id: state.id, pseudo: state.pseudo, game: o.game, day: o.day,
                                   tries: (o.tries == null ? null : o.tries), won: !!o.won })
          }).then(function (r) { return !!(r && r.ok); }).catch(function () { return false; });
        });
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
