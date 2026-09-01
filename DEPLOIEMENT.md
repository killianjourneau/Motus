# Déploiement

Tout se fait **depuis le site GitHub, dans le navigateur**. Aucun logiciel à
installer, aucune commande à taper.

---

## Mettre le jeu à jour — la marche à suivre

### 1. Déposer les fichiers

Sur la page du dépôt : bouton **Add file** → **Upload files**, puis glisser les
fichiers modifiés.

> Pour déposer dans un sous-dossier (`dico/`, `tests/`…), ouvre d'abord ce
> dossier sur GitHub, **puis** fais *Add file → Upload files*. Sinon le fichier
> atterrit à la racine.

Écris une courte description en bas, puis **Commit changes**.

### 2. Créer la nouvelle version

Onglet **Actions** → dans la colonne de gauche, **Nouvelle version** → bouton
**Run workflow** → choisir l'ampleur → **Run workflow**.

| Choix | Quand | Effet |
|---|---|---|
| `corrige` | une correction | 1.50.2 → 1.50.3 |
| `mineure` | un ajout | 1.50.2 → 1.51.0 |
| `majeure` | une refonte | 1.50.2 → 2.0.0 |

C'est tout. GitHub s'occupe du reste : il aligne les numéros de version partout,
lance les tests, et met le jeu en ligne si tout est vert.

**Compte une à deux minutes**, puis rafraîchis le jeu.

### Pourquoi cette deuxième étape est indispensable

Sans elle, tes modifications partent en ligne mais **les joueurs ne les voient
pas** : leur navigateur continue de servir la version qu'il a en mémoire. La
bascule de version change le nom du cache, ce qui force le renouvellement.

C'est l'erreur la plus fréquente, et la plus déroutante : « j'ai bien déposé mes
fichiers, mais rien n'a changé ».

---

## Lire le résultat

Onglet **Actions**. Chaque ligne est une exécution :

- **coche verte** — tout est bon, le jeu est à jour
- **point orange** — en cours, patiente
- **croix rouge** — quelque chose cloche, rien n'a été mis en ligne

En cas de croix rouge : clique dessus, puis sur l'étape en rouge. Le message
indique ce qui ne va pas. **Le jeu en ligne n'a pas bougé** — les joueurs ne
voient rien de cassé, tu peux corriger tranquillement.

---

## Réglage à faire une seule fois

**Settings** → **Pages** → section *Build and deployment* → **Source** :
choisir **GitHub Actions** (au lieu de *Deploy from a branch*).

Sans ce réglage, les tests tournent mais rien n'est publié.

---

## Ce que font les trois automatismes

| Fichier | Quand | Rôle |
|---|---|---|
| `verification.yml` | à chaque dépôt | lance les tests |
| `nouvelle-version.yml` | sur ton bouton | bascule la version, teste, enregistre |
| `publication.yml` | après enregistrement | met en ligne **si les tests passent** |

Le point important : `publication` dépend de `verification`. **Un test rouge
bloque la mise en ligne.** C'est le garde-fou qui n'existait pas avant.

Les dossiers `tests/`, `scripts/` et `.github/` restent dans le dépôt mais ne
sont **pas** publiés : les joueurs reçoivent le jeu, rien d'autre.

---

## Quand la base de données doit aussi être mise à jour

Certaines évolutions touchent Supabase (nouvelle table, nouvelle fonction). Dans
ce cas — et seulement dans ce cas — il faut en plus :

1. Ouvrir son projet Supabase → **SQL Editor**
2. Coller tout le contenu de `duel/schema.sql`
3. **Run**

Le script est rejouable : le relancer ne casse rien. Si tu oublies, le jeu
affiche un message explicite disant que la base n'est pas à jour.

---

## Si ça coince

**« J'ai déposé mes fichiers, rien n'a changé »** — l'étape 2 a été oubliée.
Lance *Nouvelle version*.

**Croix rouge sur *Nouvelle version*** — un test a échoué. La version n'a pas été
enregistrée, le jeu en ligne est intact. Lis le message d'erreur.

**Une fonctionnalité marche mal en ligne** — le plus souvent `duel/schema.sql`
n'a pas été rejoué après une mise à jour touchant la base.

---

## Pour plus tard : changer d'hébergement

GitHub Pages convient très bien aujourd'hui. Deux limites apparaîtront si le jeu
grandit : le dépôt doit rester **public** (donc copiable), et les en-têtes de
cache ne sont pas réglables — le fichier `_headers` de ce dépôt est ignoré.

Cloudflare Pages lève les deux, gratuitement, en lisant le **même dépôt GitHub** :
rien à déplacer, on branche et on change le nom de domaine. À envisager le jour
où ces limites gênent, pas avant.
