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

  prologue: "Le Lexique contenait tous les mots du monde. Tant qu'il existait, les hommes, les bêtes et les peuples anciens pouvaient se parler.\n\nIl y a soixante ans, le roi des hommes s'est convaincu que le posséder, c'était régner sur tout ce qui respire. Il a brûlé la Bibliothèque oubliée, jeté ses mages aux fers, et emporté le livre.\n\nDepuis, il est seul à distribuer les mots. On obéit, ou l'on se tait à jamais.\n\nUn mage s'est échappé. Il a vécu caché dans la forêt au nom oublié, et il t'a appris ce qu'il savait. Tu es son apprenti — le dernier.\n\nCinq contrées te séparent du Lexique. À chaque étape, choisis ta route : la plus sûre n'est pas toujours la plus riche.",

  epilogue: "Tu rouvres le Lexique. Les mots s'échappent des pages comme un vol d'oiseaux et retournent à ceux qui les avaient perdus.\n\nLe gobelin retrouve son nom et pleure. Le vieux chêne récite ses douze syllabes. Dans les villages, des voisins se parlent pour la première fois depuis soixante ans.\n\nTon maître ne verra pas ça. Mais quelque part dans la forêt au nom oublié, quelqu'un vient de prononcer son nom à voix haute — et la forêt s'en souvient.",

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
    { id:"foret", nom:"La forêt au nom oublié", e:"🌲", mod:"feuillesZ1", lens:[4,5],
      intro:"Tu as grandi sous ces arbres, à réciter des mots que personne d'autre n'avait le droit de connaître. Ton maître est mort l'hiver dernier. Les bêtes d'ici ont oublié jusqu'à leur propre nom : elles t'attaquent parce que tu parles encore.",
      etages:4,
            monstres:[
        {n:"Gobelin",e:"🧌",trait:"esquive",
         cri:"Son langage ne compte que des W et des V. Personne ne lui a jamais appris le reste.",
         pouvoir:{id:"agile",n:"Petit et agile",d:"Les lettres mal placées ne lui font aucun dégât."},
         cache:"lache"},
        {n:"Loup solitaire",e:"🐺",trait:"rapide",
         cri:"Il a perdu sa meute. Il ne sait plus hurler pour la rappeler.",
         pouvoir:{id:"blessee",n:"Bête blessée",d:"Ses dégâts doublent quand ses points de vie sont bas."},
         cache:"beta"},
        {n:"Araignée géante",e:"🕷️",trait:"venin",
         cri:"Pourquoi a-t-il fallu que ça tombe sur une araignée…",
         pouvoir:{id:"toile",n:"Toile",d:"Après chaque tentative, elle t'interdit une lettre de plus."},
         cache:"insecte"},
        {n:"Corbeau maudit",e:"🐦‍⬛",trait:"voleur",
         cri:"Mon chapeau ! Maudit corbeau, maudit corbeau…",
         pouvoir:{id:"larcin",n:"Larcin",d:"Si tu ne trouves pas le mot, il emporte une relique."},
         cache:"cachotier"},
        {n:"Sanglier",e:"🐗",trait:"furie",
         cri:"Paraît-il qu'un certain Gaulois en mangeait des entiers.",
         pouvoir:{id:"charge",n:"Charge",d:"Il ne te blesse jamais — mais rater son mot est mortel."},
         cache:"viande"}
      ],
            elites:[
        {n:"Meute affamée",e:"🐾",trait:"rapide",
         cri:"Des loups ! Et pas un seul, cette fois.",
         pouvoir:{id:"meute",n:"Meute",d:"Trois bêtes se relaient : il faut les vaincre l'une après l'autre."},
         cache:"feu"},
        {n:"Ronce vivante",e:"🌿",trait:"regen",
         cri:"Elles poussent depuis cent ans, semées par une sorcière que plus personne ne nomme.",
         pouvoir:{id:"epines",n:"Ronce",d:"Chaque lettre grise la nourrit : elle regagne 1 point de vie."},
         cache:"degoutee"}
      ],
            boss:{n:"Le Chêne muet",e:"🌳",trait:"carapace",
         cri:"Soixante ans que nul n'a prononcé son nom de douze syllabes.",
         pouvoir:{id:"resistance",n:"Écorce ancienne",d:"Seuls les mots entièrement trouvés l'entament. Tout le reste glisse."},
         cache:"digne"} },

    { id:"grotte", nom:"Les ruines de la Bibliothèque oubliée", e:"🕯️", mod:"echoZ2", lens:[5,6],
      intro:"Soixante ans que personne n'est venu. Les rayonnages ont brûlé, mais les chaînes sont encore là, scellées au mur. Ton maître dormait ici. Quelque chose garde encore les cendres — et n'a jamais reçu l'ordre de s'arrêter.",
      etages:4,
      monstres:[
        {n:"Rat des cendres",e:"🐀",trait:"rapide",cri:"Il niche dans les reliures et digère ce qu'il en reste."},
        {n:"Chauve-souris",e:"🦇",trait:"esquive",cri:"Elle s'oriente au son. Ici, il n'y en a plus."},
        {n:"Cendre vivante",e:"🌫️",trait:"brouillard",cri:"Tout ce qui reste d'un rayonnage entier."},
        {n:"Gardien de pierre",e:"🗿",trait:"carapace",cri:"On lui a dit de surveiller. Personne n'est revenu lui dire d'arrêter."},
        {n:"Ver des reliures",e:"🪱",trait:"venin",cri:"Il a mangé tant de mots qu'il en bégaie."}
      ],
      elites:[
        {n:"Bibliothécaire creux",e:"👤",trait:"muet",cri:"Il range encore des livres qui n'existent plus."},
        {n:"Ombre du puits",e:"🕳️",trait:"regen",cri:"C'est là qu'on jetait les livres interdits. Ils remontent."}
      ],
      boss:{ n:"Le Geôlier de pierre", e:"🐉", trait:"furie",
        cri:"Trop jeune pour avoir été nommé. Il ne le sera jamais." } },

    { id:"marais", nom:"Les terres soumises", e:"🌫️", mod:"orthoZ3", lens:[6,7],
      intro:"Ici, on a choisi d'obéir. Chaque village reçoit du roi sa ration de mots : de quoi commercer, pas de quoi se plaindre. Ceux qui te reconnaissent ne te dénoncent pas — ils n'ont plus les mots pour le faire.",
      etages:5,
      monstres:[
        {n:"Milicien du roi",e:"🪖",trait:"carapace",cri:"Il ne sait pas lire l'ordre qu'il exécute. On ne le lui a pas appris."},
        {n:"Collecteur de mots",e:"📜",trait:"voleur",cri:"Il note qui a parlé, et combien. Le roi paie à la ligne."},
        {n:"Chien du bailli",e:"🐕",trait:"rapide",cri:"Le seul du village à qui l'on parle encore librement."},
        {n:"Villageois muet",e:"🧑‍🌾",trait:"muet",cri:"Il veut te prévenir de quelque chose. Il n'a plus les mots pour."},
        {n:"Délateur",e:"🗣️",trait:"esquive",cri:"Il a reçu cent mots de récompense. Il en a dépensé quatre-vingt-dix-neuf."}
      ],
      elites:[
        {n:"Sergent recruteur",e:"⚔️",trait:"furie",cri:"Il enrôle ceux qui n'ont plus de quoi refuser."},
        {n:"Crieur public",e:"📢",trait:"venin",cri:"Seule bouche autorisée sur cent lieues. Il ne dit que ce qu'on lui donne."}
      ],
      boss:{ n:"Le Bailli aux mille serments", e:"🐲", trait:"regen",
        cri:"Coupe-lui une tête : il en repousse deux, et aucune ne sait parler." } },

    { id:"volcan", nom:"La Forge des noms", e:"🌋", mod:"fumeeZ4", lens:[6,8],
      intro:"C'est d'ici que sortent les mots que le roi distribue. On les martèle un par un, vidés de la moitié de leur sens, pour qu'ils servent sans jamais permettre de dire non. Les forgerons n'ont plus de bouche.",
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
      boss:{ n:"Le Maître-forgeron", e:"🕊️", trait:"renaissance",
        cri:"Il renaît de ses cendres à chaque fois. Mais sans nom, il renaît étranger à lui-même." } },

    { id:"citadelle", nom:"La citadelle d'obsidienne", e:"🏰", mod:"chateauZ5", lens:[7,8],
      intro: "Le Lexique est au sommet, dans une pièce sans fenêtre. Le roi est vieux, maintenant. Il n'a plus parlé à personne depuis des années — à quoi bon, quand nul ne peut répondre. Il t'attend : tu es le premier depuis soixante ans à venir lui adresser la parole.",
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
      boss:{ n:"Le roi des hommes", e:"👑", trait:"renaissance",
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
    { id:"fete", zones:[2], e:"🎉", n:"Une fête improvisée",
      texte:"Des voyageurs ont dressé un feu et partagent ce qu'il leur reste.",
      options:[
        { texte:"Te joindre à eux", effet:{or:14, hp:10}, suite:"On te nourrit et on te paie pour une histoire bien racontée." },
        { texte:"Observer de loin", effet:{xp:12}, suite:"Tu apprends en regardant." }
      ] },
    { id:"dispute", zones:[2], e:"😠", n:"Une dispute entre voyageurs",
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
    { id:"meteo", zones:[0,2], e:"🌧️", n:"Un orage soudain",
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
      ] },

    /* ---- Dilemmes : ici, AUCUNE option n'est bonne. On choisit ce qu'on
       accepte de perdre. Marqués `amer:true` pour être tirés plus rarement. ---- */
    { id:"peage", zones:[2], e:"⛓️", n:"Un péage sur le pont", amer:true,
      texte:"Deux silhouettes barrent le seul pont. « On passe pas gratuitement. »",
      options:[
        { texte:"Payer ce qu'ils demandent", effet:{or:-30}, suite:"Ils s'écartent en comptant tes pièces." },
        { texte:"Forcer le passage", effet:{hp:-22}, suite:"Tu passes, mais tu y laisses des plumes." }
      ] },
    { id:"fievre", e:"🤒", n:"Une eau douteuse", amer:true,
      texte:"Ta gourde est vide depuis ce matin. La mare devant toi ne dit rien qui vaille.",
      options:[
        { texte:"Boire quand même", effet:{hp:-18}, suite:"Ça passe mal. Très mal." },
        { texte:"Continuer assoiffé", effet:{mp:-20}, suite:"La tête te tourne, tu peines à te concentrer." }
      ] },
    { id:"sangsues", zones:[2], e:"🪤", n:"Un marécage infesté", amer:true,
      texte:"Le raccourci traverse une eau noire. Le détour prendrait des heures.",
      options:[
        { texte:"Traverser", effet:{hp:-16}, suite:"Tu en ressors couvert de morsures." },
        { texte:"Faire le détour", effet:{or:-18, mp:-10}, suite:"La nuit tombe, tu dois payer un abri." }
      ] },
    { id:"pillards", zones:[2], e:"🗡️", n:"Un campement de pillards", amer:true,
      texte:"Ils dorment. Ton chemin passe juste à côté de leurs sacs.",
      options:[
        { texte:"Passer sans rien toucher", effet:{mp:-14}, suite:"Tu retiens ton souffle pendant une heure." },
        { texte:"Tenter de leur voler quelque chose", effet:{hp:-20, or:25}, suite:"L'un d'eux se réveille. Tu fuis avec une bourse et une entaille." }
      ] },
    { id:"serment", e:"📜", n:"Un serment ancien", amer:true,
      texte:"Une stèle réclame un tribut à qui veut passer : « le sang ou la mémoire ».",
      options:[
        { texte:"Donner de ton sang", effet:{hp:-24}, suite:"La stèle se fend et te laisse passer." },
        { texte:"Donner un mot de ta mémoire", effet:{xp:-30, mp:-12}, suite:"Tu oublies quelque chose. Tu ne sais plus quoi." }
      ] },
    { id:"champignons", zones:[0], e:"🍄", n:"Des champignons étranges",
      texte:"Ils poussent en cercle, exactement à hauteur d'homme. Ton maître t'avait appris à les reconnaître — mais pas celui-ci.",
      options:[
        { texte:"En manger un", effet:{hp:30}, suite:"Amer, puis chaud. Tes forces reviennent." },
        { texte:"En remplir ta besace", effet:{or:14}, suite:"Un apothicaire en donnera bien quelque chose." } ] },
    { id:"nid", zones:[0], e:"🪺", n:"Un nid abandonné",
      texte:"Les oisillons sont partis. Au fond, quelque chose brille sous les brindilles.",
      options:[
        { texte:"Fouiller le nid", effet:{or:16}, suite:"Une pièce ancienne, polie par le bec." },
        { texte:"Le laisser intact", effet:{xp:22}, suite:"Ton maître aurait approuvé. Tu apprends quelque chose sur toi." } ] },
    { id:"rayonnage", zones:[1], e:"📚", n:"Un rayonnage intact",
      texte:"Le feu s'est arrêté à un mètre. Une trentaine de volumes ont survécu, serrés les uns contre les autres.",
      options:[
        { texte:"Lire toute la nuit", effet:{xp:40}, suite:"Tu apprends trois mots que le roi croyait avoir brûlés." },
        { texte:"En emporter quelques-uns", effet:{or:20}, suite:"Lourds, mais un collectionneur paierait cher." } ] },
    { id:"chaines", zones:[1], e:"⛓️", n:"Les chaînes du mur", amer:true,
      texte:"Des noms sont gravés dans la pierre, à hauteur de main. L'un d'eux est celui de ton maître.",
      options:[
        { texte:"Graver le tien à côté", effet:{xp:34, hp:-8}, suite:"Tu n'es plus seulement son apprenti." },
        { texte:"Effacer le sien et vendre la pierre", effet:{or:30, xp:-12}, suite:"Le geste te rapporte. Il te coûte davantage." } ] },
    { id:"ration", zones:[2], e:"🍞", n:"La distribution des mots", amer:true,
      texte:"Une file attend devant la charrette du bailli. Chacun repart avec sa ration écrite sur un billet.",
      options:[
        { texte:"Faire la queue comme les autres", effet:{or:-10, hp:20}, suite:"Du pain avec. Personne ne te regarde." },
        { texte:"Parler à voix haute devant tous", effet:{xp:38, hp:-15}, suite:"Le silence se fait. Quelqu'un pleure. On te fait fuir." } ] },
    { id:"enfant", zones:[2], e:"🧒", n:"Un enfant qui montre du doigt",
      texte:"Il ne connaît aucun mot. Il désigne les choses, une par une, et attend que tu les nommes.",
      options:[
        { texte:"Lui apprendre dix mots", effet:{xp:36, mp:-8}, suite:"Il les répète toute la journée. Ça se propagera." },
        { texte:"Passer ton chemin", effet:{hp:10}, suite:"Tu l'entends encore désigner des choses, longtemps après." } ] },
    { id:"enclume", zones:[3], e:"⚒️", n:"Une enclume tiède", amer:true,
      texte:"Un mot y est resté, à moitié forgé. On distingue encore ce qu'il aurait pu vouloir dire.",
      options:[
        { texte:"L'achever toi-même", effet:{xp:42, mp:-12}, suite:"Le mot est entier. Il te réchauffe la main." },
        { texte:"Le briser et vendre le métal", effet:{or:26, xp:-10}, suite:"Le métal se revend. Ce qu'il disait est perdu." } ] },
    { id:"moule", zones:[3], e:"🕳️", n:"Le moule des noms",
      texte:"Chaque nom du royaume est passé par là. Le tien y figure peut-être déjà.",
      options:[
        { texte:"Chercher ton nom", effet:{xp:30}, suite:"Il n'y est pas. Le roi ne sait pas encore que tu existes." },
        { texte:"Fondre un moule vierge", effet:{or:22, hp:-10}, suite:"Le métal brûle, mais vaut cher." } ] },
    { id:"meurtriere", zones:[4], e:"🪟", n:"Une meurtrière",
      texte:"D'ici on voit tout le royaume. Pas une lumière, pas une voix : soixante ans de silence, d'un seul regard.",
      options:[
        { texte:"Regarder longtemps", effet:{xp:44}, suite:"Tu sais désormais exactement pourquoi tu montes." },
        { texte:"Détourner les yeux", effet:{hp:18}, suite:"Certaines choses se regardent après, pas avant." } ] },
    { id:"cellules", zones:[4], e:"🔒", n:"Les cellules du sous-sol", amer:true,
      texte:"Les mages y sont encore. Vieux, muets, vivants. L'un d'eux te reconnaît sans pouvoir le dire.",
      options:[
        { texte:"Leur donner tes mots", effet:{mp:-18, xp:46}, suite:"Ils te remercient. Le premier son depuis soixante ans." },
        { texte:"Continuer, et revenir après", effet:{hp:14, xp:-8}, suite:"Ils comprennent. C'est bien pire." } ] }
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
