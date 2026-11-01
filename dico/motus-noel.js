/* Événement de Noël.
   debut / fin : le décor, la rubrique du menu et le rattrapage des cases
                 sont disponibles entre ces deux dates (incluses).
   mots        : un mot par case du calendrier de l'avent (1er au 24 décembre),
                 tous présents dans le dictionnaire du jeu (6 à 8 lettres).
   recompenses : case → ce qu'elle offre à l'ouverture (mot trouvé ou non) :
                   objet   un cosmétique du chat (boutique/boutique.js)
                   croq    des croquettes pour la réserve
                   jetons  des jetons d'indice
                   traineau des tentatives pour le mode Traîneau
                   pate    une pâtée de fête (nourrit un chat deux jours)
                   emote   une émote de Duel et de Battle Royale
                   couleur une couleur d'accent du jeu
                   embleme un emblème de profil (badge)
                 Trouver le mot rapporte en plus 1 jeton d'indice.
   rattrapage  : prix, en jetons d'indice, pour rouvrir une case passée.
   seuilAube   : nombre de cases ouvertes pour qu'Aube arrive. */
window.MOTUS_NOEL = {
  "debut": "2026-12-01",
  "fin": "2027-01-06",
  "mois": "2026-12",
  "mots": ["FLOCON", "BONNET", "MOUFLES", "ECHARPE", "GLACON", "ETOILE", "EPICEA", "CLOCHE",
           "RUBANS", "PAQUET", "VERGLAS", "TRAINEAU", "RENNES", "NOUGAT", "CANNELLE", "BONHOMME",
           "PRALINE", "CHEMINEE", "MARRONS", "SOULIER", "LUMIERE", "CRECHE", "FEERIQUE", "CADEAU"],
  "recompenses": {
    "1":  { "croq": 3 },              "2":  { "jetons": 1 },             "3":  { "objet": "bonnet" },
    "4":  { "traineau": 1 },          "5":  { "croq": 3 },               "6":  { "objet": "sucreOrge" },
    "7":  { "emote": "noel" },        "8":  { "jetons": 2 },             "9":  { "objet": "boule" },
    "10": { "traineau": 2 },          "11": { "croq": 4 },               "12": { "objet": "rennes" },
    "13": { "couleur": "sapin" },     "14": { "pate": 1 },               "15": { "objet": "echarpeNoel" },
    "16": { "jetons": 2 },            "17": { "traineau": 2 },           "18": { "croq": 5 },
    "19": { "emote": "bonhomme" },    "20": { "embleme": "noel" },       "21": { "objet": "manteau" },
    "22": { "jetons": 3 },            "23": { "traineau": 3 },           "24": { "objet": "sapin", "croq": 5, "jetons": 3 }
  },
  "rattrapage": 3,
  "seuilAube": 18
};
