# Tests

```bash
npm install        # une seule fois, pour les tests d'interface
npm test           # tout
npm run test:data  # un seul groupe : data, jeu, ui, quete
```

Le lanceur renvoie **0** si tout passe, **1** si un test échoue : utilisable tel
quel dans une intégration continue.

## Ce que couvre chaque fichier

| Fichier | Objet | Dépendance |
|---|---|---|
| `data.test.js` | Dictionnaires, thèmes, badges, versions, SQL | aucune |
| `jeu.test.js` | Évaluation des lettres, indice, modes à thème | jsdom |
| `ui.test.js` | Thèmes, notifications, statistiques, accueil | jsdom |
| `quete.test.js` | Contenu et **équilibrage** de Motus Quête | aucune |

`data.test.js` et `quete.test.js` tournent sans rien installer et couvrent
l'essentiel : commence par eux si tu es pressé.

## Pourquoi ces tests-là

Chaque test correspond à un problème **réellement survenu** sur le projet. Ce ne
sont pas des vérifications décoratives :

- **Mots légitimes supprimés** — le filtre de contenu par préfixe avait emporté
  « analphabète », le verbe « s'attarder » et « salopette ». Un signalement de
  joueur a été nécessaire pour s'en apercevoir.
- **Mots à deviner introuvables** — trois mots du mode Expert n'étaient pas dans
  le dictionnaire d'acceptation : impossibles à valider.
- **Thèmes sans notice** — 72 % des prénoms tirables n'avaient aucune étymologie,
  parce que la liste des mots *tirables* n'existait pas et que le jeu piochait
  dans la liste des mots *acceptés*.
- **Listes tronquées** — `rpc()` ne renvoie que la première ligne. Employée sur
  une fonction SQL qui en renvoie plusieurs, elle masquait silencieusement les
  propositions à valider et les défenses attaquables. Le bug a survécu plusieurs
  versions, et j'avais d'abord attribué le symptôme au faible nombre de joueurs.
- **Identifiants de badges en double** — deux badges du thème Personnages
  allaient écraser ceux des mots courts.
- **Quête infaisable** — les points de vie des monstres étaient multipliés par 13
  d'un acte à l'autre, face à des dégâts joueur quasi constants. Seule une
  simulation l'a révélé.

## Ajouter un test

Les assertions disponibles : `ok`, `egal`, `vide` (échoue si la liste n'est pas
vide, et affiche les cas fautifs).

```js
verifie("description de ce qui doit être vrai", () => {
  vide(motsFautifs, "mots hors bornes");
});
```

Pour un test d'interface, `harness.js` démarre une page dans jsdom avec des
données réduites et des services simulés. Le jeu vit dans une fonction anonyme :
le socle y injecte un `window.__t` pour rendre les fonctions internes
accessibles, **sans modifier le code de production**.

```js
const app = demarrer({
  expose: "function maFonction",       // repère le bloc <script> à instrumenter
  noms:   ["maFonction", "getEtat:()=>etat"],
  stockage: { "motus.tour": "true" }   // localStorage de départ
});
await app.attendre(150);
```

Un test asynchrone renvoie simplement une promesse : le lanceur l'attend.

## Vérifier que la suite sert à quelque chose

Un test qui ne peut pas échouer ne protège de rien. Casse volontairement quelque
chose et relance :

```bash
# remplace une couleur accessible par du rouge dans index.html, puis
npm run test:ui     # doit signaler « dark-a (couleur) » et sortir en code 1
```

## Limites assumées

Ces tests vérifient la **logique** et les **données**, pas le rendu visuel ni le
comportement réseau réel. Ils ne remplacent pas un essai sur téléphone —
notamment pour les notifications, dont le comportement dépend du système.
