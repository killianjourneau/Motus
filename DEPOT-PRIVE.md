# Passer en dépôt privé

Aujourd'hui, n'importe qui peut cliquer sur *Fork* et repartir avec l'ensemble :
413 000 mots filtrés, 2 500 notices rédigées, tout le code. Rendre le dépôt
privé est la protection la plus efficace, et elle est gratuite.

**Le point de blocage** : GitHub Pages ne publie pas depuis un dépôt privé sur
l'offre gratuite. Il faut donc changer d'hébergeur en même temps. Cloudflare
Pages fait le même travail, gratuitement, et lit **le même dépôt GitHub** — rien
à déplacer.

---

## Avant de commencer : l'adresse va changer

Aujourd'hui : `killianjourneau.github.io/Motus/`
Ensuite : `motensix.pages.dev` (ou ton propre nom de domaine)

**Les liens déjà partagés cesseront de fonctionner.** Deux façons de gérer :

**Prendre un nom de domaine** (une dizaine d'euros par an, par exemple
`motensix.fr`). C'est la seule solution qui te rend indépendant : tu pourras
changer d'hébergeur autant de fois que tu veux sans jamais casser un lien.
**Recommandé si le jeu doit durer.**

**Ou accepter la rupture**, si peu de liens circulent encore. Le jeu reste
installé sur les téléphones existants, mais ne recevra plus de mises à jour :
il faudra réinstaller depuis la nouvelle adresse.

> Le jeu s'adapte tout seul à sa nouvelle adresse : les liens de partage, de
> défense et de récupération de compte sont désormais calculés à partir de
> l'adresse réelle. Aucune modification de code n'est nécessaire.

---

## Étape 1 — Créer le projet Cloudflare

1. Créer un compte sur **dash.cloudflare.com** (gratuit)
2. Menu de gauche → **Workers & Pages** → **Create** → onglet **Pages**
3. **Connect to Git** → autoriser GitHub → choisir le dépôt **Motus**
4. Réglages de compilation :

| Champ | Valeur |
|---|---|
| Framework preset | *None* |
| Build command | *(laisser vide)* |
| Build output directory | `/` |

5. **Save and Deploy**

Une à deux minutes plus tard, le jeu est en ligne sur `…pages.dev`. **Vérifie
qu'il fonctionne avant de continuer.**

## Étape 2 — Rendre le dépôt privé

Une fois Cloudflare opérationnel :

**Settings** → tout en bas, *Danger Zone* → **Change repository visibility** →
**Make private** → confirmer.

Cloudflare garde l'accès : l'autorisation donnée à l'étape 1 reste valable.

> GitHub Pages s'arrêtera. C'est attendu — Cloudflare a pris le relais.

## Étape 3 — Nettoyer les automatismes

`publication.yml` ne sert plus à rien : Cloudflare publie tout seul à chaque
enregistrement. **Supprime-le** pour éviter des échecs sans conséquence mais
déroutants.

Conserve `verification.yml` et `nouvelle-version.yml` : les tests et la bascule
de version restent utiles, et fonctionnent sur dépôt privé.

## Étape 4 — Le nom de domaine (facultatif)

Dans le projet Cloudflare → **Custom domains** → **Set up a domain**.

Si le domaine est acheté chez Cloudflare, tout est automatique. Sinon, il
indique les deux lignes à recopier chez ton registraire.

Le certificat HTTPS est fourni et renouvelé sans rien faire.

---

## Ce que tu gagnes au passage

**Le contrôle du cache.** Le fichier `_headers` du dépôt, jusqu'ici ignoré par
GitHub Pages, devient actif. Fini le `sw.js` gardé en mémoire qui empêche une
mise à jour d'arriver — le défaut le plus pénible à diagnostiquer.

**Les aperçus par branche.** Chaque branche reçoit sa propre adresse : tu peux
essayer une modification sur un vrai téléphone avant de la publier.

**Des statistiques d'hébergement** — visites, pays, temps de réponse — qui
complètent la mesure interne du jeu.

---

## Ce qui ne change pas

Ta façon de travailler : déposer les fichiers sur GitHub, puis
*Actions → Nouvelle version*. Cloudflare suit automatiquement.

Supabase n'est pas concerné : la base reste où elle est.
