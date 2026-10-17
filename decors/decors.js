/* Mot en Six — moteur des décors
 *
 * Un décor = un fichier dans ce dossier (decors/halloween.js, decors/noel.js…).
 * Le jeu ne charge un décor que lorsqu'il en a besoin : en ajouter dix ne
 * ralentit pas le démarrage.
 *
 * ── Créer un nouveau décor ───────────────────────────────────────────────
 *  1. Copier decors/halloween.js sous un nouveau nom, par exemple noel.js.
 *  2. Dans ce fichier, changer  nom: "halloween"  en  nom: "noel",
 *     puis les couleurs (css) et le dessin (scene).
 *  3. Ajouter "./decors/noel.js?v=" + V à la liste du cache, dans sw.js,
 *     pour qu'il fonctionne hors ligne.
 *  4. Dans le jeu : Decors.activer("noel")  /  Decors.retirer().
 *
 * ── Ce que fait le moteur, pour tous les décors ─────────────────────────
 *  - ajoute la classe du décor sur <html> (ex. :root.noel) pour les couleurs ;
 *  - place la scène derrière toute l'interface, jamais cliquable ;
 *  - la masque en thème clair ;
 *  - la fige pour qui a demandé moins d'animations à son téléphone.
 */
(function () {
  // même ?v= que ce fichier : un nouveau numéro de version recharge aussi les décors
  const moi = document.currentScript && document.currentScript.src || "";
  const base = moi.replace(/decors\.js.*$/, "");
  const v = (moi.match(/\?v=[\d.]+/) || [""])[0];

  const connus = {};          // décors déjà chargés
  let voulu = null;           // décor demandé (peut arriver avant la fin du chargement)
  let actif = null;           // décor réellement affiché

  // règles communes à tous les décors
  const commun = document.createElement("style");
  commun.textContent =
    "#decorScene{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;}" +
    ":root[data-theme=\"light\"] #decorScene{display:none;}" +
    "@media (prefers-reduced-motion: reduce){#decorScene *,#decorScene *::before,#decorScene *::after{animation:none !important;}}";
  document.head.appendChild(commun);

  function afficher(d) {
    retirerScene();
    actif = d.nom;
    if (d.css && !document.getElementById("decor-css-" + d.nom)) {
      const s = document.createElement("style");
      s.id = "decor-css-" + d.nom;
      s.textContent = d.css;
      document.head.appendChild(s);
    }
    document.documentElement.classList.add(d.nom);
    if (d.scene) {
      const sc = document.createElement("div");
      sc.id = "decorScene";
      sc.setAttribute("aria-hidden", "true");
      sc.innerHTML = d.scene();
      document.body.prepend(sc);
    }
  }

  function retirerScene() {
    if (actif) document.documentElement.classList.remove(actif);
    const sc = document.getElementById("decorScene");
    if (sc) sc.remove();
    actif = null;
  }

  window.Decors = {
    /* appelé par chaque fichier de décor */
    enregistrer(d) {
      connus[d.nom] = d;
      if (voulu === d.nom) afficher(d);
    },

    activer(nom) {
      voulu = nom;
      if (actif === nom) return;
      if (connus[nom]) { afficher(connus[nom]); return; }
      if (document.querySelector('script[data-decor="' + nom + '"]')) return;   // déjà en route
      const s = document.createElement("script");
      s.src = base + nom + ".js" + v;
      s.dataset.decor = nom;
      s.onerror = () => { s.remove(); };      // hors ligne et pas en cache : pas de décor, rien de cassé
      document.head.appendChild(s);
    },

    retirer() {
      voulu = null;
      retirerScene();
    },

    get actif() { return actif; }
  };
})();
