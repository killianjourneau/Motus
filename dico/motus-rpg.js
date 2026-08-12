/* Motus Quête — données du mode RPG.

   HISTOIRE : le Verbe est la matière première du monde. Le Seigneur des Mots
   a volé le Lexique, le livre qui nomme toute chose. Privées de leur nom, les
   créatures s'effacent — et attaquent quiconque en porte encore. Chaque mot
   que tu prononces les blesse parce qu'il leur rappelle ce qu'elles ont perdu.

   zones    : progression, chaque zone impose ses longueurs de mots.
   monstres : pv, atk (dégâts par tour), xp, plus un TRAIT qui change les
              règles du combat, et une réplique qui dit pourquoi il attaque.
   traits   : voir ci-dessous — c'est eux qui font la différence entre
              « un Motus déguisé » et un vrai combat. */
window.MOTUS_RPG = {

  prologue: "Le Lexique a été volé. Sans lui, les créatures oublient leur propre nom et s'effacent. Elles t'attaquent parce que tu parles encore — et chaque mot que tu prononces leur brûle la mémoire. Remonte jusqu'au voleur.",

  /* Effets spéciaux portés par les monstres. */
  traits: {
    esquive:     { e:"💨", n:"Insaisissable", d:"Esquive une attaque sur quatre." },
    carapace:    { e:"🪨", n:"Carapace",      d:"Réduit chaque attaque de 3 dégâts." },
    venin:       { e:"🧪", n:"Venin",         d:"Tu perds 3 PV supplémentaires par tour." },
    regen:       { e:"🌱", n:"Régénération",  d:"Récupère 4 PV à chaque tour." },
    brouillard:  { e:"🌫️", n:"Brouillard",    d:"Les lettres mal placées ne sont plus signalées." },
    furie:       { e:"😡", n:"Furie",         d:"Ses dégâts augmentent de 2 à chaque tour." },
    vampire:     { e:"🩸", n:"Sangsue",       d:"Se soigne de la moitié des dégâts qu'il t'inflige." },
    voleur:      { e:"🫳", n:"Chapardeur",    d:"Te vole 5 points de mana par tour." },
    renaissance: { e:"🔥", n:"Renaissance",   d:"Revient une fois à 40 % de ses PV." },
    muet:        { e:"🤐", n:"Silence",       d:"Bloque une compétence au hasard à chaque nouveau mot." }
  },

  /* Particularités de ZONE : contrairement aux traits (un seul monstre),
     elles s'appliquent à TOUS les combats de la zone, tout le temps.
     C'est elles qui donnent à chaque zone sa propre façon de jouer. */
  zoneMods: {
    feuillesZ1: { e:"🍂", n:"Feuilles mortes",     d:"5 lettres, absentes du mot, sont interdites au clavier." },
    echoZ2:     { e:"🔔", n:"Écho",                d:"Bien placée ou mal placée : impossible à distinguer, tout s'affiche en orange." },
    orthoZ3:    { e:"🥴", n:"Faute fatale",        d:"Un mot mal orthographié consomme quand même la tentative." },
    fumeeZ4:    { e:"💨", n:"Fumée",               d:"Certaines cases sont noyées dans la fumée : impossible de savoir ce qu'elles cachent." },
    chateauZ5:  { e:"🔒", n:"Devoir de mémoire",   d:"Une lettre bien placée doit le rester, une lettre mal placée doit être réutilisée." }
  },

  zones: [
    {
      id: "foret", nom: "Lisière des Sans-Noms", e: "🌲", mod: "feuillesZ1",
      intro: "Ici vivaient des bêtes ordinaires. Depuis le vol du Lexique, elles ne savent plus ce qu'elles sont.",
      lens: [4, 5],
      monstres: [
        { n: "Gobelin",     e: "🧌", pv: 24,  atk: 4,  xp: 12, trait:"esquive",
          cri: "Il répète un son qui ressemblait autrefois à son nom." },
        { n: "Loup gris",   e: "🐺", pv: 32,  atk: 5,  xp: 16, trait:"furie",
          cri: "La meute l'a chassé : elle ne le reconnaissait plus." },
        { n: "Araignée",    e: "🕷️", pv: 38, atk: 6,  xp: 20, trait:"venin",
          cri: "Elle tisse des lettres au lieu de fils, sans savoir les lire." },
        { n: "Corbeau",     e: "🐦‍⬛", pv: 44, atk: 7, xp: 24, trait:"voleur",
          cri: "Il collectionne les mots des voyageurs pour s'en faire un nom." },
        { n: "Ent ancien",  e: "🌳", pv: 70,  atk: 9,  xp: 45, boss:1, trait:"carapace",
          cri: "Le plus vieil arbre de la forêt. Son nom tenait en douze syllabes ; il n'en reste aucune." }
      ]
    },
    {
      id: "grotte", nom: "Grotte des Échos morts", e: "🕯️", mod: "echoZ2",
      intro: "Les parois répétaient autrefois tout ce qu'on leur disait. Aujourd'hui elles avalent les mots sans les rendre.",
      lens: [5, 6],
      monstres: [
        { n: "Chauve-souris", e: "🦇", pv: 50,  atk: 8,  xp: 28, trait:"esquive",
          cri: "Elle crie pour s'orienter, mais plus rien ne lui répond." },
        { n: "Rat géant",     e: "🐀", pv: 58,  atk: 9,  xp: 32, trait:"voleur",
          cri: "Il ronge les pages arrachées au Lexique. Il en a pris le goût." },
        { n: "Serpent",       e: "🐍", pv: 66,  atk: 10, xp: 36, trait:"venin",
          cri: "Sa langue fourchue prononce deux mots faux à la fois." },
        { n: "Golem de pierre", e: "🗿", pv: 78, atk: 11, xp: 42, trait:"carapace",
          cri: "On avait gravé son nom sur son front. Quelqu'un l'a effacé." },
        { n: "Dragonneau",    e: "🐉", pv: 110, atk: 14, xp: 75, boss:1, trait:"furie",
          cri: "Trop jeune pour avoir été nommé. Il ne le sera jamais." }
      ]
    },
    {
      id: "marais", nom: "Marais des Serments rompus", e: "🌫️", mod: "orthoZ3",
      intro: "On venait y jurer fidélité. Les promesses, faites de mots, ont pourri les premières.",
      lens: [6, 7],
      monstres: [
        { n: "Crapaud vorace", e: "🐸", pv: 86,  atk: 12, xp: 46, trait:"vampire",
          cri: "Il gobe les syllabes qui flottent au-dessus de l'eau." },
        { n: "Sangsue",        e: "🪱", pv: 94,  atk: 13, xp: 50, trait:"vampire",
          cri: "Elle ne boit pas le sang, mais la mémoire de ceux qui parlent." },
        { n: "Feu follet",     e: "🔥", pv: 102, atk: 15, xp: 56, trait:"brouillard",
          cri: "Une lettre unique, seule survivante d'un mot entier." },
        { n: "Sorcière",       e: "🧙", pv: 116, atk: 16, xp: 62, trait:"muet",
          cri: "Elle a vendu son nom contre un sort. Le marché était mauvais." },
        { n: "Hydre",          e: "🐲", pv: 160, atk: 20, xp: 105, boss:1, trait:"regen",
          cri: "Coupe-lui une tête : il en repousse deux, et aucune ne sait parler." }
      ]
    },
    {
      id: "volcan", nom: "Forge du Premier Mot", e: "🌋", mod: "fumeeZ4",
      intro: "C'est ici qu'on forgeait les noms, un par un, dans la roche en fusion. Les forges sont froides.",
      lens: [7, 8],
      monstres: [
        { n: "Salamandre",    e: "🦎", pv: 126, atk: 18, xp: 68, trait:"regen",
          cri: "Née dans la braise d'un mot qui n'a jamais refroidi." },
        { n: "Harpie",        e: "🦅", pv: 138, atk: 19, xp: 74, trait:"esquive",
          cri: "Elle hurle des noms volés à ceux qu'elle a laissés tomber." },
        { n: "Élémentaire",   e: "☄️", pv: 150, atk: 21, xp: 82, trait:"brouillard",
          cri: "Une colère sans nom, donc sans rien pour la calmer." },
        { n: "Golem de lave", e: "🌋", pv: 168, atk: 23, xp: 90, trait:"carapace",
          cri: "Dernier gardien de la forge. Il protège un atelier vide." },
        { n: "Phénix",        e: "🕊️", pv: 220, atk: 27, xp: 145, boss:1, trait:"renaissance",
          cri: "Il renaît de ses cendres à chaque fois. Mais sans nom, il renaît étranger à lui-même." }
      ]
    },
    {
      id: "citadelle", nom: "Citadelle d'obsidienne", e: "🏰", mod: "chateauZ5",
      intro: "Le Lexique est ici, quelque part. Les gardiens ont été payés en noms — les tiens, si tu échoues.",
      lens: [8, 10],
      monstres: [
        { n: "Spectre",        e: "👻", pv: 180, atk: 24, xp: 96, trait:"esquive",
          cri: "Il cherche encore la tombe où son nom était écrit." },
        { n: "Gargouille",     e: "🗿", pv: 196, atk: 26, xp: 104, trait:"carapace",
          cri: "Sculptée pour garder la porte. Personne n'a pensé à la nommer." },
        { n: "Chevalier noir", e: "⚔️", pv: 212, atk: 28, xp: 112, trait:"furie",
          cri: "Il a offert son nom au Seigneur des Mots. Il regrette, mais il obéit." },
        { n: "Liche",          e: "💀", pv: 234, atk: 30, xp: 124, trait:"muet",
          cri: "Elle a écrit son nom sur mille parchemins pour ne pas l'oublier. Ils ont tous brûlé." },
        { n: "Seigneur des Mots", e: "👑", pv: 320, atk: 35, xp: 220, boss:1, trait:"renaissance",
          cri: "« J'ai pris le Lexique pour être le seul à pouvoir nommer. Toi qui parles encore : tais-toi. »" }
      ]
    }
  ],

  epilogue: "Le Lexique retrouvé, les noms reviennent un à un. Le gobelin se souvient du sien. Le vieil arbre récite ses douze syllabes. Le monde recommence à s'appeler.",

  /* Butin : potions (consommables) et équipement (deux emplacements,
     Arme et Relique). Chaque pièce a une "zmin" : la première zone où
     elle peut tomber — les zones avancées peuvent toujours faire tomber
     du matériel plus ancien, jamais l'inverse. */
  items: {
    potions: [
      { id:"potion_pv", e:"🧪", n:"Potion de vie",   d:"Rend 20 PV.", pv:20 },
      { id:"potion_mp", e:"🔷", n:"Fiole de mana",    d:"Rend 15 MP.", mp:15 }
    ],
    equip: [
      { id:"dague",     e:"🗡️", n:"Dague de ronces",     slot:"arme",    atk:2,  zmin:0 },
      { id:"cape",      e:"🧣", n:"Cape de mousse",       slot:"relique", pv:10,  zmin:0 },
      { id:"pioche",    e:"⛏️", n:"Pioche d'écho",        slot:"arme",    atk:4,  zmin:1 },
      { id:"prisme",    e:"🔮", n:"Prisme des échos",     slot:"relique", mp:12,  zmin:1 },
      { id:"cuirasse",  e:"🛡️", n:"Cuirasse embourbée",   slot:"relique", pv:18,  zmin:2 },
      { id:"larme",     e:"💧", n:"Larme de serment",     slot:"relique", mp:18,  zmin:2 },
      { id:"lame",      e:"🔥", n:"Lame incandescente",   slot:"arme",    atk:6,  zmin:3 },
      { id:"plaques",   e:"🌋", n:"Plaques de lave",      slot:"relique", pv:26,  zmin:3 },
      { id:"estoc",     e:"⚔️", n:"Estoc d'obsidienne",   slot:"arme",    atk:9,  zmin:4 },
      { id:"sceau",     e:"📖", n:"Sceau du Lexique",     slot:"relique", pv:20, mp:20, zmin:4 }
    ]
  },

  /* =====================================================================
     ÉVÉNEMENTS — entre deux combats, et de courtes interruptions pendant
     un combat. Trois familles :
       "choix"   : un texte, 2 ou 3 options, chacune avec son effet.
       "defi"    : une courte énigme de lettres (comme un combat en
                   miniature, mais sans monstre en face).
       "marchand": ouvre l'échoppe (gérée à part, pas ici).
     "effet" peut contenir : hp, mp, or, xp, potion (id d'une potion) —
     les valeurs négatives retirent, les positives donnent. */
  events: [
    { id:"campement", e:"🏕️", n:"Feu de camp abandonné", type:"choix",
      texte:"Les braises sont encore tièdes. Quelqu'un est passé par ici, il n'y a pas longtemps.",
      options:[
        { texte:"Te reposer un instant", effet:{hp:20}, suite:"Tu repars requinqué." },
        { texte:"Fouiller les environs", effet:{or:8}, suite:"Tu trouves quelques pièces oubliées sous la cendre." }
      ] },
    { id:"sage", e:"🧓", n:"Un vieil homme égaré", type:"choix",
      texte:"« J'ai perdu le nom de mon village natal », murmure-t-il. « Peux-tu m'aider à le retrouver ? »",
      options:[
        { texte:"L'aider à chercher", effet:{xp:8}, suite:"Vous ne trouvez rien, mais il te remercie du temps passé." },
        { texte:"Échanger des nouvelles de la route", effet:{or:7}, suite:"Il te paie en pièces pour les histoires que tu lui rapportes." }
      ] },
    { id:"lettre", e:"✉️", n:"Une lettre tombée au sol", type:"choix",
      texte:"Le papier est humide mais encore lisible. Elle n'est adressée à personne en particulier.",
      options:[
        { texte:"La lire", effet:{or:6}, suite:"Elle décrit une cachette. Tu y trouves quelques pièces." },
        { texte:"La garder pour l'étudier plus tard", effet:{xp:6}, suite:"Certains mots t'y apprennent quelque chose." }
      ] },
    { id:"reve", e:"💤", n:"Un rêve étrange", type:"choix",
      texte:"Tu somnoles un instant contre un arbre. Dans ton rêve, un mot flotte devant toi, presque lisible.",
      options:[
        { texte:"Te concentrer sur le rêve", effet:{mp:15}, suite:"Tu te réveilles l'esprit clair." },
        { texte:"Noter ce que tu as vu", effet:{or:7}, suite:"Un conteur croisé plus tard te l'achète sans hésiter." }
      ] },
    { id:"sanctuaire", e:"⛩️", n:"Un sanctuaire oublié", type:"choix",
      texte:"Une pierre couverte de mousse, entourée d'offrandes anciennes. Elle semble encore veiller sur quelque chose.",
      options:[
        { texte:"Te recueillir", effet:{hp:15, mp:15}, suite:"Une chaleur discrète te traverse." },
        { texte:"Faire une offrande (10 🪙)", effet:{or:-10, xp:25}, cout:{or:10}, suite:"La pierre semble accepter l'offrande. Tu te sens plus aguerri." }
      ] },
    { id:"ombre", e:"🌑", n:"Une ombre te suit", type:"choix",
      texte:"Quelque chose te observe depuis les fourrés, sans s'approcher ni s'éloigner.",
      options:[
        { texte:"Aller voir", effet:{hp:-8, or:12}, suite:"Une créature apeurée s'enfuit, lâchant quelques pièces." },
        { texte:"Accélérer le pas", effet:{}, suite:"Tu préfères ne pas savoir." }
      ] },
    { id:"fete", e:"🎉", n:"Une fête improvisée", type:"choix",
      texte:"Des voyageurs ont dressé un feu et partagent ce qu'il leur reste. Ils t'invitent d'un geste.",
      options:[
        { texte:"Te joindre à eux", effet:{or:10}, suite:"On te glisse quelques pièces pour une histoire bien racontée." },
        { texte:"Observer de loin", effet:{xp:4}, suite:"Tu apprends en regardant." }
      ] },
    { id:"dispute", e:"😠", n:"Une dispute entre voyageurs", type:"choix",
      texte:"Deux marchands se disputent un chargement tombé sur le chemin. Le ton monte.",
      options:[
        { texte:"Les départager", effet:{xp:10}, suite:"Ta décision les calme. Ils repartent, chacun un peu déçu." },
        { texte:"Prendre parti pour l'un d'eux", effet:{or:9}, suite:"Il te remercie discrètement, quelques pièces glissées dans la main." }
      ] },
    { id:"compagnon", e:"🧑‍🌾", n:"Un compagnon de route", type:"choix",
      texte:"Une voyageuse marche un moment à tes côtés. Elle connaît ces terres mieux que toi.",
      options:[
        { texte:"Marcher avec elle un moment", effet:{buffAtk:3}, suite:"Ses conseils t'aideront pour l'affrontement à venir." },
        { texte:"Échanger des récits de voyage", effet:{xp:8}, suite:"Ce qu'elle te raconte t'apprend plus que tu ne le pensais." }
      ] },
    { id:"meteo", e:"🌧️", n:"Un orage soudain", type:"choix",
      texte:"Le ciel se déchire sans prévenir. Le chemin devient glissant.",
      options:[
        { texte:"Chercher un abri", effet:{mp:6}, suite:"L'attente te repose un peu plus que prévu." },
        { texte:"Avancer sous la pluie", effet:{hp:-6, or:9}, suite:"Tu arrives trempé, mais tu ramasses une bourse tombée d'un voyageur pressé." }
      ] },
    { id:"pari", e:"🎲", n:"Un inconnu propose un pari", type:"choix",
      texte:"« Pile je gagne, face tu gagnes le double », sourit-il en sortant une pièce usée.",
      options:[
        { texte:"Parier 10 pièces", effet:{pari:10}, suite:"" },
        { texte:"Décliner", effet:{}, suite:"Il hausse les épaules et s'en va." }
      ] },
    { id:"coffre", e:"🗝️", n:"Un coffre verrouillé", type:"defi",
      texte:"Un vieux coffre, à moitié enterré. La serrure porte un mot gravé, presque effacé.",
      lens:[4,5], succes:{or:18}, echec:{},
      texteSucces:"Le mécanisme cède. Quelques pièces roulent au fond.",
      texteEchec:"La serrure ne cède pas. Tu abandonnes, le coffre reste clos." },
    { id:"enigme", e:"🗿", n:"Une pierre gravée d'une énigme", type:"defi",
      texte:"« Je n'ai pas de bouche mais je parle à qui sait lire. » La réponse tient en quelques lettres.",
      lens:[5,6], succes:{xp:14}, echec:{},
      texteSucces:"La pierre semble presque satisfaite. Un savoir t'a été transmis.",
      texteEchec:"La pierre garde son secret." },
    { id:"piege", e:"⚠️", n:"Un piège caché", type:"defi",
      texte:"Le sol semble instable. Il faut réagir vite pour ne pas déclencher le mécanisme.",
      lens:[4,4], succes:{}, echec:{hp:-12},
      texteSucces:"Tu désamorces le piège à temps.",
      texteEchec:"Le mécanisme se déclenche. Tu encaisses le choc." },
    { id:"passage", e:"🚪", n:"Un passage secret", type:"defi",
      texte:"Un mur sonne creux. Un mot semble ouvrir ce genre de mécanisme, encore faut-il le deviner.",
      lens:[5,7], succes:{or:10, xp:6}, echec:{},
      texteSucces:"Le mur pivote sur un petit renfoncement oublié.",
      texteEchec:"Le mur reste un mur. Tant pis." },
    { id:"fouille", e:"🔍", n:"Des ruines à fouiller", type:"defi",
      texte:"Des pierres effondrées, et peut-être quelque chose dessous — si tu es assez rapide.",
      lens:[4,6], succes:{potion:"potion_pv"}, echec:{},
      texteSucces:"Une fiole intacte, oubliée sous les gravats.",
      texteEchec:"Rien d'autre que de la poussière." },
    { id:"marchand", e:"🧺", n:"Un marchand ambulant", type:"marchand",
      texte:"« Potions, babioles, un peu de tout ! » Il pose son sac, l'air pas pressé." }
  ],

  /* Objets vendus par le marchand ambulant, avec leur prix en pièces. */
  /* Interruptions courtes EN PLEIN COMBAT — pas de choix, pas de défi,
     juste un mot et un effet immédiat, pour ne pas casser le rythme du
     tour par tour. Se déclenchent au hasard entre deux échanges. */
  combatEvents: [
    { e:"💨", texte:"Une bourrasque te déstabilise.", effet:{hp:-4} },
    { e:"🪙", texte:"Tu ramasses une pièce tombée au sol.", effet:{or:3} },
    { e:"😮", texte:"Le monstre hésite un instant.", effet:{skipRiposte:true} },
    { e:"🌤️", texte:"Une éclaircie te redonne des forces.", effet:{mp:6} },
    { e:"🦶", texte:"Ton pied glisse sur la pierre.", effet:{hp:-3} },
    { e:"⚡", texte:"Un frisson parcourt le monstre, affaibli l'instant d'un souffle.", effet:{foeDmg:5} },
    { e:"🍂", texte:"Le vent t'apporte un vieux mot presque effacé.", effet:{or:2, mp:3} },
    { e:"🩹", texte:"Une égratignure de plus.", effet:{hp:-2} }
  ],

  shop: [
    { item:"potion_pv", prix:12 },
    { item:"potion_mp", prix:12 }
  ],

  skills: [
    { id: "reveal", e: "🔍", n: "Révélation", lvl: 1,
      cout: 10, d: "Révèle une lettre bien placée du mot en cours." },
    { id: "soin",   e: "💚", n: "Soin",       lvl: 3,
      cout: 15, d: "Rends 30 points de vie." },
    { id: "rage",   e: "⚡", n: "Rage",       lvl: 5,
      cout: 20, d: "Double les dégâts de ta prochaine attaque." },
    { id: "garde",  e: "🛡️", n: "Garde",      lvl: 7,
      cout: 12, d: "Annule la prochaine attaque du monstre." },
    { id: "exec",   e: "☠️", n: "Exécution",  lvl: 10,
      cout: 30, d: "Inflige 25 dégâts directs, sans passer par les lettres." }
  ]
};
