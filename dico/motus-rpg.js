/* Motus Quête — données du mode RPG.
   zones   : progression du joueur, chaque zone impose ses longueurs de mots.
   monstres: pv = points de vie, atk = dégâts par tour, xp = gain à la victoire.
   Les monstres sont classés du plus faible au plus fort ; le dernier de
   chaque zone est un boss (plus de PV, plus de dégâts, plus d'XP). */
window.MOTUS_RPG = {
  zones: [
    {
      id: "foret", nom: "Forêt murmurante", e: "🌲",
      intro: "Les arbres chuchotent des mots oubliés.",
      lens: [4, 5],
      monstres: [
        { n: "Gobelin",      e: "🧌", pv: 24,  atk: 4,  xp: 12 },
        { n: "Loup gris",    e: "🐺", pv: 32,  atk: 5,  xp: 16 },
        { n: "Araignée",     e: "🕷️", pv: 38,  atk: 6,  xp: 20 },
        { n: "Corbeau",      e: "🐦‍⬛", pv: 44, atk: 7,  xp: 24 },
        { n: "Ent ancien",   e: "🌳", pv: 70,  atk: 9,  xp: 45, boss: 1 }
      ]
    },
    {
      id: "grotte", nom: "Grotte oubliée", e: "🕯️",
      intro: "Une humidité froide, et des yeux dans le noir.",
      lens: [5, 6],
      monstres: [
        { n: "Chauve-souris", e: "🦇", pv: 50,  atk: 8,  xp: 28 },
        { n: "Rat géant",     e: "🐀", pv: 58,  atk: 9,  xp: 32 },
        { n: "Serpent",       e: "🐍", pv: 66,  atk: 10, xp: 36 },
        { n: "Golem de pierre", e: "🗿", pv: 78, atk: 11, xp: 42 },
        { n: "Dragonneau",    e: "🐉", pv: 110, atk: 14, xp: 75, boss: 1 }
      ]
    },
    {
      id: "marais", nom: "Marais brumeux", e: "🌫️",
      intro: "La brume avale les sons. Et parfois les voyageurs.",
      lens: [6, 7],
      monstres: [
        { n: "Crapaud vorace", e: "🐸", pv: 86,  atk: 12, xp: 46 },
        { n: "Sangsue",        e: "🪱", pv: 94,  atk: 13, xp: 50 },
        { n: "Feu follet",     e: "🔥", pv: 102, atk: 15, xp: 56 },
        { n: "Sorcière",       e: "🧙", pv: 116, atk: 16, xp: 62 },
        { n: "Hydre",          e: "🐲", pv: 160, atk: 20, xp: 105, boss: 1 }
      ]
    },
    {
      id: "volcan", nom: "Pic volcanique", e: "🌋",
      intro: "L'air brûle. Chaque mot coûte un souffle.",
      lens: [7, 8],
      monstres: [
        { n: "Salamandre",     e: "🦎", pv: 126, atk: 18, xp: 68 },
        { n: "Harpie",         e: "🦅", pv: 138, atk: 19, xp: 74 },
        { n: "Élémentaire",    e: "☄️", pv: 150, atk: 21, xp: 82 },
        { n: "Golem de lave",  e: "🌋", pv: 168, atk: 23, xp: 90 },
        { n: "Phénix",         e: "🕊️", pv: 220, atk: 27, xp: 145, boss: 1 }
      ]
    },
    {
      id: "citadelle", nom: "Citadelle d'obsidienne", e: "🏰",
      intro: "Le dernier rempart. Les mots y sont des armes.",
      lens: [8, 10],
      monstres: [
        { n: "Spectre",         e: "👻", pv: 180, atk: 24, xp: 96 },
        { n: "Gargouille",      e: "🗿", pv: 196, atk: 26, xp: 104 },
        { n: "Chevalier noir",  e: "⚔️", pv: 212, atk: 28, xp: 112 },
        { n: "Liche",           e: "💀", pv: 234, atk: 30, xp: 124 },
        { n: "Seigneur des Mots", e: "👑", pv: 320, atk: 35, xp: 220, boss: 1 }
      ]
    }
  ],

  /* Compétences : débloquées par niveau, coûtent du mana. */
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
