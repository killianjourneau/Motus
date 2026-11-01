/* Mot en Six — le Traîneau (Noël)
 *
 * Un traîneau file sur une piste enneigée à trois couloirs. Des obstacles
 * arrivent, chacun portant un mot : on TAPE le mot pour le faire exploser, ou
 * on CHANGE DE COULOIR pour l'éviter (flèches ← →, glisser le doigt, ou les
 * boutons ◀ ▶). Des cadeaux se ramassent en passant dessus. Trois vies ; la
 * vitesse monte et les mots s'allongent avec la distance.
 *
 * Trois sortes de courses :
 *  - la course du jour : une par jour, gratuite ;
 *  - les tentatives bonus : gagnées dans le calendrier de l'avent ;
 *  - l'entraînement : illimité, ne compte pas.
 * Seules les deux premières comptent : XP, jeton d'indice du jour (au-delà
 * d'un score), badges, et le classement des records de la saison.
 *
 * Le jeu (mode « traineau ») est préparé par index.html, qui confie ensuite
 * tout ici : zone de jeu, saisie, couloirs, fin de course.
 * Données : dico/motus-noel.js (mots, saison, seuil du jeton).
 */
(function () {
  "use strict";
  var N = window.MOTUS_NOEL;
  if (!N || !N.traineau) return;
  var C = N.traineau;
  var P = function () { return window.MotusPont || {}; };

  /* ---------- dates, état du jour ---------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function jour() {
    if (window.Avent && Avent.dateApercu) return Avent.dateApercu;
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function actif() { var j = jour(); return j >= N.debut && j <= N.fin; }
  function apercu() { return !!(window.Avent && Avent.enApercu); }
  function lire(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (x) { return d; } }
  function ecrire(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (x) {} }
  var CLE_JOUR = "motus.traineau", CLE_RECORD = "motus.traineau.record";
  function etatJour() { var e = lire(CLE_JOUR, null); return e && e.day === jour() ? e : null; }
  function record() { return +lire(CLE_RECORD, 0) || 0; }

  /* tentatives bonus : celles du calendrier, moins celles déjà courues (les
     deux tenues par la boutique, donc synchronisées entre appareils) */
  function bonusDispo() {
    if (apercu()) return 3;
    return window.Boutique && Boutique.totalBonus ? Math.max(0, Boutique.totalBonus("traineau")) : 0;
  }
  function consommerBonus() {
    if (apercu()) return true;
    if (bonusDispo() <= 0 || !window.Boutique || !Boutique.bonus) return false;
    return Boutique.bonus("course:traineau:" + Date.now() + ":" + Math.floor(Math.random() * 1e6), { traineau: -1 });
  }

  /* ---------- style ---------- */
  var CSS = [
    "#trBox{display:none;flex-direction:column;gap:6px;padding:4px 2px;position:relative;align-self:stretch;width:100%;max-width:520px;margin:0 auto;flex:1;min-height:0;}",
    ".tr-hud{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:15px;padding:0 4px;}",
    ".tr-zone{position:relative;overflow:hidden;border-radius:14px;touch-action:none;user-select:none;-webkit-user-select:none;" +
      "background:linear-gradient(180deg,#cfe3f7 0%,#eef6ff 40%,#ffffff 100%);box-shadow:inset 0 0 0 1.5px var(--cell-edge);}",
    // traces dans la neige : elles défilent avec la vitesse (background-position)
    ".tr-piste{position:absolute;inset:0;background-image:" +
      "repeating-linear-gradient(180deg,rgba(120,150,190,.28) 0 18px,transparent 18px 46px)," +
      "repeating-linear-gradient(180deg,rgba(120,150,190,.28) 0 18px,transparent 18px 46px);" +
      "background-size:2px 46px,2px 46px;background-repeat:repeat-y;background-position:33.3% 0,66.6% 0;}",
    ".tr-bord{position:absolute;top:0;bottom:0;width:7%;background:linear-gradient(90deg,rgba(31,90,60,.35),transparent);}",
    ".tr-bord.d{right:0;transform:scaleX(-1);}",
    ".tr-o{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;will-change:transform;pointer-events:none;}",
    ".tr-o .e{font-size:34px;line-height:1;filter:drop-shadow(0 3px 3px rgba(0,0,0,.25));}",
    ".tr-o .m{margin-top:2px;background:#fff;color:#16233b;border-radius:8px;padding:2px 7px;font-weight:800;font-size:14px;letter-spacing:1.5px;" +
      "box-shadow:0 2px 6px rgba(0,0,0,.18),inset 0 0 0 1.5px #b9cbe2;}",
    ".tr-o .m b{color:#d7263d;}",
    ".tr-o.vise .m{box-shadow:0 2px 6px rgba(0,0,0,.18),inset 0 0 0 2px #d7263d;}",
    ".tr-o.cadeau .e{animation:trBrille 1s ease-in-out infinite alternate;}",
    "@keyframes trBrille{to{transform:scale(1.12);filter:drop-shadow(0 0 8px rgba(255,210,63,.9));}}",
    ".tr-o.boum{animation:trBoum .35s ease-out forwards;}",
    "@keyframes trBoum{to{opacity:0;filter:blur(2px);}}",
    ".tr-luge{position:absolute;left:0;top:0;font-size:40px;line-height:1;will-change:transform;transition:transform .12s ease-out;pointer-events:none;}",
    ".tr-luge.choc{animation:trChoc .4s;}",
    "@keyframes trChoc{25%,75%{opacity:.25}50%{opacity:1}}",
    ".tr-eclat{position:absolute;font-size:22px;pointer-events:none;animation:trEclat .6s ease-out forwards;}",
    "@keyframes trEclat{to{opacity:0;transform:translateY(-30px) scale(1.4);}}",
    ".tr-bas{display:flex;align-items:center;gap:8px;}",
    ".tr-bas button{flex:none;width:52px;height:44px;border:none;border-radius:11px;font-size:20px;font-weight:800;cursor:pointer;" +
      "background:var(--key);color:var(--ink);box-shadow:inset 0 -2px 0 var(--key-edge);}",
    ".tr-bas button:active{transform:translateY(1px);}",
    ".tr-saisie{flex:1;min-height:40px;text-align:center;font-size:22px;font-weight:800;letter-spacing:4px;line-height:40px;" +
      "background:var(--cell);border-radius:11px;box-shadow:inset 0 0 0 1.5px var(--cell-edge);}",
    ".tr-saisie.faux{animation:shake .3s;color:var(--red);}",
    ".tr-ecran{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:safe center;gap:9px;" +
      "padding:16px;text-align:center;background:color-mix(in srgb,var(--bg) 96%,transparent);border-radius:14px;z-index:2;overflow-y:auto;}",
    ".tr-ecran > *{flex:none;}",
    ".tr-ecran.show{display:flex;}",
    ".tr-ecran h3{margin:0;font-size:24px;}",
    ".tr-ecran p{margin:0;color:var(--ink-dim);font-size:13.5px;line-height:1.5;max-width:360px;}",
    ".tr-ecran .gros{font-size:42px;font-weight:800;color:#d7263d;line-height:1.1;}",
    ".tr-ecran .btn{width:100%;max-width:290px;}",
    ".tr-etat{display:flex;flex-direction:column;gap:3px;font-size:13px;font-weight:700;background:var(--cell);border-radius:11px;padding:8px 12px;" +
      "box-shadow:inset 0 0 0 1.5px var(--cell-edge);width:100%;max-width:290px;}",
    ".tr-top{width:100%;max-width:320px;text-align:left;}",
    ".tr-top div{display:flex;gap:8px;padding:5px 8px;border-radius:8px;font-size:13.5px;}",
    ".tr-top div:nth-child(odd){background:var(--cell);}",
    ".tr-top .rg{width:30px;font-weight:800;} .tr-top .ps{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} .tr-top .sc{font-weight:800;}",
    ".tr-top div.moi{box-shadow:inset 0 0 0 2px var(--accent);}",
    "@media (prefers-reduced-motion: reduce){.tr-o.cadeau .e{animation:none;}}"
  ].join("\n");

  /* ---------- la zone de jeu ---------- */
  var box, zone, piste, luge, saisieEl, ecran, hudScore, hudVies, hudDist;
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function construire() {
    if (box) return;
    if (!document.getElementById("trStyle")) { var st = el("style"); st.id = "trStyle"; st.textContent = CSS; document.head.appendChild(st); }
    box = el("div"); box.id = "trBox";
    box.innerHTML =
      '<div class="tr-hud"><span id="trDist">📏 0 m</span><span id="trScore">⭐ 0</span><span id="trVies">❤️❤️❤️</span></div>' +
      '<div class="tr-zone" id="trZone"><div class="tr-piste"></div><div class="tr-bord"></div><div class="tr-bord d"></div>' +
      '<div class="tr-luge" id="trLuge">🛷</div><div class="tr-ecran" id="trEcran"></div></div>' +
      '<div class="tr-bas"><button id="trG" aria-label="Couloir de gauche">◀</button>' +
      '<div class="tr-saisie" id="trSaisie"> </div>' +
      '<button id="trD" aria-label="Couloir de droite">▶</button></div>';
    var ref = document.getElementById("bbBox") || document.getElementById("board");
    ref.parentNode.insertBefore(box, ref.nextSibling);
    zone = box.querySelector("#trZone"); piste = box.querySelector(".tr-piste"); luge = box.querySelector("#trLuge");
    saisieEl = box.querySelector("#trSaisie"); ecran = box.querySelector("#trEcran");
    hudScore = box.querySelector("#trScore"); hudVies = box.querySelector("#trVies"); hudDist = box.querySelector("#trDist");
    box.querySelector("#trG").addEventListener("click", function () { couloirVers(-1); });
    box.querySelector("#trD").addEventListener("click", function () { couloirVers(1); });
    // glisser le doigt (ou toucher un côté de la piste) pour changer de couloir
    var x0 = null, y0 = null;
    zone.addEventListener("touchstart", function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    zone.addEventListener("touchend", function (e) {
      if (x0 == null || !enJeu) return;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) couloirVers(dx > 0 ? 1 : -1);
      else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) toucheCote(t.clientX);
    });
    zone.addEventListener("mousedown", function (e) { if (enJeu && e.button === 0) toucheCote(e.clientX); });
    window.addEventListener("resize", function () { if (box && box.style.display !== "none") mesurer(); });
  }
  function toucheCote(x) {
    var r = zone.getBoundingClientRect(), c = Math.floor((x - r.left) / (r.width / 3));
    if (c < couloir) couloirVers(-1); else if (c > couloir) couloirVers(1);
  }

  var L = 320, H = 360;           // dimensions de la piste
  function mesurer() {
    var haut = zone.getBoundingClientRect().top;
    var clavier = document.getElementById("keyboard");
    var bas = (clavier && clavier.getBoundingClientRect().top) || window.innerHeight;
    H = Math.max(220, Math.round(bas - haut - 62));
    zone.style.height = H + "px";
    L = zone.clientWidth || 320;
    placerLuge();
  }
  function xCouloir(c) { return L * (c + 0.5) / 3; }
  function yLuge() { return H - 54; }
  function placerLuge() { luge.style.transform = "translate(" + (xCouloir(couloir) - 22).toFixed(1) + "px," + yLuge() + "px)"; }

  /* ---------- la course ---------- */
  var VIES = 3;
  var enJeu = false, sorte = "", vies = VIES, couloir = 1, buf = "", objets = [];
  var distance = 0, detruits = 0, cadeaux = 0, t = 0, prochain = 0, raf = 0, dernier = 0, defile = 0, hasard = Math.random;
  function score() { return Math.floor(distance) + 25 * detruits + 50 * cadeaux; }
  // facteur de vitesse : 1 au départ, 2,6 au plus
  function allure() { return Math.min(2.6, 1 + distance / 1400); }
  function vitessePx() { return (H / 4.6) * allure(); }
  // longueur des mots : 3-4 lettres au départ, jusqu'à 8
  function motPour() {
    var max = Math.min(8, 4 + Math.floor(distance / 300)), min = Math.max(3, max - 2);
    var l = C.mots.filter(function (m) { return m.length >= min && m.length <= max; });
    var dejaVus = objets.map(function (o) { return o.mot; });
    var choix = l.filter(function (m) { return dejaVus.indexOf(m) < 0 && !dejaVus.some(function (d) { return d && (d.indexOf(m) === 0 || m.indexOf(d) === 0); }); });
    var src = choix.length ? choix : l;
    return src[Math.floor(hasard() * src.length)];
  }
  var DECOR = ["🌲", "⛄", "🧊", "🪨", "🌲"];
  function nouvelObjet() {
    var cad = hasard() < 0.16;
    var libres = [0, 1, 2].filter(function (c) { return !objets.some(function (o) { return o.c === c && o.y < 70; }); });
    if (!libres.length) return;
    var c = libres[Math.floor(hasard() * libres.length)];
    var o = { c: c, y: -50, cadeau: cad, mot: cad ? "" : motPour() };
    o.el = el("div", "tr-o" + (cad ? " cadeau" : ""), '<span class="e">' + (cad ? "🎁" : DECOR[Math.floor(hasard() * DECOR.length)]) + '</span>' + (cad ? "" : '<span class="m"></span>'));
    o.lab = o.el.querySelector(".m"); if (o.lab) o.lab.textContent = o.mot;
    zone.insertBefore(o.el, ecran);
    objets.push(o);
    majSaisie();
  }
  function placer(o) {
    var w = o.el.offsetWidth || 40;
    o.el.style.transform = "translate(" + (xCouloir(o.c) - w / 2).toFixed(1) + "px," + o.y.toFixed(1) + "px)";
  }
  function retirer(o, effet) {
    objets.splice(objets.indexOf(o), 1);
    if (effet) { o.el.classList.add("boum"); setTimeout(function () { o.el.remove(); }, 360); }
    else o.el.remove();
  }
  function eclat(txt, x, y) {
    var e = el("div", "tr-eclat", txt);
    e.style.left = (x - 12) + "px"; e.style.top = (y - 10) + "px";
    zone.appendChild(e); setTimeout(function () { e.remove(); }, 650);
  }
  function son(n, i) { if (P().son) P().son(n, i); }
  function vibre(ms) { if (P().vibrate) P().vibrate(ms); }

  function majHud() {
    hudDist.textContent = "📏 " + Math.floor(distance) + " m";
    hudScore.textContent = "⭐ " + score();
    hudVies.textContent = "❤️".repeat(vies) + "🖤".repeat(VIES - vies);
  }
  function majSaisie() {
    saisieEl.textContent = buf || " ";
    objets.forEach(function (o) {
      if (!o.lab) return;
      var ok = buf && o.mot.indexOf(buf) === 0;
      o.el.classList.toggle("vise", !!ok);
      o.lab.innerHTML = ok ? "<b>" + o.mot.slice(0, buf.length) + "</b>" + o.mot.slice(buf.length) : o.mot;
    });
  }
  function couloirVers(d) {
    if (!enJeu) return;
    var c = Math.max(0, Math.min(2, couloir + d));
    if (c === couloir) return;
    couloir = c; placerLuge(); son("touche");
  }

  function boucle(maintenant) {
    if (!enJeu) return;
    var dt = Math.min(0.05, (maintenant - dernier) / 1000);
    dernier = maintenant; t += dt;
    var v = vitessePx();
    distance += 9 * allure() * dt;
    defile = (defile + v * dt) % 46;
    piste.style.backgroundPosition = "33.3% " + defile.toFixed(1) + "px, 66.6% " + defile.toFixed(1) + "px";
    if (t >= prochain) {
      nouvelObjet();
      prochain = t + Math.max(0.75, 1.9 / allure()) * (0.8 + hasard() * 0.45);
    }
    var yl = yLuge();
    for (var i = objets.length - 1; i >= 0; i--) {
      var o = objets[i];
      o.y += v * dt;
      placer(o);
      // à hauteur du traîneau, dans son couloir : choc (ou cadeau ramassé)
      if (!o.passe && o.y > yl - 34 && o.y < yl + 10 && o.c === couloir) {
        o.passe = true;
        if (o.cadeau) {
          cadeaux++; son("correct", 3); eclat("+50", xCouloir(o.c), yl); retirer(o, true);
        } else {
          vies--; son("absent"); vibre(60); eclat("💥", xCouloir(o.c), yl);
          luge.classList.remove("choc"); void luge.offsetWidth; luge.classList.add("choc");
          retirer(o, true);
          if (buf && !objets.some(function (x) { return x.mot && x.mot.indexOf(buf) === 0; })) buf = "";
          majSaisie();
          if (vies <= 0) { majHud(); fin(); return; }
        }
        continue;
      }
      if (o.y > H + 10) retirer(o, false);
    }
    majHud();
    if (sorte === "jour" && Math.floor(t) % 2 === 0) sauverEnCours();
    raf = requestAnimationFrame(boucle);
  }
  function sauverEnCours() {
    var e = etatJour(); if (!e || e.fait) return;
    e.score = score(); e.distance = Math.floor(distance); e.detruits = detruits; e.cadeaux = cadeaux;
    ecrire(CLE_JOUR, e);
  }

  /* ---------- clavier ---------- */
  function touche(a) {
    if (!enJeu) {
      if (a === "enter") { var b = ecran.querySelector(".btn"); if (b && ecran.classList.contains("show")) b.click(); }
      return;
    }
    if (a === "back") { buf = buf.slice(0, -1); majSaisie(); return; }
    if (a === "enter") { buf = ""; majSaisie(); return; }
    if (!/^[A-Z]$/.test(a)) return;
    var essai = buf + a;
    if (!objets.some(function (o) { return o.mot && o.mot.indexOf(essai) === 0; })) {
      saisieEl.classList.remove("faux"); void saisieEl.offsetWidth; saisieEl.classList.add("faux");
      son("refuse"); return;
    }
    buf = essai; son("touche");
    // l'obstacle le plus proche portant ce mot explose
    var cible = objets.filter(function (o) { return o.mot === buf; }).sort(function (x, y) { return y.y - x.y; })[0];
    if (cible) {
      detruits++; buf = ""; son("correct", 2);
      eclat("✨", xCouloir(cible.c), cible.y + 10);
      retirer(cible, true);
    }
    majSaisie(); majHud();
  }
  function fleche(k) {
    if (!enJeu) return false;
    if (k === "ArrowLeft") { couloirVers(-1); return true; }
    if (k === "ArrowRight") { couloirVers(1); return true; }
    return false;
  }

  /* ---------- écrans ---------- */
  function montrer(html) { ecran.innerHTML = html; ecran.classList.add("show"); }
  function accueil() {
    var j = etatJour(), b = bonusDispo(), rec = record();
    var jourFait = !!(j && j.fait);
    var h = '<h3>🛷 Traîneau</h3>' +
      '<p>Des obstacles arrivent sur la piste : <b>tape leur mot</b> pour les faire exploser, ou <b>change de couloir</b> ' +
      '(flèches ← →, glisse le doigt, ou ◀ ▶). Ramasse les 🎁. Trois chocs, et la course s\'arrête.</p>' +
      '<div class="tr-etat">' +
        '<span>' + (jourFait ? "✓ Course du jour faite : " + (j.score || 0) + " points" : "🎟️ Course du jour : disponible") + '</span>' +
        '<span>🛷 Tentatives bonus : ' + b + (apercu() ? " (aperçu)" : "") + '</span>' +
        '<span>🏆 Ton record : ' + rec + '</span></div>';
    if (!jourFait) h += '<button class="btn" data-tr="jour">C\'est parti !</button>';
    else if (b > 0) h += '<button class="btn" data-tr="bonus">Utiliser une tentative bonus (🛷 ' + b + ')</button>';
    h += '<button class="btn ghost" data-tr="entrainement">S\'entraîner</button>' +
         '<button class="btn ghost" data-tr="top">🏆 Classement de la saison</button>' +
         '<p style="font-size:12px">La course du jour et les tentatives bonus comptent pour le classement, l\'XP et le jeton d\'indice (dès ' + C.seuilJeton + ' points).</p>';
    montrer(h);
    lierBoutons();
  }
  function lierBoutons() {
    ecran.querySelectorAll("[data-tr]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.dataset.tr;
        if (a === "partage") return;                       // relié à part, dans fin()
        if (a === "top") return classement();
        if (a === "accueil") return accueil();
        demarrer(a);
      });
    });
  }
  function classement() {
    montrer('<h3>🏆 Records de la saison</h3><div class="tr-top"><p>Chargement…</p></div><button class="btn ghost" data-tr="accueil">Retour</button>');
    lierBoutons();
    var S = window.TraineauScores;
    if (!S || !S.configured()) { ecran.querySelector(".tr-top").innerHTML = '<p>Le classement demande une connexion au serveur.</p>'; return; }
    var moi = (window.Profile && Profile.state && (Profile.state.pseudo || "").trim()) || "";
    S.top(C.saison, 20).then(function (l) {
      var bx = ecran.querySelector(".tr-top"); if (!bx) return;
      if (!l || !l.length) { bx.innerHTML = '<p>Personne n\'a encore de record. Sois le premier !</p>'; return; }
      bx.innerHTML = l.map(function (r, i) {
        var m = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1) + ".";
        var p = String(r.pseudo || "Anonyme").replace(/[<>&]/g, "");
        return '<div' + (moi && p === moi ? ' class="moi"' : '') + '><span class="rg">' + m + '</span><span class="ps">' + p +
               '</span><span class="sc">' + r.score + '</span></div>';
      }).join("");
    });
  }

  /* ---------- départ et fin ---------- */
  function demarrer(s) {
    if (s === "jour") {
      var j = etatJour(); if (j && j.fait) { accueil(); return; }
      if (!apercu()) ecrire(CLE_JOUR, { day: jour(), commence: true, fait: false, score: 0 });
    } else if (s === "bonus") {
      if (!consommerBonus()) { if (P().toast) P().toast("Plus de tentative bonus 🛷", 2000); accueil(); return; }
    }
    sorte = s; enJeu = true; vies = VIES; couloir = 1; buf = ""; distance = 0; detruits = 0; cadeaux = 0; t = 0; prochain = 0.4; defile = 0;
    objets.forEach(function (o) { o.el.remove(); }); objets = [];
    ecran.classList.remove("show");
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    mesurer(); majHud(); majSaisie();
    dernier = performance.now();
    raf = requestAnimationFrame(boucle);
    if (P().mesure) P().mesure("partie:traineau");
  }
  /* Ce que rapporte une course qui compte. Renvoie les lignes à afficher. */
  function conclure(o) {
    var lignes = [];
    if (apercu()) { lignes.push("Aperçu : rien n'est enregistré."); return lignes; }
    var sc = o.score;
    if (sc > record()) { ecrire(CLE_RECORD, sc); lignes.push("🏆 Nouveau record personnel !"); }
    if (window.TraineauScores && TraineauScores.configured()) TraineauScores.record(sc, o.distance, C.saison);
    if (window.Profile) {
      if (Profile.traineauDone) Profile.traineauDone({ score: sc, distance: o.distance, detruits: o.detruits, cadeaux: o.cadeaux });
      var xp = Math.min(50, Math.round(sc / 40));
      if (xp > 0 && Profile.ajouterXp) { Profile.ajouterXp(xp, "traineau"); lignes.push("+" + xp + " XP"); }
      if (o.sorte === "jour" && Profile.submitDaily) Profile.submitDaily({ game: "traineau", day: jour(), tries: sc, won: sc >= C.seuilJeton });
    }
    if (sc >= C.seuilJeton && P().jetonDuJour) P().jetonDuJour("traineau", jour());
    else if (sc < C.seuilJeton) lignes.push("💡 Jeton d'indice du jour dès " + C.seuilJeton + " points");
    if (P().mesure && sc >= C.seuilJeton) P().mesure("gagne:traineau");
    return lignes;
  }
  function fin() {
    enJeu = false; cancelAnimationFrame(raf);
    // la piste se vide : rien ne doit traîner derrière le résultat
    objets.forEach(function (x) { x.el.remove(); }); objets = []; buf = ""; majSaisie();
    var sc = score(), o = { sorte: sorte, score: sc, distance: Math.floor(distance), detruits: detruits, cadeaux: cadeaux };
    son(sc >= C.seuilJeton ? "gagne" : "perdu");
    var lignes = [];
    if (sorte === "jour") { if (!apercu()) ecrire(CLE_JOUR, { day: jour(), commence: true, fait: true, score: sc }); lignes = conclure(o); }
    else if (sorte === "bonus") lignes = conclure(o);
    else lignes.push("Entraînement : cette course ne compte pas.");
    var b = bonusDispo(), j = etatJour();
    montrer('<h3>' + (sc >= C.seuilJeton ? "Quelle descente !" : "Fin de la descente") + '</h3>' +
      '<div class="gros">⭐ ' + sc + '</div>' +
      '<p>📏 ' + o.distance + ' m · 💥 ' + detruits + ' obstacle' + (detruits > 1 ? "s" : "") + ' · 🎁 ' + cadeaux + ' cadeau' + (cadeaux > 1 ? "x" : "") + '</p>' +
      (lignes.length ? '<p>' + lignes.join("<br>") + '</p>' : '') +
      (!(j && j.fait) ? '<button class="btn" data-tr="jour">Course du jour</button>'
        : b > 0 ? '<button class="btn" data-tr="bonus">Tentative bonus (🛷 ' + b + ')</button>' : '') +
      '<button class="btn ghost" data-tr="entrainement">S\'entraîner</button>' +
      (sorte !== "entrainement" ? '<button class="btn ghost" data-tr="partage">📤 Partager</button>' : '') +
      '<button class="btn ghost" data-tr="top">🏆 Classement</button>');
    lierBoutons();
    var pt = ecran.querySelector('[data-tr="partage"]');
    if (pt) {
      pt.addEventListener("click", function () {
        var txt = "🛷 Mot en Six — Traîneau de Noël\n⭐ " + sc + " points · 📏 " + o.distance + " m · 💥 " + detruits +
          "\nTape les mots pour dégager la piste :\n" + (P().lienPartage ? P().lienPartage("?mode=traineau&src=parttraineau") : "");
        if (P().partager) P().partager(txt);
      });
    }
  }

  /* ---------- ouverture et arrêt (appelés par index.html) ---------- */
  function ouvrir() {
    construire();
    box.style.display = "flex";
    mesurer();
    // une course du jour interrompue (appli fermée) compte avec le score atteint
    var j = etatJour();
    if (j && j.commence && !j.fait && !apercu()) {
      ecrire(CLE_JOUR, { day: jour(), commence: true, fait: true, score: j.score || 0 });
      conclure({ sorte: "jour", score: j.score || 0, distance: j.distance || 0, detruits: j.detruits || 0, cadeaux: j.cadeaux || 0 });
    }
    accueil();
    // déjà courue aujourd'hui sur un autre appareil ?
    if (!(j && j.fait) && !apercu() && window.Profile && Profile.resultatJour) {
      Profile.resultatJour("traineau", jour()).then(function (r) {
        if (!r) return;
        ecrire(CLE_JOUR, { day: jour(), commence: true, fait: true, score: r.tries || 0, ailleurs: true });
        if (enJeu && sorte === "jour") { sorte = "entrainement"; if (P().toast) P().toast("Course du jour déjà faite sur un autre appareil : celle-ci est un entraînement.", 3400); }
        else if (!enJeu) accueil();
      });
    }
  }
  function arreter() {
    if (enJeu && sorte !== "entrainement") fin();          // quitter en pleine course : elle compte avec son score
    enJeu = false; cancelAnimationFrame(raf);
    objets.forEach(function (o) { o.el.remove(); }); objets = [];
    if (box) { box.style.display = "none"; ecran.classList.remove("show"); }
  }

  window.Traineau = {
    actif: actif,
    ouvrir: ouvrir,
    arreter: arreter,
    touche: touche,
    fleche: fleche,
    get enJeu() { return enJeu; },
    get tentatives() { return bonusDispo(); },
    faitAujourdhui: function () { var j = etatJour(); return !!(j && j.fait); },
    // tests : état de la course
    get etat() { return { sorte: sorte, vies: vies, couloir: couloir, distance: distance, detruits: detruits, cadeaux: cadeaux, score: score(), objets: objets.map(function (o) { return { c: o.c, y: o.y, mot: o.mot, cadeau: o.cadeau }; }) }; }
  };
})();
