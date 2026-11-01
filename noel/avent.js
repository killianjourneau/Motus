/* Mot en Six — le calendrier de l'avent
 *
 * Du 1er au 24 décembre, une case par jour, la même pour tout le monde :
 * un mot de Noël à trouver en 6 essais (le jeu lui-même est dans index.html,
 * mode « avent »). Chaque case ouverte — mot trouvé ou non — offre sa
 * récompense (croquettes, jetons, cosmétique, tentatives de Traîneau,
 * émote…) ; trouver le mot rapporte en plus un jeton d'indice.
 * Une case manquée se rattrape contre quelques jetons, jusqu'à la fin de
 * l'événement. Au bout de 18 cases ouvertes, Aube, une chatte blanche,
 * rejoint la grille.
 *
 * Tout l'état tient dans les objets de la boutique (voir l'en-tête de
 * boutique/boutique.js) : il se synchronise entre appareils sans rien de
 * plus, et un rattrapage n'est jamais payé deux fois.
 *
 * Données : dico/motus-noel.js (dates, mots, cadeaux, prix, seuil d'Aube).
 */
(function () {
  "use strict";
  var N = window.MOTUS_NOEL;
  if (!N) return;
  var P = function () { return window.MotusPont || {}; };

  /* ---------- dates ---------- */
  var apercuDate = null, bac = null;      // aperçu (administration) : date simulée, rien d'enregistré
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function aujourdhui() {
    if (apercuDate) return apercuDate;
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function actif() { var j = aujourdhui(); return j >= N.debut && j <= N.fin; }
  function jourCase(n) { return N.mois + "-" + pad(n); }
  // case du jour (1 à 24), 0 hors des 24 premiers jours de décembre
  function caseDuJour() {
    var j = aujourdhui();
    if (j.slice(0, 7) !== N.mois) return 0;
    var d = +j.slice(8, 10);
    return d >= 1 && d <= 24 ? d : 0;
  }
  // dernière case déjà « arrivée » au calendrier
  function derniere() {
    var j = aujourdhui();
    if (!actif() || j < N.mois + "-01") return 0;
    if (j.slice(0, 7) > N.mois) return 24;
    return Math.min(24, +j.slice(8, 10));
  }

  /* ---------- état : les objets de la boutique ---------- */
  function objets() { return bac || (window.Boutique ? Boutique.etat.objets : {}); }
  function cle(n, suf) { return "avent-" + pad(n) + (suf || ""); }
  function etatCase(n) {
    var o = objets();
    if (cle(n, "-j") in o) return (cle(n, "-ok") in o) ? "trouvee" : "ouverte";
    if (n > derniere()) return "futur";
    if (n === caseDuJour()) return "jour";
    if (cle(n) in o) return "debloquee";
    return "manquee";
  }
  function jouable(n) { var e = etatCase(n); return e === "jour" || e === "debloquee"; }
  function ouvertes() { var c = 0; for (var n = 1; n <= 24; n++) if (cle(n, "-j") in objets()) c++; return c; }
  function aubeLa() { return bac ? ("aube" in bac) : !!(window.Boutique && Boutique.etat.objets && ("aube" in Boutique.etat.objets)); }
  // le portrait d'Aube (dessin du chat s'il est chargé, sinon un cœur blanc)
  function portraitAube() { return window.ChatNoir && ChatNoir.vignette ? ChatNoir.vignette("aube") : "🤍"; }
  function nomObjet(id) {
    var o = window.Boutique && Boutique.catalogue.filter(function (x) { return x.id === id; })[0];
    return o ? o.nom : id;
  }
  function marquer(k) {
    if (bac) { bac[k] = 0; return; }
    if (window.Boutique) Boutique.offrir(k);
  }

  /* ---------- récompenses ---------- */
  var NOMS_EMOTES = { noel: "🎅 « Joyeux Noël ! »", bonhomme: "⛄ « Bonhomme de neige »" };
  var NOMS_COULEURS = { sapin: "Vert sapin" };
  var NOMS_EMBLEMES = { noel: "🎄 Esprit de Noël" };
  function recompense(n) { return (N.recompenses || {})[String(n)] || {}; }
  // l'icône principale d'une case (sur la case fermée, pour donner envie)
  function icone(r) {
    return r.objet ? "🎁" : r.croq ? "🐟" : r.jetons ? "💡" : r.traineau ? "🛷" : r.pate ? "🍖"
         : r.emote ? "💬" : r.couleur ? "🎨" : r.embleme ? "🎖️" : "";
  }
  function pluriel(n, mot) { return n + " " + mot + (n > 1 ? "s" : ""); }
  // la liste lisible de ce que contient une case
  function textes(r) {
    var l = [];
    if (r.objet) l.push("🎁 " + nomObjet(r.objet));
    if (r.croq) l.push("🐟 " + pluriel(r.croq, "croquette"));
    if (r.jetons) l.push("💡 " + pluriel(r.jetons, "jeton") + " d'indice");
    if (r.traineau) l.push("🛷 " + pluriel(r.traineau, "tentative") + " de Traîneau");
    if (r.pate) l.push("🍖 " + (r.pate > 1 ? r.pate + " pâtées" : "Une pâtée") + " de fête");
    if (r.emote) l.push("💬 L'émote " + (NOMS_EMOTES[r.emote] || r.emote));
    if (r.couleur) l.push("🎨 La couleur « " + (NOMS_COULEURS[r.couleur] || r.couleur) + " »");
    if (r.embleme) l.push("🎖️ L'emblème " + (NOMS_EMBLEMES[r.embleme] || r.embleme));
    return l;
  }
  /* Donne la récompense de la case n. Chaque part a sa clé (« avent-07 ») :
     rien n'est jamais donné deux fois, ni sur deux appareils. */
  function donner(n) {
    var r = recompense(n), k = "avent-" + pad(n), B = window.Boutique;
    if (bac) { bac["recu-" + k] = 0; return; }
    if (r.objet) marquer(r.objet);
    if (r.emote) marquer("emote:" + r.emote);
    if (r.couleur) marquer("couleur:" + r.couleur);
    if (r.embleme) marquer("embleme:" + r.embleme);
    if (r.croq && B && B.gagnerCroquettes) B.gagnerCroquettes(k, r.croq);
    if (r.traineau && B && B.bonus) B.bonus(k + ":traineau", { traineau: r.traineau });
    if (r.pate && B && B.bonus) B.bonus(k + ":pate", { pate: r.pate });
    if (r.jetons && P().jetonsCadeau) P().jetonsCadeau(k, r.jetons);
  }

  /* Fin d'une case (appelé par le jeu). Renvoie le texte à afficher sous le
     résultat : cadeau reçu, arrivée d'Aube. Sans effet si la case était déjà
     ouverte (autre appareil) : les cadeaux ne s'offrent qu'une fois. */
  function terminer(n, gagne) {
    var dejaJouee = cle(n, "-j") in objets();
    marquer(cle(n, "-j"));
    if (gagne) marquer(cle(n, "-ok"));
    var lignes = [], r = recompense(n), t = textes(r);
    donner(n);
    if (t.length) lignes.push("Dans la case " + n + " : <b>" + t.join(" · ") + "</b>" + (dejaJouee ? " (déjà reçu)" : ""));
    if (r.traineau) lignes.push("<small>Le Traîneau arrive bientôt : tes tentatives t'attendent.</small>");
    var nb = ouvertes(), arrivee = false;
    if (nb >= N.seuilAube && !aubeLa()) {
      marquer("aube"); arrivee = true;
      if (bac && window.Boutique && Boutique.apercuAube) Boutique.apercuAube(true);
      lignes.push("🤍 <b>Aube</b>, une chatte blanche, a rejoint ta grille !");
      setTimeout(function () { if (P().toast) P().toast("🤍 Aube a rejoint ta grille !", 3600); }, 900);
    } else if (!aubeLa()) {
      var reste = N.seuilAube - nb;
      lignes.push("🤍 Encore " + reste + " case" + (reste > 1 ? "s" : "") + " avant l'arrivée d'Aube");
    }
    if (P().mesure) P().mesure("bq:avent");
    if (ov && ov.classList.contains("open")) rendre();
    return { texte: lignes.join("<br>"), aube: arrivee, recompense: r };
  }

  /* ---------- la fenêtre ---------- */
  // les cases dans le désordre, comme sur un vrai calendrier (toujours le même)
  var ORDRE = [7, 15, 2, 21, 11, 4, 18, 9, 24, 13, 1, 20, 5, 16, 10, 23, 3, 12, 19, 8, 14, 22, 6, 17];
  var CSS = [
    "#aventOverlay .modal{max-width:470px;padding:20px 14px 16px;}",
    ".av-tete{text-align:center;margin:-2px 0 10px;color:var(--ink-dim);font-size:13.5px;line-height:1.45;}",
    ".av-aube{display:flex;align-items:center;gap:10px;background:var(--cell);border-radius:13px;padding:9px 12px;margin:0 0 12px;box-shadow:inset 0 0 0 1.5px var(--cell-edge);}",
    ".av-aube .e{font-size:24px;width:46px;height:34px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;}",
    ".av-aube .e svg{width:46px;height:34px;overflow:visible;}",
    ".av-aube div{flex:1;font-size:13px;line-height:1.35;}",
    ".av-aube b{display:block;font-size:14px;}",
    ".av-jauge{height:6px;border-radius:4px;background:var(--bg);overflow:hidden;margin-top:5px;}",
    ".av-jauge i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#9fd3ff,#fff);}",
    ".av-grille{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;}",
    ".av-case{position:relative;aspect-ratio:1/1.05;border:none;border-radius:12px;cursor:pointer;padding:4px;color:#fff;overflow:hidden;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:inherit;" +
      "background:linear-gradient(160deg,#c62a3c,#8e1527);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.14),0 2px 5px rgba(0,0,0,.25);}",
    ".av-case:nth-child(3n+2){background:linear-gradient(160deg,#1f8a4c,#105c31);}",
    ".av-case:nth-child(4n+3){background:linear-gradient(160deg,#2a5aa8,#183a75);}",
    // ruban doré en croix sur les cases fermées
    ".av-case.ferme::before,.av-case.ferme::after{content:'';position:absolute;background:rgba(242,194,48,.45);}",
    ".av-case.ferme::before{left:0;right:0;top:46%;height:5px;} .av-case.ferme::after{top:0;bottom:0;left:46%;width:5px;}",
    ".av-case .n{position:relative;z-index:1;font-weight:900;font-size:22px;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,.4);}",
    ".av-case .s{position:relative;z-index:1;font-size:10.5px;font-weight:700;line-height:1.15;text-align:center;opacity:.95;}",
    ".av-case .c{position:absolute;right:4px;top:3px;font-size:12px;z-index:1;}",
    ".av-case.futur{filter:saturate(.55) brightness(.75);cursor:default;}",
    // la récompense à venir se voit bien : elle donne envie de revenir
    ".av-case.futur .s{font-size:17px;line-height:1;background:rgba(0,0,0,.28);border-radius:9px;padding:2px 5px;filter:brightness(1.35);}",
    ".av-case.jour{box-shadow:inset 0 0 0 2px #f2c230,0 0 14px rgba(242,194,48,.55);animation:avJour 1.8s ease-in-out infinite;}",
    "@keyframes avJour{50%{box-shadow:inset 0 0 0 2px #f2c230,0 0 22px rgba(242,194,48,.85);}}",
    ".av-case.manquee .s{background:rgba(0,0,0,.28);border-radius:8px;padding:2px 6px;}",
    ".av-case.confirme{background:#1f9d55 !important;}",
    // ouverte : on voit l'intérieur, et le mot
    ".av-case.trouvee,.av-case.ouverte{background:var(--cell) !important;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--cell-edge);}",
    ".av-case.trouvee .n,.av-case.ouverte .n{font-size:13px;color:var(--ink-dim);text-shadow:none;}",
    ".av-case .m{position:relative;z-index:1;font-weight:800;font-size:10.5px;letter-spacing:.3px;word-break:break-all;line-height:1.1;text-align:center;}",
    ".av-case.ouverte .m{color:var(--ink-dim);}",
    ".av-pied{text-align:center;color:var(--ink-dim);font-size:12px;line-height:1.5;margin-top:12px;}",
    ".av-apercu{background:#7a4dd8;color:#fff;border-radius:10px;padding:6px 10px;font-size:12.5px;font-weight:700;text-align:center;margin:-4px 0 10px;}",
    "@media (prefers-reduced-motion: reduce){.av-case.jour{animation:none;}}"
  ].join("\n");

  var ov = null, confirmer = 0, minuterie = 0;
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function construire() {
    if (ov) return;
    if (!document.getElementById("avStyle")) { var st = el("style"); st.id = "avStyle"; st.textContent = CSS; document.head.appendChild(st); }
    ov = el("div", "overlay");
    ov.id = "aventOverlay";
    ov.innerHTML = '<div class="modal" role="dialog" aria-label="Calendrier de l\'avent"><button class="close-x" aria-label="Fermer">&times;</button><div class="av-corps"></div></div>';
    document.body.appendChild(ov);
    ov.querySelector(".close-x").addEventListener("click", fermer);
    ov.addEventListener("click", function (e) { if (e.target === ov) fermer(); });
    ov.querySelector(".av-corps").addEventListener("click", surClic);
  }
  function fermer() { confirmer = 0; if (ov) ov.classList.remove("open"); }
  function ouvrir() {
    construire();
    if (P().fermerTout) P().fermerTout();
    confirmer = 0;
    ov.classList.add("open");
    rendre();
    if (P().mesure) P().mesure("bq:calendrier", true);
  }

  function rendre() {
    var corps = ov.querySelector(".av-corps"), nb = ouvertes(), h = "";
    h += '<h2>🗓️ Calendrier de l\'avent</h2>';
    if (bac) h += '<div class="av-apercu">Aperçu du ' + aujourdhui().split("-").reverse().join("/") + ' — rien n\'est enregistré</div>';
    var cj = caseDuJour();
    h += '<p class="av-tete">' + (cj ? "La case <b>" + cj + "</b> t'attend : un mot de Noël en 6 essais." : derniere() >= 24
          ? "Les 24 cases sont arrivées. Les cases manquées se rattrapent jusqu'au " + N.fin.split("-").reverse().slice(0, 2).join("/") + "."
          : "Une case à ouvrir chaque jour, du 1er au 24 décembre.") +
         '<br>' + nb + ' case' + (nb > 1 ? "s" : "") + ' ouverte' + (nb > 1 ? "s" : "") + ' sur 24</p>';
    if (aubeLa()) {
      h += '<div class="av-aube"><span class="e">' + portraitAube() + '</span><div><b>Aube est arrivée !</b>Elle vit au-dessus de ta grille' +
           (window.Boutique && Boutique.possede && Boutique.possede("chat") ? ", avec Minuit." : ".") + '</div></div>';
    } else {
      var part = Math.min(100, Math.round(nb / N.seuilAube * 100));
      h += '<div class="av-aube"><span class="e">' + portraitAube() + '</span><div><b>Aube arrive à ' + N.seuilAube + ' cases</b>' +
           'Une chatte blanche, qui rejoindra ta grille' + (window.Boutique && Boutique.possede && Boutique.possede("chat") ? " et Minuit" : "") + '.' +
           '<div class="av-jauge"><i style="width:' + part + '%"></i></div></div></div>';
    }
    h += '<div class="av-grille">' + ORDRE.map(caseHtml).join("") + '</div>';
    h += '<p class="av-pied">Chaque case cache une récompense : touche-la pour la voir. Trouver le mot rapporte en plus 1 jeton d\'indice.<br>' +
         'Une case manquée se rattrape pour 💡 ' + N.rattrapage + ' jetons.</p>';
    corps.innerHTML = h;
  }
  function caseHtml(n) {
    var e = etatCase(n), ic = icone(recompense(n)), s = "", ferme = e !== "trouvee" && e !== "ouverte";
    if (e === "futur") s = ic;
    else if (e === "jour") s = "Aujourd'hui";
    else if (e === "debloquee") s = "▶ Jouer";
    else if (e === "manquee") s = confirmer === n ? "Confirmer · 💡 " + N.rattrapage : "💡 " + N.rattrapage;
    var mot = !ferme ? '<span class="m">' + N.mots[n - 1] + '</span>' : "";
    return '<button class="av-case ' + e + (ferme ? " ferme" : "") + (confirmer === n ? " confirme" : "") + '" data-case="' + n + '"' +
           ' aria-label="Case ' + n + '">' +
           (ferme && e !== "futur" && ic ? '<span class="c">' + ic + '</span>' : "") +
           '<span class="n">' + n + '</span>' + mot +
           (e === "trouvee" ? '<span class="s">✓</span>' : e === "ouverte" ? '<span class="s">✗</span>' : s ? '<span class="s">' + s + '</span>' : "") +
           '</button>';
  }
  function payerCase(n) {
    if (bac) { bac[cle(n)] = N.rattrapage; return true; }
    return !!(window.Boutique && Boutique.payer && Boutique.payer(cle(n), N.rattrapage));
  }
  function surClic(ev) {
    var b = ev.target.closest("[data-case]"); if (!b) return;
    var n = +b.dataset.case, e = etatCase(n), toast = P().toast || function () {};
    if (e === "futur") {
      var tf = textes(recompense(n));
      toast("Le " + n + " décembre" + (tf.length ? " : " + tf.join(" · ") : "") + " 🎄", 3000); return;
    }
    if (e === "trouvee" || e === "ouverte") {
      var tx = textes(recompense(n));
      toast("Case " + n + " : " + N.mots[n - 1] + (tx.length ? " · " + tx.join(" · ") : ""), 3000); return;
    }
    if (e === "manquee") {
      var solde = bac ? 99 : (P().jetons ? P().jetons() : 0);
      if (solde < N.rattrapage) { toast("Il te manque " + (N.rattrapage - solde) + " jeton" + (N.rattrapage - solde > 1 ? "s" : "") + " 💡 pour rattraper cette case", 2400); return; }
      // deux temps : on ne dépense jamais de jetons sur un toucher maladroit
      if (confirmer !== n) {
        confirmer = n; rendre();
        clearTimeout(minuterie);
        minuterie = setTimeout(function () { if (confirmer === n) { confirmer = 0; if (ov.classList.contains("open")) rendre(); } }, 3500);
        return;
      }
      confirmer = 0;
      if (!payerCase(n)) { toast("Il te manque des jetons 💡", 2200); rendre(); return; }
      if (P().majJetons) P().majJetons();
    }
    fermer();
    if (P().jouerAvent) P().jouerAvent(n);
  }

  /* ---------- API ---------- */
  window.Avent = {
    actif: actif,
    caseDuJour: caseDuJour,
    jourCase: jourCase,
    etatCase: etatCase,
    jouable: jouable,
    ouvertes: ouvertes,
    terminer: terminer,
    ouvrir: ouvrir,
    fermer: fermer,
    get enApercu() { return !!bac; },
    // la date simulée de l'aperçu (null hors aperçu) : Halloween s'y aligne aussi
    get dateApercu() { return apercuDate; },
    // la case du jour est-elle faite ? (pastille du menu)
    faitAujourdhui: function () { var c = caseDuJour(); return !c || cle(c, "-j") in objets(); },
    /* Aperçu (administration) : simule une date de l'événement, sans rien
       enregistrer (cadeaux, rattrapages et Aube restent dans un bac à sable).
       Avent.apercu(null) revient à la normale. */
    apercu: function (date) {
      apercuDate = date || null;
      bac = date ? {} : null;
      if (window.Boutique && Boutique.apercuAube) Boutique.apercuAube(false);
      if (P().noelRafraichir) P().noelRafraichir();
      if (ov && ov.classList.contains("open")) rendre();
    }
  };
})();
