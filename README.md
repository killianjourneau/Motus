# Mot en Six

Jeu de mots en français : trouver le mot caché en six essais. Application web
installable, jouable hors-ligne, sans framework — HTML, CSS et JavaScript
uniquement.

**Jouer :** https://killianjourneau.github.io/Motus/

## Ce que contient le jeu

| | |
|---|---|
| **Solo** | Mot du jour, Défi du jour (3 mots en 15 min), Court / Normal / Long, Expert, Pendu |
| **Thèmes** | Prénoms, Villes, Maladies, Personnages — chacun avec une notice en fin de partie |
| **Multijoueur** | Duel (avec classement Elo), Course, Défense asynchrone |
| **Aventure** | Mot en Six Quête : 5 actes, carte à embranchements, reliques et compétences |
| **Enfants** | Mot en Six Junior : 4 jeux sans lecture, 3 niveaux |

Profil avec XP, niveaux, 117 badges, classement mondial et synchronisation entre
appareils.

## Déployer

Le jeu est **entièrement statique** : déposer les fichiers sur n'importe quel
hébergement suffit (GitHub Pages, Netlify, un simple dossier servi en HTTPS).

> **HTTPS obligatoire** — le service worker et les notifications ne fonctionnent
> pas en HTTP, sauf sur `localhost`.

### Sans base de données

Ça marche tel quel : laisser `profiles/config.js` vide. Le profil, les statistiques
et les records restent sur l'appareil. Duel, Course et Défense sont alors
indisponibles.

### Avec base de données (Supabase)

1. Créer un projet Supabase.
2. **Exécuter `duel/schema.sql`** dans le SQL Editor. Le script est rejouable :
   on peut le relancer après chaque mise à jour sans rien casser.
3. Renseigner `profiles/config.js` avec l'URL du projet et la clé `anon public`
   (Settings → API). Cette clé est **publique par nature**, sa présence dans le
   dépôt est normale.

> La sécurité repose donc entièrement sur les règles d'accès de la base (RLS).
> Vérifier que la protection est bien active sur toutes les tables :
>
> ```sql
> select tablename, rowsecurity from pg_tables where schemaname = 'public';
> ```
>
> `rowsecurity` doit valoir `true` partout. Presque tout passe par des fonctions
> `security definer` ; seules `profiles` et `daily_results` sont écrites
> directement par le navigateur et méritent une attention particulière.

### Se déclarer modérateur

Les joueurs peuvent proposer de nouveaux mots, mais rien n'entre dans le jeu sans
validation. Pour obtenir le bouton de modération, s'inscrire **une fois** :

```sql
insert into app_admins(player_id) values ('<votre-uuid-de-profil>');
```

L'identifiant se lit dans la console du navigateur :
`JSON.parse(localStorage.getItem('motus.profile')).id`

## Mettre à jour

Trois valeurs doivent rester alignées, sinon les navigateurs continuent de servir
l'ancienne version :

| Où | Quoi |
|---|---|
| `index.html` | `const VERSION = "x.y.z"` et tous les `?v=x.y.z` |
| `sw.js` | `const V = "x.y.z"` |
| `sw.js` | `const CACHE = "motus-vNN"` — **à incrémenter à chaque fois** |

Le nom du cache doit changer **même quand seul un `.txt` a été modifié** : sans
ça les dictionnaires ne sont pas re-téléchargés. Un test automatique vérifie cet
alignement.

## Tests

```bash
npm install     # une seule fois, pour les tests d'interface
npm test        # code de sortie 0 si tout passe, 1 sinon
```

Voir [`tests/README.md`](tests/README.md). Chaque test correspond à un bug ayant
réellement eu lieu : lancer la suite avant chaque déploiement évite de les
réintroduire.

## Organisation

```
index.html        jeu principal (modes solo, thèmes, duel, course, défense)
rpg.html          Mot en Six Quête
enfant.html       Mot en Six Junior
sw.js             service worker : cache et fonctionnement hors-ligne
manifest.json     installation sur l'écran d'accueil
dico/             dictionnaires (413 000 mots) et données des thèmes
duel/             schema.sql (base) et duel.js (client réseau)
profiles/         profil, badges, classement, synchronisation
tests/            suite de tests automatisés
```

### Dictionnaires

Deux niveaux à ne pas confondre :

- **Mots acceptés** — `dico/dico-04.txt` à `dico-15.txt`, ce qu'on a le droit de
  taper. Fichiers triés, un mot par ligne, majuscules sans accent.
- **Mots à deviner** — `motus-words.js`, `motus-expert.js`, et les listes `*_SOL`
  des thèmes. Toujours un sous-ensemble des mots acceptés.

Un mot à deviner absent du dictionnaire d'acceptation serait **impossible à
valider** : un test le vérifie.

Pour les thèmes, un mot n'est tirable que s'il possède une notice. Sans elle, il
reste acceptable à la saisie mais ne sortira jamais comme réponse.
