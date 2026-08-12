/* ===================================================================
   MOTUS QUÊTE — données de l'aventure solo.

   HISTOIRE : le Seigneur des Mots a volé le Lexique, le livre qui
   nomme toute chose. Privées de leur nom, les créatures s'effacent —
   et attaquent quiconque en porte encore. Chaque mot prononcé les
   blesse parce qu'il leur rappelle ce qu'elles ont perdu.

   STRUCTURE : 5 actes. Chaque acte est une CARTE à embranchements :
   le joueur choisit son chemin étage par étage jusqu'au boss. C'est
   ce choix d'itinéraire qui porte la rejouabilité.
   =================================================================== */
window.MOTUS_RPG = {

  prologue: "Le Lexique a été volé. Sans lui, les créatures oublient leur propre nom et s'effacent. Elles t'attaquent parce que tu parles encore — et chaque mot que tu prononces leur brûle la mémoire.\n\nCinq contrées te séparent du voleur. À chaque étape, choisis ta route : la plus sûre n'est pas toujours la plus riche.",

  epilogue: "Le Lexique retrouvé, les noms reviennent un à un. Le gobelin se souvient du sien. Le vieil arbre récite ses douze syllabes. Le monde recommence à s'appeler.",

  /* ---------- Traits : propres à UN monstre ---------- */
  traits: {
    esquive:     { e:"💨", n:"Insaisissable", d:"Esquive une attaque sur quatre." },
    carapace:    { e:"🪨", n:"Carapace",      d:"Réduit chaque attaque de 4 dégâts." },
    venin:       { e:"🧪", n:"Venin",         d:"Tu perds 3 PV supplémentaires par tour." },
    regen:       { e:"🌱", n:"Régénération",  d:"Récupère 6 PV à chaque tour." },
    brouillard:  { e:"🌫️", n:"Brouillard",    d:"Les lettres mal placées ne sont plus signalées." },
    furie:       { e:"😡", n:"Furie",         d:"Ses dégâts augmentent de 2 à chaque tour." },
    vampire:     { e:"🩸", n:"Sangsue",       d:"Se soigne de la moitié des dégâts qu'il t'inflige." },
    voleur:      { e:"🫳", n:"Chapardeur",    d:"Te vole 4 points de mana par tour." },
    renaissance: { e:"🔥", n:"Renaissance",   d:"Revient une fois à 40 % de ses PV." },
    muet:        { e:"🤐", n:"Silence",       d:"Bloque une compétence au hasard à chaque nouveau mot." },
    epines:      { e:"🌵", n:"Épines",        d:"Te renvoie 3 dégâts chaque fois que tu le frappes." },
    rapide:      { e:"⏩", n:"Fulgurant",     d:"Frappe deux fois tous les trois tours." }
  },

  /* ---------- Particularités d'ACTE : valables sur tous ses combats ---------- */
  zoneMods: {
    feuillesZ1: { e:"🍂", n:"Feuilles mortes",   d:"5 lettres, absentes du mot, sont interdites au clavier." },
    echoZ2:     { e:"🔔", n:"Écho",              d:"Bien placée ou mal placée : impossible à distinguer, tout s'affiche en orange." },
    orthoZ3:    { e:"🥴", n:"Faute fatale",      d:"Un mot mal orthographié consomme quand même la tentative." },
    fumeeZ4:    { e:"💨", n:"Fumée",             d:"Certaines cases sont noyées dans la fumée : impossible de savoir ce qu'elles cachent." },
    chateauZ5:  { e:"🔒", n:"Devoir de mémoire", d:"Une lettre bien placée doit le rester, une lettre mal placée doit être réutilisée." }
  },

  /* ---------- Les 5 actes ---------- */
  zones: [
    { id:"foret", nom:"Lisière des Sans-Noms", e:"🌲", mod:"feuillesZ1", lens:[4,5],
      intro:"Ici vivaient des bêtes ordinaires. Depuis le vol du Lexique, elles ne savent plus ce qu'elles sont.",
      etages:4,
      monstres:[
        { n:"Gobelin",   e:"🧌", trait:"esquive",  cri:"Il répète un son qui ressemblait autrefois à son nom." },
        { n:"Loup gris", e:"🐺", trait:"furie",    cri:"La meute l'a chassé : elle ne le reconnaissait plus." },
        { n:"Araignée",  e:"🕷️", trait:"venin",   cri:"Elle tisse des lettres au lieu de fils, sans savoir les lire." },
        { n:"Corbeau",   e:"🐦‍⬛", trait:"voleur", cri:"Il collectionne les mots des voyageurs pour s'en faire un nom." },
        { n:"Sanglier",  e:"🐗", trait:"rapide",   cri:"Il charge tout ce qui parle, sans distinction." }
      ],
      elites:[
        { n:"Meute affamée", e:"🐾", trait:"rapide", cri:"Trois gueules, aucun nom à elles trois." },
        { n:"Ronce vivante", e:"🌿", trait:"epines", cri:"Elle pousse là où un jardin portait un nom." }
      ],
      boss:{ n:"Ent ancien", e:"🌳", trait:"carapace",
        cri:"Le plus vieil arbre de la forêt. Son nom tenait en douze syllabes ; il n'en reste aucune." } },

    { id:"grotte", nom:"Grotte des Échos morts", e:"🕯️", mod:"echoZ2", lens:[5,6],
      intro:"Les parois répétaient autrefois tout ce qu'on leur disait. Aujourd'hui elles avalent les mots sans les rendre.",
      etages:4,
      monstres:[
        { n:"Chauve-souris",  e:"🦇", trait:"esquive",  cri:"Elle crie pour s'orienter, mais plus rien ne lui répond." },
        { n:"Rat géant",      e:"🐀", trait:"voleur",   cri:"Il ronge les pages arrachées au Lexique. Il en a pris le goût." },
        { n:"Serpent",        e:"🐍", trait:"venin",    cri:"Sa langue fourchue prononce deux mots faux à la fois." },
        { n:"Golem de pierre",e:"🗿", trait:"carapace", cri:"On avait gravé son nom sur son front. Quelqu'un l'a effacé." },
        { n:"Ver des roches", e:"🪱", trait:"regen",    cri:"Il digère la pierre et les syllabes avec la même indifférence." }
      ],
      elites:[
        { n:"Cristal hurleur", e:"💎", trait:"epines",  cri:"Chaque coup porté le fait chanter un nom qui n'est pas le sien." },
        { n:"Ombre du puits",  e:"🕳️", trait:"muet",   cri:"Elle avale les mots avant qu'ils n'atteignent l'air." }
      ],
      boss:{ n:"Dragonneau", e:"🐉", trait:"furie",
        cri:"Trop jeune pour avoir été nommé. Il ne le sera jamais." } },

    { id:"marais", nom:"Marais des Serments rompus", e:"🌫️", mod:"orthoZ3", lens:[6,7],
      intro:"On venait y jurer fidélité. Les promesses, faites de mots, ont pourri les premières.",
      etages:5,
      monstres:[
        { n:"Crapaud vorace", e:"🐸", trait:"vampire",    cri:"Il gobe les syllabes qui flottent au-dessus de l'eau." },
        { n:"Sangsue",        e:"🪰", trait:"vampire",    cri:"Elle ne boit pas le sang, mais la mémoire de ceux qui parlent." },
        { n:"Feu follet",     e:"🔥", trait:"brouillard", cri:"Une lettre unique, seule survivante d'un mot entier." },
        { n:"Noyé sans nom",  e:"👤", trait:"muet",       cri:"Il cherche la berge où quelqu'un l'appelait encore." },
        { n:"Héron spectral", e:"🦩", trait:"esquive",    cri:"Il pêche des mots morts dans une eau qui ne reflète rien." }
      ],
      elites:[
        { n:"Sorcière du limon", e:"🧙", trait:"muet",  cri:"Elle a vendu son nom contre un sort. Le marché était mauvais." },
        { n:"Colosse de vase",   e:"🟤", trait:"regen", cri:"Fait de tout ce que le marais a englouti, noms compris." }
      ],
      boss:{ n:"Hydre", e:"🐲", trait:"regen",
        cri:"Coupe-lui une tête : il en repousse deux, et aucune ne sait parler." } },

    { id:"volcan", nom:"Forge du Premier Mot", e:"🌋", mod:"fumeeZ4", lens:[6,8],
      intro:"C'est ici qu'on forgeait les noms, un par un, dans la roche en fusion. Les forges sont froides.",
      etages:5,
      monstres:[
        { n:"Salamandre",   e:"🦎", trait:"regen",       cri:"Née dans la braise d'un mot qui n'a jamais refroidi." },
        { n:"Harpie",       e:"🦅", trait:"esquive",     cri:"Elle hurle des noms volés à ceux qu'elle a laissés tomber." },
        { n:"Élémentaire",  e:"☄️", trait:"brouillard",  cri:"Une colère sans nom, donc sans rien pour la calmer." },
        { n:"Golem de lave",e:"🌋", trait:"carapace",    cri:"Dernier gardien de la forge. Il protège un atelier vide." },
        { n:"Forgeron creux",e:"⚒️", trait:"rapide",     cri:"Il martèle une enclume vide depuis que les noms ont cessé." }
      ],
      elites:[
        { n:"Braise éternelle", e:"🔥", trait:"renaissance", cri:"Elle refuse de s'éteindre, faute de savoir comment on l'appelait." },
        { n:"Enclume hurlante", e:"🛠️", trait:"epines",     cri:"Chaque coup reçu résonne comme un nom mal prononcé." }
      ],
      boss:{ n:"Phénix", e:"🕊️", trait:"renaissance",
        cri:"Il renaît de ses cendres à chaque fois. Mais sans nom, il renaît étranger à lui-même." } },

    { id:"citadelle", nom:"Citadelle d'obsidienne", e:"🏰", mod:"chateauZ5", lens:[7,8],
      intro:"Le Lexique est ici, quelque part. Les gardiens ont été payés en noms — les tiens, si tu échoues.",
      etages:5,
      monstres:[
        { n:"Spectre",        e:"👻", trait:"esquive",  cri:"Il cherche encore la tombe où son nom était écrit." },
        { n:"Gargouille",     e:"🗿", trait:"carapace", cri:"Sculptée pour garder la porte. Personne n'a pensé à la nommer." },
        { n:"Chevalier noir", e:"⚔️", trait:"furie",    cri:"Il a offert son nom au Seigneur des Mots. Il regrette, mais il obéit." },
        { n:"Scribe damné",   e:"🖋️", trait:"muet",    cri:"Il recopie le Lexique à l'envers, une page par nuit." },
        { n:"Sentinelle",     e:"🛡️", trait:"epines",  cri:"Elle ne laisse passer que ceux qui savent se nommer." }
      ],
      elites:[
        { n:"Liche", e:"💀", trait:"muet",
          cri:"Elle a écrit son nom sur mille parchemins pour ne pas l'oublier. Ils ont tous brûlé." },
        { n:"Geôlier des voix", e:"🔗", trait:"vampire", cri:"Il garde une salle pleine de noms qui hurlent." }
      ],
      boss:{ n:"Seigneur des Mots", e:"👑", trait:"renaissance",
        cri:"« J'ai pris le Lexique pour être le seul à pouvoir nommer. Toi qui parles encore : tais-toi. »" } }
  ],

  /* ---------- Compétences : choisies, jamais offertes d'office ---------- */
  skills: [
    { id:"reveal", e:"🔍", n:"Révélation", cout:10, d:"Révèle une lettre bien placée du mot en cours." },
    { id:"soin",   e:"💚", n:"Soin",       cout:14, d:"Rends 35 points de vie." },
    { id:"rage",   e:"⚡", n:"Rage",       cout:18, d:"Double les dégâts de ta prochaine attaque." },
    { id:"garde",  e:"🛡️", n:"Garde",      cout:12, d:"Annule la prochaine attaque du monstre." },
    { id:"exec",   e:"☠️", n:"Exécution",  cout:26, d:"Inflige 30 dégâts directs, sans passer par les lettres." },
    { id:"purge",  e:"🌬️", n:"Souffle",    cout:16, d:"Change le mot en cours pour un autre, sans perdre de tour." },
    { id:"drain",  e:"🩸", n:"Ponction",   cout:20, d:"Inflige 15 dégâts et te soigne d'autant." }
  ],

  /* ---------- Améliorations proposées à chaque niveau (3 au choix) ---------- */
  upgrades: [
    { id:"pv",     e:"❤️", n:"Vigueur",     d:"+18 points de vie maximum", pv:18 },
    { id:"mp",     e:"🔷", n:"Concentration",d:"+10 points de mana maximum", mp:10 },
    { id:"atk",    e:"🗡️", n:"Puissance",   d:"+3 dégâts à chaque attaque", atk:3 },
    { id:"crit",   e:"🎯", n:"Précision",   d:"+6 dégâts quand tu trouves le mot", critBonus:6 },
    { id:"regen",  e:"🌿", n:"Endurance",   d:"Récupère 4 PV à chaque mot trouvé", regenMot:4 },
    { id:"manaMot",e:"✨", n:"Inspiration", d:"Récupère 4 mana de plus à chaque mot trouvé", manaMot:4 }
  ],

  /* ---------- Reliques : effets passifs, trouvées en chemin ---------- */
  relics: [
    { id:"boussole", e:"🧭", n:"Boussole fêlée",   d:"La première lettre de chaque mot t'est offerte." },
    { id:"besace",   e:"🎒", n:"Besace sans fond", d:"Les potions soignent 50 % de plus." },
    { id:"amulette", e:"📿", n:"Amulette d'ivoire",d:"Tu survis une fois par acte avec 1 PV au lieu de mourir." },
    { id:"encrier",  e:"🖋️", n:"Encrier tari",    d:"+5 dégâts contre les monstres d'élite et les boss." },
    { id:"clepsydre",e:"⏳", n:"Clepsydre",        d:"Un mot raté ne déclenche pas la riposte renforcée." },
    { id:"bourse",   e:"👛", n:"Bourse cousue",    d:"+50 % d'or ramassé." },
    { id:"loupe",    e:"🔎", n:"Loupe du copiste", d:"Les compétences coûtent 3 mana de moins." },
    { id:"miroir",   e:"🪞", n:"Miroir terni",     d:"Renvoie 4 dégâts au monstre à chacune de ses attaques." },
    { id:"grimoire", e:"📕", n:"Grimoire écorné",  d:"+2 mana à chaque tentative, même ratée." },
    { id:"talisman", e:"🧿", n:"Talisman fendu",   d:"Ignore la particularité de l'acte une fois par combat." }
  ],

  /* ---------- Objets ---------- */
  items: {
    potions: [
      { id:"potion_pv", e:"🧪", n:"Potion de vie", d:"Rend 30 PV.", pv:30 },
      { id:"potion_mp", e:"🔷", n:"Fiole de mana", d:"Rend 20 MP.", mp:20 }
    ]
  },
  shop: [
    { item:"potion_pv", prix:14 },
    { item:"potion_mp", prix:14 }
  ],

  /* ---------- Événements de chemin (nœud "événement") ---------- */
  events: [
    { id:"campement", e:"🏕️", n:"Feu de camp abandonné",
      texte:"Les braises sont encore tièdes. Quelqu'un est passé par ici, il n'y a pas longtemps.",
      options:[
        { texte:"Te reposer un instant", effet:{hp:25}, suite:"Tu repars requinqué." },
        { texte:"Fouiller les environs", effet:{or:12}, suite:"Quelques pièces oubliées sous la cendre." }
      ] },
    { id:"sage", e:"🧓", n:"Un vieil homme égaré",
      texte:"« J'ai perdu le nom de mon village natal », murmure-t-il. « Peux-tu m'aider à le retrouver ? »",
      options:[
        { texte:"L'aider à chercher", effet:{xp:14}, suite:"Vous ne trouvez rien, mais il te remercie du temps passé." },
        { texte:"Échanger des nouvelles", effet:{or:11}, suite:"Il te paie pour les histoires que tu lui rapportes." }
      ] },
    { id:"lettre", e:"✉️", n:"Une lettre tombée au sol",
      texte:"Le papier est humide mais encore lisible. Elle n'est adressée à personne en particulier.",
      options:[
        { texte:"La lire", effet:{or:10}, suite:"Elle décrit une cachette. Tu y trouves quelques pièces." },
        { texte:"La garder pour l'étudier", effet:{xp:11}, suite:"Certains mots t'y apprennent quelque chose." }
      ] },
    { id:"reve", e:"💤", n:"Un rêve étrange",
      texte:"Tu somnoles contre un arbre. Dans ton rêve, un mot flotte devant toi, presque lisible.",
      options:[
        { texte:"Te concentrer sur le rêve", effet:{mp:22}, suite:"Tu te réveilles l'esprit clair." },
        { texte:"Noter ce que tu as vu", effet:{or:11}, suite:"Un conteur te l'achète sans hésiter." }
      ] },
    { id:"sanctuaire", e:"⛩️", n:"Un sanctuaire oublié",
      texte:"Une pierre couverte de mousse, entourée d'offrandes anciennes.",
      options:[
        { texte:"Te recueillir", effet:{hp:20, mp:15}, suite:"Une chaleur discrète te traverse." },
        { texte:"Faire une offrande (15 🪙)", cout:{or:15}, effet:{or:-15, xp:35}, suite:"La pierre accepte. Tu te sens plus aguerri." }
      ] },
    { id:"ombre", e:"🌑", n:"Une ombre te suit",
      texte:"Quelque chose t'observe depuis les fourrés, sans s'approcher ni s'éloigner.",
      options:[
        { texte:"Aller voir", effet:{hp:-10, or:20}, suite:"Une créature apeurée s'enfuit, lâchant sa bourse." },
        { texte:"Accélérer le pas", effet:{mp:10}, suite:"Tu préfères ne pas savoir. La marche t'éclaircit les idées." }
      ] },
    { id:"fete", e:"🎉", n:"Une fête improvisée",
      texte:"Des voyageurs ont dressé un feu et partagent ce qu'il leur reste.",
      options:[
        { texte:"Te joindre à eux", effet:{or:14, hp:10}, suite:"On te nourrit et on te paie pour une histoire bien racontée." },
        { texte:"Observer de loin", effet:{xp:12}, suite:"Tu apprends en regardant." }
      ] },
    { id:"dispute", e:"😠", n:"Une dispute entre voyageurs",
      texte:"Deux marchands se disputent un chargement tombé sur le chemin.",
      options:[
        { texte:"Les départager", effet:{xp:16}, suite:"Ta décision les calme. Ils repartent, chacun un peu déçu." },
        { texte:"Prendre parti", effet:{or:15}, suite:"L'un te remercie, quelques pièces glissées dans la main." }
      ] },
    { id:"compagnon", e:"🧑‍🌾", n:"Un compagnon de route",
      texte:"Une voyageuse marche un moment à tes côtés. Elle connaît ces terres mieux que toi.",
      options:[
        { texte:"Marcher avec elle", effet:{buffAtk:5}, suite:"Ses conseils t'aideront pour le prochain affrontement." },
        { texte:"Échanger des récits", effet:{xp:13}, suite:"Ce qu'elle raconte t'apprend plus que tu ne le pensais." }
      ] },
    { id:"meteo", e:"🌧️", n:"Un orage soudain",
      texte:"Le ciel se déchire sans prévenir. Le chemin devient glissant.",
      options:[
        { texte:"Chercher un abri", effet:{mp:14}, suite:"L'attente te repose plus que prévu." },
        { texte:"Avancer sous la pluie", effet:{hp:-8, or:16}, suite:"Tu arrives trempé, mais tu ramasses une bourse tombée." }
      ] },
    { id:"pari", e:"🎲", n:"Un inconnu propose un pari",
      texte:"« Pile je gagne, face tu gagnes le double », sourit-il en sortant une pièce usée.",
      options:[
        { texte:"Parier 15 pièces", effet:{pari:15}, suite:"" },
        { texte:"Décliner et l'observer", effet:{xp:8}, suite:"Sa technique de triche t'apprend quelque chose." }
      ] },
    { id:"autel", e:"🩸", n:"Un autel de pierre noire",
      texte:"Une entaille dans la pierre, et une inscription : « donne, et tu recevras ».",
      options:[
        { texte:"Offrir un peu de ton sang", effet:{hp:-15, relique:true}, suite:"La pierre s'ouvre sur un objet ancien." },
        { texte:"Refuser l'échange", effet:{mp:12}, suite:"Tu t'éloignes, l'esprit plus léger." }
      ] }
  ],

  /* ---------- Interruptions courtes EN PLEIN COMBAT ---------- */
  combatEvents: [
    { e:"💨", texte:"Une bourrasque te déstabilise.", effet:{hp:-4} },
    { e:"🪙", texte:"Tu ramasses une pièce tombée au sol.", effet:{or:4} },
    { e:"😮", texte:"Le monstre hésite un instant.", effet:{skipRiposte:true} },
    { e:"🌤️", texte:"Une éclaircie te redonne des forces.", effet:{mp:8} },
    { e:"⚡", texte:"Un frisson parcourt le monstre.", effet:{foeDmg:8} },
    { e:"🍂", texte:"Le vent t'apporte un vieux mot presque effacé.", effet:{or:3, mp:4} },
    { e:"🩹", texte:"Une égratignure de plus.", effet:{hp:-3} }
  ],

  /* ---------- Défis rencontrés sur un nœud "énigme" ---------- */
  defis: [
    { id:"coffre", e:"🗝️", n:"Un coffre verrouillé",
      texte:"Un vieux coffre à moitié enterré. La serrure porte un mot gravé, presque effacé.",
      succes:{or:30}, echec:{},
      texteSucces:"Le mécanisme cède. Les pièces roulent au fond.",
      texteEchec:"La serrure ne cède pas. Le coffre reste clos." },
    { id:"enigme", e:"🗿", n:"Une pierre gravée",
      texte:"« Je n'ai pas de bouche mais je parle à qui sait lire. »",
      succes:{xp:30}, echec:{},
      texteSucces:"La pierre semble satisfaite. Un savoir t'a été transmis.",
      texteEchec:"La pierre garde son secret." },
    { id:"piege", e:"⚠️", n:"Un piège caché",
      texte:"Le sol semble instable. Il faut réagir vite pour ne pas déclencher le mécanisme.",
      succes:{or:12}, echec:{hp:-18},
      texteSucces:"Tu désamorces le piège et récupères son lest.",
      texteEchec:"Le mécanisme se déclenche. Tu encaisses le choc." },
    { id:"passage", e:"🚪", n:"Un passage secret",
      texte:"Un mur sonne creux. Un mot ouvre ce genre de mécanisme, encore faut-il le deviner.",
      succes:{or:16, xp:16}, echec:{},
      texteSucces:"Le mur pivote sur un renfoncement oublié.",
      texteEchec:"Le mur reste un mur. Tant pis." },
    { id:"reliquaire", e:"⚱️", n:"Un reliquaire scellé",
      texte:"Un coffret d'ivoire, fermé par un mot au lieu d'une clé.",
      succes:{relique:true}, echec:{},
      texteSucces:"Le couvercle s'ouvre sur un objet ancien.",
      texteEchec:"Le reliquaire refuse de s'ouvrir." }
  ]
};
