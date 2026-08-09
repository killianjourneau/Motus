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

  zones: [
    {
      id: "foret", nom: "Lisière des Sans-Noms", e: "🌲",
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
      id: "grotte", nom: "Grotte des Échos morts", e: "🕯️",
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
      id: "marais", nom: "Marais des Serments rompus", e: "🌫️",
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
      id: "volcan", nom: "Forge du Premier Mot", e: "🌋",
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
      id: "citadelle", nom: "Citadelle d'obsidienne", e: "🏰",
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
