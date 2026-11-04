/* Mot en Six — le Traîneau (Noël)
 *
 * Vue en perspective, comme une course vers l'horizon : un traîneau tiré par
 * deux rennes file sur une piste enneigée à trois couloirs. Sur les côtés
 * défilent sapins, maisons de Noël et lampadaires ; au loin, montagnes, lune
 * et nuages. Des obstacles (sapins, bonshommes de neige, blocs de glace,
 * barrières) arrivent, chacun portant un mot : on le TAPE pour le faire
 * exploser, ou on CHANGE DE COULOIR (← →, glisser le doigt, ◀ ▶).
 *
 * Règles (v2.7.1) :
 *  - une seule vie : le moindre choc arrête la course ;
 *  - les cadeaux sont OBLIGATOIRES : en laisser passer un arrête la course ;
 *  - des murs : deux obstacles côte à côte, puis trois (il faut taper un mot
 *    pour passer), et des enfilades dans un même couloir ;
 *  - six zones qui changent le décor et durcissent le jeu (plaine, forêt,
 *    village, lac gelé, tempête, nuit magique) ; la vitesse ne cesse de monter.
 *
 * Trois sortes de courses : la course du jour (une par jour), les tentatives
 * bonus (gagnées dans le calendrier de l'avent), l'entraînement (illimité,
 * ne compte pas). Les deux premières rapportent XP, jeton d'indice du jour
 * (au-delà d'un score), badges, et une place au classement de la saison.
 *
 * Tout est dessiné dans un <canvas> : formes du jeu (SVG converties en
 * images une fois pour toutes) et animations (rennes au galop, fumée des
 * cheminées, neige soulevée) calculées à chaque image.
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
  function bonusDispo() {
    if (apercu()) return 3;
    return window.Boutique && Boutique.totalBonus ? Math.max(0, Boutique.totalBonus("traineau")) : 0;
  }
  function consommerBonus() {
    if (apercu()) return true;
    if (bonusDispo() <= 0 || !window.Boutique || !Boutique.bonus) return false;
    return Boutique.bonus("course:traineau:" + Date.now() + ":" + Math.floor(Math.random() * 1e6), { traineau: -1 });
  }

  /* =====================================================================
     DESSINS : formes de la direction artistique du jeu (aplats, contours
     sombres, neige sur les arêtes), converties en images une seule fois.
     Chaque image est posée par le bas (point d'ancrage au sol).
     ===================================================================== */
  function svgImg(w, h, vb, corps) {
    var img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="' + vb + '">' + corps + '</svg>');
    return img;
  }
  var NEIGE = "#f3f8ff", CONTOUR = "#16314f";
  var IMG = {
    sapin: svgImg(120, 160, "0 0 60 80",
      '<rect x="26" y="64" width="8" height="13" fill="#6b3f1f" stroke="' + CONTOUR + '" stroke-width="1.5"/>' +
      '<path d="M30 2 L46 26 L38 26 L52 46 L42 46 L58 68 L2 68 L18 46 L8 46 L22 26 L14 26 Z" fill="#1f7a46" stroke="#0d3f26" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M30 2 L37 12 Q30 15 23 12 Z M14 26 L22 26 Q30 30 38 26 L46 26 L42 32 Q30 35 18 32 Z M8 46 L18 46 Q30 50 42 46 L52 46 L48 52 Q30 56 12 52 Z M2 68 L58 68 L55 72 Q30 76 5 72 Z" fill="' + NEIGE + '"/>'),
    sapinLum: svgImg(120, 160, "0 0 60 80",
      '<rect x="26" y="64" width="8" height="13" fill="#6b3f1f"/>' +
      '<path d="M30 2 L46 26 L38 26 L52 46 L42 46 L58 68 L2 68 L18 46 L8 46 L22 26 L14 26 Z" fill="#17643a" stroke="#0d3f26" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M18 30 Q30 36 42 30 M12 50 Q30 58 48 50" fill="none" stroke="#f2c230" stroke-width="1.6"/>' +
      '<g><circle cx="22" cy="32" r="2.2" fill="#ff4b5c"/><circle cx="34" cy="34" r="2.2" fill="#4fb6ff"/><circle cx="16" cy="52" r="2.2" fill="#ffd23f"/>' +
      '<circle cx="30" cy="55" r="2.2" fill="#ff8ad8"/><circle cx="44" cy="52" r="2.2" fill="#3ddc84"/></g>' +
      '<path d="M30 0 L32 5 L37 5 L33 8 L35 13 L30 10 L25 13 L27 8 L23 5 L28 5 Z" fill="#ffd23f" stroke="#b8860b" stroke-width=".8"/>'),
    bonhomme: svgImg(120, 160, "0 0 60 80",
      '<ellipse cx="30" cy="76" rx="20" ry="3" fill="rgba(0,0,0,.18)"/>' +
      '<circle cx="30" cy="58" r="18" fill="#fbfdff" stroke="#8fa9c8" stroke-width="2"/>' +
      '<circle cx="30" cy="30" r="13" fill="#fbfdff" stroke="#8fa9c8" stroke-width="2"/>' +
      '<path d="M18 40 Q30 46 42 40 L43 44 Q30 50 17 44 Z M36 43 L40 54 L45 52 L41 42 Z" fill="#d7263d" stroke="#8c1224" stroke-width="1"/>' +
      '<circle cx="25" cy="27" r="1.8" fill="#16233b"/><circle cx="35" cy="27" r="1.8" fill="#16233b"/>' +
      '<path d="M30 31 L41 33 L30 35 Z" fill="#f28a1a"/>' +
      '<circle cx="30" cy="54" r="1.8" fill="#16233b"/><circle cx="30" cy="62" r="1.8" fill="#16233b"/>' +
      '<rect x="18" y="16" width="24" height="3" fill="#16233b"/><rect x="21" y="4" width="18" height="13" fill="#16233b"/><rect x="21" y="12" width="18" height="2.5" fill="#d7263d"/>' +
      '<path d="M13 52 L2 44 M47 52 L58 44" stroke="#6b3f1f" stroke-width="2" stroke-linecap="round"/>'),
    glace: svgImg(128, 120, "0 0 64 60",
      '<ellipse cx="32" cy="57" rx="28" ry="3" fill="rgba(0,0,0,.16)"/>' +
      '<path d="M6 56 L4 26 L18 8 L44 4 L60 22 L58 56 Z" fill="#9fd8f5" stroke="#2f7fb5" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M18 8 L26 30 L4 26 M26 30 L44 4 M26 30 L40 56 M26 30 L60 22" fill="none" stroke="#5fb3e0" stroke-width="1.3"/>' +
      '<path d="M10 24 L18 12 L22 22 Z M46 10 L54 22 L48 24 Z" fill="#e9f8ff" opacity=".9"/>' +
      '<path d="M4 26 L18 8 L44 4 L60 22 L56 18 L44 9 L20 12 Z" fill="' + NEIGE + '"/>'),
    barriere: svgImg(160, 100, "0 0 80 50",
      '<ellipse cx="40" cy="47" rx="36" ry="3" fill="rgba(0,0,0,.16)"/>' +
      '<rect x="6" y="12" width="7" height="34" rx="1.5" fill="#8a5a32" stroke="#4a2c14" stroke-width="1.6"/>' +
      '<rect x="67" y="12" width="7" height="34" rx="1.5" fill="#8a5a32" stroke="#4a2c14" stroke-width="1.6"/>' +
      '<rect x="2" y="16" width="76" height="9" rx="2" fill="#c81f36" stroke="#6e0f1c" stroke-width="1.6"/>' +
      '<rect x="2" y="30" width="76" height="9" rx="2" fill="#c81f36" stroke="#6e0f1c" stroke-width="1.6"/>' +
      '<path d="M14 16 L24 25 M30 16 L40 25 M46 16 L56 25 M62 16 L72 25 M14 30 L24 39 M30 30 L40 39 M46 30 L56 39 M62 30 L72 39" stroke="#f6f6f6" stroke-width="3"/>' +
      '<path d="M2 16 Q40 9 78 16 L78 19 Q40 13 2 19 Z M5 12 Q9 8 14 12 Z M66 12 Q70 8 75 12 Z" fill="' + NEIGE + '"/>'),
    cadeau: svgImg(100, 100, "0 0 50 50",
      '<ellipse cx="25" cy="47" rx="18" ry="2.5" fill="rgba(0,0,0,.18)"/>' +
      '<rect x="7" y="18" width="36" height="27" rx="2" fill="#d7263d" stroke="#6e0f1c" stroke-width="2"/>' +
      '<rect x="4" y="12" width="42" height="9" rx="2" fill="#e63d52" stroke="#6e0f1c" stroke-width="2"/>' +
      '<rect x="21" y="12" width="8" height="33" fill="#f2c230" stroke="#a87c0e" stroke-width="1.2"/>' +
      '<path d="M25 12 C17 2 9 6 13 11 C15 13 21 12 25 12 C29 12 35 13 37 11 C41 6 33 2 25 12 Z" fill="#f2c230" stroke="#a87c0e" stroke-width="1.4"/>'),
    cadeauVert: svgImg(100, 100, "0 0 50 50",
      '<ellipse cx="25" cy="47" rx="18" ry="2.5" fill="rgba(0,0,0,.18)"/>' +
      '<rect x="7" y="18" width="36" height="27" rx="2" fill="#1f8a4c" stroke="#0d3f26" stroke-width="2"/>' +
      '<rect x="4" y="12" width="42" height="9" rx="2" fill="#2ea35f" stroke="#0d3f26" stroke-width="2"/>' +
      '<rect x="21" y="12" width="8" height="33" fill="#f6f6f6" stroke="#9aa9bb" stroke-width="1.2"/>' +
      '<path d="M25 12 C17 2 9 6 13 11 C15 13 21 12 25 12 C29 12 35 13 37 11 C41 6 33 2 25 12 Z" fill="#d7263d" stroke="#6e0f1c" stroke-width="1.4"/>'),
    maison: svgImg(200, 180, "0 0 100 90",
      '<rect x="68" y="6" width="9" height="20" fill="#7a3b2a" stroke="#3b1a12" stroke-width="1.5"/><rect x="66" y="4" width="13" height="4" fill="' + NEIGE + '"/>' +
      '<rect x="12" y="38" width="76" height="48" fill="#a8452f" stroke="#4a1c12" stroke-width="2"/>' +
      '<path d="M4 42 L50 10 L96 42 Z" fill="#5a2a1e" stroke="#2e130c" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M2 44 L50 8 L98 44 L92 46 L50 16 L8 46 Z" fill="' + NEIGE + '" stroke="#b7cbe3" stroke-width="1"/>' +
      '<rect x="20" y="50" width="16" height="14" rx="1.5" fill="#ffd56b" stroke="#4a1c12" stroke-width="1.6"/><path d="M28 50 V64 M20 57 H36" stroke="#4a1c12" stroke-width="1.4"/>' +
      '<rect x="64" y="50" width="16" height="14" rx="1.5" fill="#ffd56b" stroke="#4a1c12" stroke-width="1.6"/><path d="M72 50 V64 M64 57 H80" stroke="#4a1c12" stroke-width="1.4"/>' +
      '<rect x="42" y="58" width="16" height="28" rx="2" fill="#5a2a1e" stroke="#2e130c" stroke-width="1.6"/><circle cx="55" cy="72" r="1.3" fill="#f2c230"/>' +
      '<circle cx="50" cy="48" r="6" fill="none" stroke="#1f7a46" stroke-width="3.2"/><circle cx="50" cy="42.5" r="1.4" fill="#d7263d"/>' +
      '<path d="M12 86 Q30 80 50 86 Q70 80 88 86 L88 88 L12 88 Z" fill="' + NEIGE + '"/>'),
    lampadaire: svgImg(40, 160, "0 0 20 80",
      '<rect x="8.5" y="14" width="3" height="64" fill="#2a3446"/><rect x="5" y="74" width="10" height="5" rx="1" fill="#2a3446"/>' +
      '<path d="M4 14 L10 4 L16 14 Z" fill="#2a3446"/><rect x="5" y="13" width="10" height="9" rx="1" fill="#ffe08a" stroke="#2a3446" stroke-width="1.4"/>' +
      '<path d="M8.5 30 Q2 34 3 40" fill="none" stroke="#1f7a46" stroke-width="2.4"/><circle cx="3" cy="40" r="1.6" fill="#d7263d"/>'),
    nuage: svgImg(240, 100, "0 0 120 50",
      '<path d="M14 40 Q4 40 6 31 Q8 23 18 25 Q20 12 34 13 Q42 3 56 9 Q66 2 76 10 Q90 8 92 20 Q106 19 108 30 Q112 41 98 41 Z" fill="#eef4fb" opacity=".92"/>' +
      '<path d="M14 40 Q60 46 98 41" fill="none" stroke="#c9d7e8" stroke-width="2"/>')
  };
  var DESSINS_OBSTACLES = ["sapin", "bonhomme", "glace", "barriere"];

  /* ---------- style de la zone (le reste est dans le canvas) ---------- */
  var CSS = [
    "#trBox{display:none;flex-direction:column;gap:6px;padding:4px 2px;position:relative;align-self:stretch;width:100%;max-width:560px;margin:0 auto;flex:1;min-height:0;}",
    ".tr-hud{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:15px;padding:0 4px;}",
    ".tr-zone{position:relative;overflow:hidden;border-radius:14px;touch-action:none;user-select:none;-webkit-user-select:none;background:#0b1d3d;" +
      "box-shadow:inset 0 0 0 1.5px var(--cell-edge);}",
    ".tr-zone canvas{display:block;width:100%;height:100%;}",
    ".tr-bas{display:flex;align-items:center;gap:8px;}",
    ".tr-bas button{flex:none;width:52px;height:44px;border:none;border-radius:11px;font-size:20px;font-weight:800;cursor:pointer;" +
      "background:var(--key);color:var(--ink);box-shadow:inset 0 -2px 0 var(--key-edge);}",
    ".tr-bas button:active{transform:translateY(1px);}",
    ".tr-saisie{flex:1;min-height:40px;text-align:center;font-size:22px;font-weight:800;letter-spacing:4px;line-height:40px;" +
      "background:var(--cell);border-radius:11px;box-shadow:inset 0 0 0 1.5px var(--cell-edge);}",
    ".tr-saisie.faux{animation:shake .3s;color:var(--red);}",
    ".tr-ecran{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:safe center;gap:9px;" +
      "padding:16px;text-align:center;background:rgba(8,20,44,.86);color:#fff;border-radius:14px;z-index:2;overflow-y:auto;backdrop-filter:blur(2px);}",
    ".tr-ecran > *{flex:none;}",
    ".tr-ecran.show{display:flex;}",
    ".tr-ecran h3{margin:0;font-size:24px;}",
    ".tr-ecran p{margin:0;color:#c5d6ee;font-size:13.5px;line-height:1.5;max-width:380px;}",
    ".tr-ecran .gros{font-size:42px;font-weight:800;color:#ffd23f;line-height:1.1;}",
    ".tr-ecran .raison{font-size:15px;font-weight:800;color:#ff8a8a;}",
    ".tr-ecran .btn{width:100%;max-width:290px;}",
    ".tr-etat{display:flex;flex-direction:column;gap:3px;font-size:13px;font-weight:700;background:rgba(255,255,255,.08);border-radius:11px;padding:8px 12px;width:100%;max-width:290px;}",
    ".tr-regles{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;text-align:left;font-size:13px;max-width:330px;color:#dbe7f7;}",
    ".tr-top{width:100%;max-width:320px;text-align:left;}",
    ".tr-top div{display:flex;gap:8px;padding:5px 8px;border-radius:8px;font-size:13.5px;}",
    ".tr-top div:nth-child(odd){background:rgba(255,255,255,.07);}",
    ".tr-top .rg{width:30px;font-weight:800;} .tr-top .ps{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} .tr-top .sc{font-weight:800;}",
    ".tr-top div.moi{box-shadow:inset 0 0 0 2px #ffd23f;}"
  ].join("\n");

  var box, zone, cv, ctx, saisieEl, ecran, hudScore, hudDist, hudCad;
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function construire() {
    if (box) return;
    if (!document.getElementById("trStyle")) { var st = el("style"); st.id = "trStyle"; st.textContent = CSS; document.head.appendChild(st); }
    box = el("div"); box.id = "trBox";
    box.innerHTML =
      '<div class="tr-hud"><span id="trDist">📏 0 m</span><span id="trScore">⭐ 0</span><span id="trCad">🎁 0</span></div>' +
      '<div class="tr-zone" id="trZone"><canvas id="trCanvas"></canvas><div class="tr-ecran" id="trEcran"></div></div>' +
      '<div class="tr-bas"><button id="trG" aria-label="Couloir de gauche">◀</button>' +
      '<div class="tr-saisie" id="trSaisie"> </div>' +
      '<button id="trD" aria-label="Couloir de droite">▶</button></div>';
    var ref = document.getElementById("bbBox") || document.getElementById("board");
    ref.parentNode.insertBefore(box, ref.nextSibling);
    zone = box.querySelector("#trZone"); cv = box.querySelector("#trCanvas"); ctx = cv.getContext("2d");
    saisieEl = box.querySelector("#trSaisie"); ecran = box.querySelector("#trEcran");
    hudScore = box.querySelector("#trScore"); hudDist = box.querySelector("#trDist"); hudCad = box.querySelector("#trCad");
    box.querySelector("#trG").addEventListener("click", function () { couloirVers(-1); });
    box.querySelector("#trD").addEventListener("click", function () { couloirVers(1); });
    var x0 = null, y0 = null;
    zone.addEventListener("touchstart", function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    zone.addEventListener("touchend", function (e) {
      if (x0 == null || !enJeu) return;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy)) couloirVers(dx > 0 ? 1 : -1);
      else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) toucheCote(t.clientX);
    });
    zone.addEventListener("mousedown", function (e) { if (enJeu && e.button === 0) toucheCote(e.clientX); });
    window.addEventListener("resize", function () { if (box && box.style.display !== "none") { mesurer(); if (!enJeu) dessiner(0); } });
  }
  function toucheCote(x) {
    var r = zone.getBoundingClientRect(), c = Math.floor((x - r.left) / (r.width / 3));
    if (c < couloir) couloirVers(-1); else if (c > couloir) couloirVers(1);
  }

  /* ---------- la perspective ----------
     z : distance devant le traîneau (en mètres). p = D / (z + D) vaut 1 au
     premier plan et tend vers 0 à l'horizon : position et taille en découlent. */
  var W = 360, H = 420, DPR = 1, HY = 0, BY = 0, LV = 0, D = 14, ZR = 6;   // ZR : où trottent les rennes, devant le traîneau
  function mesurer() {
    var haut = zone.getBoundingClientRect().top;
    var clavier = document.getElementById("keyboard");
    var bas = (clavier && clavier.getBoundingClientRect().top) || window.innerHeight;
    H = Math.max(260, Math.round(bas - haut - 62));
    zone.style.height = H + "px";
    W = zone.clientWidth || 360;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    HY = Math.round(H * 0.27);          // l'horizon
    BY = H - 8;                          // le sol au premier plan
    LV = W * 0.27;                       // écart entre couloirs au premier plan
  }
  function proj(z, lx) {
    var p = D / (Math.max(-D * 0.9, z) + D);
    return { x: W / 2 + lx * LV * p, y: HY + (BY - HY) * p, p: p };
  }

  /* =====================================================================
     LES ZONES : décor, couleurs et motifs d'obstacles (de plus en plus durs)
     ===================================================================== */
  var ZONES = [
    { d: 0,    nom: "🌨️ La plaine enneigée", ciel: ["#081a36", "#284a80"], sol: ["#cfe0f3", "#f6fbff"], piste: "rgba(150,180,215,.35)",
      deco: { sapin: 5, sapinLum: 1, lampadaire: 1 }, densite: 1,
      motifs: { simple: 4, cadeau: 3, double: 3, triple: 1 } },
    { d: 450,  nom: "🌲 La forêt", ciel: ["#061629", "#1e3d6b"], sol: ["#c6dbef", "#eef6ff"], piste: "rgba(140,170,210,.4)",
      deco: { sapin: 8, sapinLum: 2 }, densite: 2.2,
      motifs: { simple: 2, double: 4, triple: 2, cadeau: 3, chaine: 2 } },
    { d: 1000, nom: "🏘️ Le village de Noël", ciel: ["#10173a", "#3a3f78"], sol: ["#d8e2f0", "#fbfdff"], piste: "rgba(160,170,200,.42)",
      deco: { maison: 5, lampadaire: 3, sapinLum: 2 }, densite: 1.7,
      motifs: { simple: 2, double: 4, triple: 2, cadeau: 3, chaine: 2 } },
    { d: 1700, nom: "🧊 Le lac gelé", ciel: ["#071a33", "#2b5b8a"], sol: ["#a9d7f0", "#e4f6ff"], piste: "rgba(90,160,210,.35)",
      deco: { sapin: 3, glace: 2 }, densite: 0.9, glissant: true,
      motifs: { double: 4, triple: 3, cadeau: 3, chaine: 3 } },
    { d: 2500, nom: "🌪️ La tempête", ciel: ["#2b3644", "#7c8ea4"], sol: ["#cfd9e4", "#eef2f7"], piste: "rgba(140,155,175,.4)",
      deco: { sapin: 5, lampadaire: 1 }, densite: 1.4, brouillard: true, tempete: true,
      motifs: { double: 3, triple: 4, cadeau: 3, chaine: 3 } },
    { d: 3400, nom: "✨ La nuit magique", ciel: ["#050b1f", "#2a1f5a"], sol: ["#d6dcf5", "#f7f8ff"], piste: "rgba(170,160,220,.4)",
      deco: { sapinLum: 4, maison: 2, lampadaire: 2 }, densite: 1.8, aurore: true,
      motifs: { double: 3, triple: 5, cadeau: 3, chaine: 4 } }
  ];
  function zoneDe(d) { var z = ZONES[0]; ZONES.forEach(function (x) { if (d >= x.d) z = x; }); return z; }
  function tirer(poids) {
    var t = 0, k; for (k in poids) t += poids[k];
    var r = hasard() * t; for (k in poids) { r -= poids[k]; if (r <= 0) return k; }
    return k;
  }

  /* ---------- la difficulté, au fil de la distance ---------- */
  // La vitesse monte sans cesse ; le temps entre deux rangées raccourcit (1,55 s au départ, 0,6 s vers 3000 m) ;
  // les mots s'allongent (5 lettres à 500 m, 8 à 2000 m).
  function vitesse() { return Math.min(36, 13 + distance / 170); }   // m/s
  function horizon() { return 58 + vitesse() * 1.25; }               // plus on va vite, plus on voit loin : le temps de lire reste juste
  function cadence() { return Math.max(0.6, 1.55 - distance / 3200); }   // secondes entre deux rangées
  function ecart() { return vitesse() * cadence(); }                  // en mètres
  function longueurs() { var max = Math.min(8, 4 + Math.floor(distance / 500)); return [Math.max(3, max - 2), max]; }

  /* =====================================================================
     LA COURSE
     ===================================================================== */
  var enJeu = false, sorte = "", couloir = 1, xVisu = 1, buf = "", objets = [], decor = [], eclats = [], flocons = [];
  var distance = 0, detruits = 0, cadeaux = 0, t = 0, raf = 0, dernier = 0, avance = 0, decoAvance = 0;
  var compte = 0, banniere = null, zoneCourante = null, finRaison = "", finAt = 0, secousse = 0, hasard = Math.random;
  function score() { return Math.floor(distance) + 25 * detruits + 50 * cadeaux; }

  function motPour() {
    var lg = longueurs();
    var l = C.mots.filter(function (m) { return m.length >= lg[0] && m.length <= lg[1]; });
    var vus = objets.filter(function (o) { return o.mot; }).map(function (o) { return o.mot; });
    var libres = l.filter(function (m) {
      return !vus.some(function (d) { return d === m || d.indexOf(m) === 0 || m.indexOf(d) === 0 || d[0] === m[0]; });
    });
    if (!libres.length) libres = l.filter(function (m) { return !vus.some(function (d) { return d === m || d.indexOf(m) === 0 || m.indexOf(d) === 0; }); });
    var src = libres.length ? libres : l;
    return src[Math.floor(hasard() * src.length)];
  }
  function obstacle(c, z) {
    objets.push({ c: c, z: z, mot: motPour(), dessin: DESSINS_OBSTACLES[Math.floor(hasard() * DESSINS_OBSTACLES.length)] });
  }
  function cadeau(c, z) { objets.push({ c: c, z: z, cadeau: true, dessin: hasard() < 0.5 ? "cadeau" : "cadeauVert" }); }
  function melange(l) { for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(hasard() * (i + 1)), x = l[i]; l[i] = l[j]; l[j] = x; } return l; }

  /* Une rangée, selon la zone. Renvoie l'écart à laisser avant la suivante. */
  function rangee() {
    var z = horizon(), zn = zoneDe(distance), m = tirer(zn.motifs), c = melange([0, 1, 2]), g = ecart();
    if (m === "triple" && distance < 120) m = "double";                                       // le temps de prendre la main
    if (m === "simple") { obstacle(c[0], z); return g; }
    if (m === "double") { obstacle(c[0], z); obstacle(c[1], z); return g * 1.05; }
    if (m === "triple") { obstacle(0, z); obstacle(1, z); obstacle(2, z); return g * 1.35; }   // il faut taper pour passer
    if (m === "chaine") {                                                                        // une enfilade dans un couloir, et un voisin
      obstacle(c[0], z); obstacle(c[0], z + g * 0.55);
      if (distance > 700) obstacle(c[1], z + g * 0.28);
      return g * 1.25;
    }
    // cadeau : seul, ou accompagné d'un obstacle ailleurs (plus loin dans la course)
    cadeau(c[0], z);
    if (distance > 500 && hasard() < 0.6) obstacle(c[1], z);
    if (distance > 1500 && hasard() < 0.35) obstacle(c[2], z + g * 0.4);
    return g * 1.1;
  }
  function decorNouveau(z) {
    var zn = zoneDe(distance), type = tirer(zn.deco);
    var cote = hasard() < 0.5 ? -1 : 1;
    decor.push({ type: type, z: z, x: cote * ((type === "maison" ? 3.1 : 2.15) + hasard() * 1.6), s: 0.85 + hasard() * 0.35 });
  }

  /* ---------- l'image ---------- */
  var nuages = [], etoiles = [];
  function preparerCiel() {
    nuages = []; etoiles = [];
    for (var i = 0; i < 5; i++) nuages.push({ x: hasard(), y: 0.08 + hasard() * 0.5, v: 0.004 + hasard() * 0.008, s: 0.5 + hasard() * 0.6 });
    for (var k = 0; k < 40; k++) etoiles.push({ x: hasard(), y: hasard() * 0.9, r: 0.5 + hasard() * 1.1, f: hasard() * 6 });
    flocons = [];
    for (var f = 0; f < 70; f++) flocons.push({ x: hasard() * 1.2 - 0.1, y: hasard(), v: 0.05 + hasard() * 0.12, r: 0.8 + hasard() * 1.8 });
  }
  function dessinerCiel(zn) {
    var g = ctx.createLinearGradient(0, 0, 0, HY);
    g.addColorStop(0, zn.ciel[0]); g.addColorStop(1, zn.ciel[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HY + 2);
    if (!zn.tempete) {
      etoiles.forEach(function (s) {
        ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(t * 1.2 + s.f));
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x * W, s.y * HY, s.r, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
      // la lune
      var lx = W * 0.8, ly = HY * 0.3, lr = Math.max(14, W * 0.05);
      var hg = ctx.createRadialGradient(lx, ly, lr * 0.5, lx, ly, lr * 3);
      hg.addColorStop(0, "rgba(255,240,200,.35)"); hg.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(lx, ly, lr * 3, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff6dc"; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(214,196,150,.45)"; ctx.beginPath(); ctx.arc(lx - lr * 0.3, ly - lr * 0.2, lr * 0.22, 0, 7); ctx.arc(lx + lr * 0.35, ly + lr * 0.3, lr * 0.15, 0, 7); ctx.fill();
    }
    if (zn.aurore) {
      for (var b = 0; b < 3; b++) {
        ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 0.7 + b);
        var ag = ctx.createLinearGradient(0, HY * 0.1, 0, HY * 0.75);
        ag.addColorStop(0, "rgba(61,220,132,0)"); ag.addColorStop(0.5, b === 1 ? "#8a7dff" : "#3ddc84"); ag.addColorStop(1, "rgba(61,220,132,0)");
        ctx.fillStyle = ag; ctx.beginPath();
        ctx.moveTo(0, HY * (0.3 + b * 0.08));
        for (var x = 0; x <= W; x += W / 12) ctx.lineTo(x, HY * (0.3 + b * 0.08) + Math.sin(x / W * 6 + t * 0.6 + b) * HY * 0.08);
        ctx.lineTo(W, HY * 0.7); ctx.lineTo(0, HY * 0.7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // les nuages, qui dérivent
    nuages.forEach(function (n) {
      var w = W * 0.38 * n.s, h = w * 50 / 120, x = ((n.x + t * n.v) % 1.3 - 0.15) * W;
      if (IMG.nuage.complete) { ctx.globalAlpha = zn.tempete ? 0.9 : 0.55; ctx.drawImage(IMG.nuage, x - w / 2, n.y * HY - h / 2, w, h); ctx.globalAlpha = 1; }
    });
    // montagnes : deux plans
    montagnes("#2c4a72", 0.62, 7, 0.55); montagnes("#3f6394", 0.8, 11, 0.3);
  }
  function montagnes(couleur, haut, n, decal) {
    ctx.fillStyle = couleur; ctx.beginPath(); ctx.moveTo(0, HY + 2);
    for (var i = 0; i <= n; i++) {
      var x = i / n * W, y = HY - (i % 2 ? HY * (1 - haut) * (0.6 + 0.4 * Math.sin(i * 1.7 + decal)) : HY * 0.05);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, HY + 2); ctx.fill();
    // neige sur les sommets
    ctx.fillStyle = "rgba(240,247,255,.85)";
    for (var k = 1; k <= n; k += 2) {
      var sx = k / n * W, sy = HY - HY * (1 - haut) * (0.6 + 0.4 * Math.sin(k * 1.7 + decal)), dx = W / n * 0.28;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - dx, sy + dx * 0.9); ctx.lineTo(sx + dx, sy + dx * 0.9); ctx.fill();
    }
  }
  function dessinerSol(zn) {
    var g = ctx.createLinearGradient(0, HY, 0, H);
    g.addColorStop(0, zn.sol[0]); g.addColorStop(1, zn.sol[1]);
    ctx.fillStyle = g; ctx.fillRect(0, HY, W, H - HY);
    // la piste : un ruban plus tassé entre les deux talus
    var a = proj(200, -1.6), b = proj(200, 1.6), c = proj(-0.5, 1.6), d = proj(-0.5, -1.6);
    ctx.fillStyle = zn.piste; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
    // talus enneigés
    ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 3;
    [-1.6, 1.6].forEach(function (lx) { var p1 = proj(200, lx), p2 = proj(-0.5, lx); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); });
    // traces dans la neige qui défilent : elles donnent la vitesse
    ctx.fillStyle = "rgba(110,140,180,.35)";
    for (var k = 0; k < 26; k++) {
      var z0 = k * 4 - (avance % 4);
      [-0.5, 0.5].forEach(function (lx) {
        var p1 = proj(z0, lx), p2 = proj(z0 + 1.7, lx);
        var w1 = 2.4 * p1.p, w2 = 2.4 * p2.p;
        ctx.beginPath(); ctx.moveTo(p1.x - w1, p1.y); ctx.lineTo(p1.x + w1, p1.y); ctx.lineTo(p2.x + w2, p2.y); ctx.lineTo(p2.x - w2, p2.y); ctx.fill();
      });
    }
    if (zn.glissant) {           // reflets sur la glace
      ctx.fillStyle = "rgba(255,255,255,.35)";
      for (var r = 0; r < 8; r++) {
        var zr = (r * 9 - (avance % 9) + 72) % 72, pr = proj(zr, (r % 3) - 1 + 0.3);
        ctx.fillRect(pr.x - 14 * pr.p, pr.y, 28 * pr.p, 1.5);
      }
    }
  }
  function poser(img, x, y, w) {
    if (!img.complete || !img.naturalWidth) return;
    var h = w * img.naturalHeight / img.naturalWidth;
    ctx.drawImage(img, x - w / 2, y - h, w, h);
    return h;
  }
  function dessinerDecor(o) {
    var p = proj(o.z, o.x); if (p.p < 0.07) return;
    var base = LV * p.p;
    if (o.type === "maison") {
      var hh = poser(IMG.maison, p.x, p.y, base * 1.6 * o.s);
      // fumée de la cheminée
      if (hh) for (var k = 0; k < 3; k++) {
        var ph = (t * 0.6 + k / 3) % 1, cx = p.x + base * 1.6 * o.s * (0.22 + ph * 0.06), cy = p.y - hh * (0.95 + ph * 0.5);
        ctx.fillStyle = "rgba(230,236,245," + (0.5 * (1 - ph)) + ")";
        ctx.beginPath(); ctx.arc(cx, cy, base * (0.08 + ph * 0.12), 0, 7); ctx.fill();
      }
    } else if (o.type === "lampadaire") {
      var lh = poser(IMG.lampadaire, p.x, p.y, base * 0.28 * o.s);
      if (lh) {
        var gl = ctx.createRadialGradient(p.x, p.y - lh * 0.78, 0, p.x, p.y - lh * 0.78, base * 0.6);
        gl.addColorStop(0, "rgba(255,224,138,.45)"); gl.addColorStop(1, "rgba(255,224,138,0)");
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y - lh * 0.78, base * 0.6, 0, 7); ctx.fill();
      }
    } else if (o.type === "glace") poser(IMG.glace, p.x, p.y, base * 0.8 * o.s);
    else poser(IMG[o.type] || IMG.sapin, p.x, p.y, base * (o.type === "sapinLum" ? 1 : 1.05) * o.s);
  }
  function dessinerObjet(o) {
    var p = proj(o.z, o.c - 1); if (p.p < 0.06) return;
    var base = LV * p.p;
    if (o.cadeau) {
      var saut = Math.abs(Math.sin(t * 5 + o.c)) * base * 0.12;
      var gl = ctx.createRadialGradient(p.x, p.y - base * 0.3, 0, p.x, p.y - base * 0.3, base * 0.7);
      gl.addColorStop(0, "rgba(255,210,63,.55)"); gl.addColorStop(1, "rgba(255,210,63,0)");
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y - base * 0.3, base * 0.7, 0, 7); ctx.fill();
      poser(IMG[o.dessin], p.x, p.y - saut, base * 0.62);
      return;
    }
    var w = base * (o.dessin === "barriere" ? 1.02 : 0.88);
    var h = poser(IMG[o.dessin], p.x, p.y, w) || base;
    // le mot est posé plus tard, au-dessus de tout le décor (voir etiquettes)
    var zn = zoneDe(distance);
    if (zn.brouillard && o.z > 30) return;               // la tempête cache les mots lointains
    etiquettes.push({ o: o, x: p.x, y: p.y - h - 3, p: p.p });
  }
  /* Les mots des obstacles : du plus proche au plus lointain, chaque
     étiquette qui en chevaucherait une autre est remontée (avec un trait
     vers son obstacle), pour que les murs lointains restent lisibles. */
  var etiquettes = [];
  function dessinerEtiquettes() {
    var poses = [];
    etiquettes.sort(function (a, b) { return a.o.z - b.o.z; });
    etiquettes.forEach(function (e) {
      var fs = Math.round(Math.max(10.5, Math.min(20, 8 + 15 * e.p)));
      ctx.font = "800 " + fs + "px system-ui,-apple-system,'Segoe UI',sans-serif";
      var esp = fs * 0.08, tw = 0;
      e.o.mot.split("").forEach(function (ch) { tw += ctx.measureText(ch).width + esp; });
      tw -= esp;
      var bw = tw + fs * 0.8, bh = Math.round(fs * 1.4);
      var r = { x: e.x - bw / 2, y: e.y - bh, w: bw, h: bh };
      r.x = Math.max(2, Math.min(W - bw - 2, r.x));
      for (var n = 0; n < 12; n++) {
        var gene = poses.filter(function (q) { return r.x < q.x + q.w + 2 && q.x < r.x + r.w + 2 && r.y < q.y + q.h + 2 && q.y < r.y + r.h + 2; });
        if (!gene.length) break;
        r.y = Math.min.apply(null, gene.map(function (q) { return q.y; })) - r.h - 2;
      }
      r.fs = fs; r.tw = tw; r.esp = esp; r.e = e;
      poses.push(r);
    });
    // du plus lointain au plus proche : les proches passent devant
    for (var k = poses.length - 1; k >= 0; k--) {
      var r = poses[k], e = r.e, o = e.o, fs = r.fs;
      var vise = buf && o.mot.indexOf(buf) === 0;
      var a = Math.max(0.55, Math.min(1, e.p * 3.2));
      ctx.globalAlpha = a;
      if (r.y + r.h < e.y - 4) {                       // étiquette remontée : un fil jusqu'à l'obstacle
        ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(r.x + r.w / 2, r.y + r.h); ctx.lineTo(e.x, e.y); ctx.stroke();
      }
      ctx.font = "800 " + fs + "px system-ui,-apple-system,'Segoe UI',sans-serif";
      ctx.fillStyle = vise ? "#fff4d6" : "#fff"; ctx.strokeStyle = vise ? "#d7263d" : "#5d7ea8"; ctx.lineWidth = vise ? 2.5 : 1.4;
      arrondi(r.x, r.y, r.w, r.h, fs * 0.38); ctx.fill(); ctx.stroke();
      ctx.textBaseline = "middle";
      var x = r.x + (r.w - r.tw) / 2;
      o.mot.split("").forEach(function (ch, i) {
        ctx.fillStyle = vise && i < buf.length ? "#d7263d" : "#16233b";
        ctx.fillText(ch, x, r.y + r.h / 2 + 1);
        x += ctx.measureText(ch).width + r.esp;
      });
    }
    ctx.globalAlpha = 1;
    etiquettes = [];
  }
  function arrondi(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  /* ---------- le traîneau et ses deux rennes (vus de dos, au galop) ---------- */
  function renne(x, y, s, phase) {
    // vu de dos : croupe et queue en bas, dos qui file vers l'avant, encolure, arrière de la tête et bois
    var gal = Math.sin(t * 15 + phase), bob = Math.abs(gal) * 2.6 * s;
    y -= bob;
    ctx.lineCap = "round";
    // pattes avant (plus loin, plus sombres), puis pattes arrière : elles battent en alternance
    ctx.strokeStyle = "#3d2412"; ctx.lineWidth = 2.6 * s;
    var f1 = (7 - gal * 4) * s, f2 = (7 + gal * 4) * s;
    ctx.beginPath(); ctx.moveTo(x - 4 * s, y - 6 * s); ctx.lineTo(x - 4.5 * s, y - 6 * s + f1); ctx.moveTo(x + 4 * s, y - 6 * s); ctx.lineTo(x + 4.5 * s, y - 6 * s + f2); ctx.stroke();
    ctx.strokeStyle = "#5a3418"; ctx.lineWidth = 3.4 * s;
    var l1 = (9 + gal * 4) * s, l2 = (9 - gal * 4) * s;
    ctx.beginPath(); ctx.moveTo(x - 6 * s, y + 6 * s); ctx.lineTo(x - 7 * s, y + 6 * s + l1); ctx.moveTo(x + 6 * s, y + 6 * s); ctx.lineTo(x + 7 * s, y + 6 * s + l2); ctx.stroke();
    ctx.fillStyle = "#24160a";
    ctx.beginPath(); ctx.ellipse(x - 7 * s, y + 6 * s + l1, 2.2 * s, 1.4 * s, 0, 0, 7); ctx.ellipse(x + 7 * s, y + 6 * s + l2, 2.2 * s, 1.4 * s, 0, 0, 7); ctx.fill();
    // le dos, allongé vers l'avant
    ctx.fillStyle = "#8a5a32"; ctx.strokeStyle = "#3d2412"; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.ellipse(x, y - 1 * s, 9.5 * s, 13 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6e4424"; ctx.beginPath(); ctx.ellipse(x, y - 3 * s, 2.4 * s, 9 * s, 0, 0, 7); ctx.fill();   // la raie du dos
    // la croupe claire et la petite queue
    ctx.fillStyle = "#efe1cc"; ctx.beginPath(); ctx.ellipse(x, y + 10 * s, 6 * s, 3 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#5a3418"; ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 9 + phase) * 0.8 * s, y + 8.6 * s, 1.6 * s, 2.6 * s, 0, 0, 7); ctx.fill();
    // la sangle du harnais, rouge à grelots
    ctx.fillStyle = "#d7263d"; ctx.fillRect(x - 9.6 * s, y + 1 * s, 19.2 * s, 2.8 * s);
    ctx.fillStyle = "#f2c230";
    [-6, 0, 6].forEach(function (dx, i) { ctx.beginPath(); ctx.arc(x + dx * s, y + 4.4 * s + Math.abs(Math.sin(t * 20 + i + phase)) * 0.8 * s, 1.5 * s, 0, 7); ctx.fill(); });
    // encolure et collier
    var hb = gal * 1.2 * s;
    ctx.fillStyle = "#7a4e2a"; ctx.strokeStyle = "#3d2412";
    ctx.beginPath(); ctx.ellipse(x, y - 15 * s + hb, 4.6 * s, 6.5 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#d7263d"; ctx.beginPath(); ctx.ellipse(x, y - 12 * s + hb, 5 * s, 1.8 * s, 0, 0, 7); ctx.fill();
    // l'arrière de la tête, les oreilles, les bois
    var ty = y - 22 * s + hb;
    ctx.fillStyle = "#6e4424";
    ctx.beginPath(); ctx.ellipse(x - 5.6 * s, ty, 3.2 * s, 1.5 * s, -0.35, 0, 7); ctx.ellipse(x + 5.6 * s, ty, 3.2 * s, 1.5 * s, 0.35, 0, 7); ctx.fill();
    ctx.fillStyle = "#7a4e2a"; ctx.beginPath(); ctx.ellipse(x, ty, 4.2 * s, 3.8 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#d9b57a"; ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    [-1, 1].forEach(function (c) {
      ctx.moveTo(x + c * 2 * s, ty - 2.5 * s); ctx.quadraticCurveTo(x + c * 5 * s, ty - 9 * s, x + c * 9 * s, ty - 13 * s);
      ctx.moveTo(x + c * 4.2 * s, ty - 7 * s); ctx.lineTo(x + c * 2.6 * s, ty - 12 * s);
      ctx.moveTo(x + c * 6.6 * s, ty - 10 * s); ctx.lineTo(x + c * 10.5 * s, ty - 9.5 * s);
    });
    ctx.stroke();
  }
  function traineau() {
    var cible = couloir, vis = xVisu;
    var p = proj(0, vis - 1), s = Math.max(0.75, LV / 84);
    var penche = (cible - vis) * 0.25;
    var tremble = secousse ? (hasard() - 0.5) * secousse : 0;
    var x = p.x + Math.sin(t * 22) * 0.6 + tremble, y = BY - 6 * s;
    // les rennes trottent devant, sur la piste (c'est eux qui touchent l'obstacle en premier)
    var pr = proj(ZR, vis - 1), sr = s * pr.p * 1.25, ry = pr.y - 10 * sr, rx = pr.x + tremble;
    var ec = 13.5 * sr;
    // les traits (brancards) qui relient les rennes au traîneau
    ctx.strokeStyle = "#5a2a1e"; ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    ctx.moveTo(x - 16 * s, y - 24 * s); ctx.lineTo(rx - ec, ry + 4 * sr);
    ctx.moveTo(x + 16 * s, y - 24 * s); ctx.lineTo(rx + ec, ry + 4 * sr);
    ctx.stroke();
    ctx.strokeStyle = "#f2c230"; ctx.lineWidth = 1 * s;
    ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 36 * s); ctx.quadraticCurveTo(rx, ry - 4 * sr, rx - ec, ry - 12 * sr);
    ctx.moveTo(x + 8 * s, y - 36 * s); ctx.quadraticCurveTo(rx, ry - 4 * sr, rx + ec, ry - 12 * sr); ctx.stroke();
    renne(rx - ec, ry, sr, 0); renne(rx + ec, ry, sr, 1.4);
    ctx.save(); ctx.translate(x, y); ctx.rotate(penche);
    // ombre et patins
    ctx.fillStyle = "rgba(20,40,70,.22)"; ctx.beginPath(); ctx.ellipse(0, 2 * s, 34 * s, 6 * s, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#f2c230"; ctx.lineWidth = 3.4 * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-22 * s, 0); ctx.lineTo(-22 * s, -10 * s); ctx.moveTo(22 * s, 0); ctx.lineTo(22 * s, -10 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-28 * s, 1 * s); ctx.lineTo(-16 * s, 1 * s); ctx.moveTo(16 * s, 1 * s); ctx.lineTo(28 * s, 1 * s); ctx.stroke();
    // la hotte de cadeaux
    ctx.fillStyle = "#8a5a32"; ctx.strokeStyle = "#3d2412"; ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.ellipse(0, -38 * s, 17 * s, 13 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
    [["#1f8a4c", -9, -46], ["#4fb6ff", 4, -50], ["#ffd23f", 10, -43], ["#d7263d", -2, -42]].forEach(function (g) {
      ctx.fillStyle = g[0]; ctx.fillRect((g[1] - 4) * s, (g[2] - 4) * s, 8 * s, 8 * s);
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.strokeRect((g[1] - 4) * s, (g[2] - 4) * s, 8 * s, 8 * s);
    });
    // la caisse rouge du traîneau, bordée d'or
    ctx.fillStyle = "#c81f36"; ctx.strokeStyle = "#f2c230"; ctx.lineWidth = 3 * s;
    arrondi(-30 * s, -32 * s, 60 * s, 26 * s, 8 * s); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#ffe08a"; ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.moveTo(-20 * s, -19 * s); ctx.quadraticCurveTo(-10 * s, -27 * s, 0, -19 * s); ctx.quadraticCurveTo(10 * s, -11 * s, 20 * s, -19 * s); ctx.stroke();
    ctx.restore();
    // neige soulevée par les patins (plus fort en changeant de couloir)
    if (enJeu && !finRaison && hasard() < 0.7) for (var k = 0; k < 2 + Math.abs(cible - vis) * 6; k++)
      eclats.push({ x: x + (hasard() < 0.5 ? -24 : 24) * s, y: y, vx: (hasard() - 0.5) * 50, vy: -20 - hasard() * 40, v: 0.5, c: "#ffffff", r: 1 + hasard() * 2 });
  }
  function dessinerEclats(dt) {
    for (var i = eclats.length - 1; i >= 0; i--) {
      var e = eclats[i];
      e.v -= dt; if (e.v <= 0) { eclats.splice(i, 1); continue; }
      e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 90 * dt;
      ctx.globalAlpha = Math.min(1, e.v * 2); ctx.fillStyle = e.c;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function explosion(x, y, couleurs, n) {
    for (var i = 0; i < n; i++) eclats.push({ x: x, y: y, vx: (hasard() - 0.5) * 220, vy: -60 - hasard() * 160, v: 0.7 + hasard() * 0.4,
      c: couleurs[i % couleurs.length], r: 1.5 + hasard() * 2.5 });
  }
  function dessinerNeige(zn, dt) {
    var vent = zn.tempete ? 0.5 : 0.06, nb = zn.tempete ? flocons.length : 40;
    ctx.fillStyle = "rgba(255,255,255,.85)";
    for (var i = 0; i < nb; i++) {
      var f = flocons[i];
      f.y += f.v * dt * (zn.tempete ? 2.6 : 1); f.x -= vent * dt;
      if (f.y > 1) { f.y = 0; f.x = hasard() * 1.2 - 0.1; } if (f.x < -0.1) f.x = 1.1;
      ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.r, 0, 7); ctx.fill();
    }
    if (zn.brouillard) {
      var g = ctx.createLinearGradient(0, HY - 10, 0, HY + (BY - HY) * 0.45);
      g.addColorStop(0, "rgba(220,228,238,.95)"); g.addColorStop(1, "rgba(220,228,238,0)");
      ctx.fillStyle = g; ctx.fillRect(0, HY - 10, W, (BY - HY) * 0.45 + 10);
    }
  }

  function dessiner(dt) {
    if (!ctx) return;
    var zn = zoneDe(distance);
    ctx.clearRect(0, 0, W, H);
    dessinerCiel(zn); dessinerSol(zn);
    // du plus loin au plus proche : décor et obstacles mêlés
    var tout = decor.map(function (o) { return { z: o.z, d: o, decor: true }; })
      .concat(objets.map(function (o) { return { z: o.z, d: o }; }))
      .sort(function (a, b) { return b.z - a.z; });
    var devant = ZR + 0.6;
    tout.forEach(function (x) { if (x.z > devant) { if (x.decor) dessinerDecor(x.d); else dessinerObjet(x.d); } });
    dessinerEtiquettes();
    traineau();
    tout.forEach(function (x) { if (x.z <= devant) { if (x.decor) dessinerDecor(x.d); else dessinerObjet(x.d); } });
    etiquettes = [];
    dessinerEclats(dt || 0);
    dessinerNeige(zn, dt || 0);
    // le décompte, la zone qui commence
    if (compte > 0) texteCentre(compte > 2 ? "3" : compte > 1 ? "2" : compte > 0.15 ? "1" : "Hue !", 64, 1);
    if (banniere) {
      var a = Math.min(1, banniere.v, 2.6 - banniere.v);
      if (a > 0) texteCentre(banniere.txt, 21, a, Math.max(24, HY * 0.42));
    }
  }
  function texteCentre(txt, fs, a, y) {
    ctx.globalAlpha = a; ctx.font = "800 " + fs + "px system-ui,-apple-system,'Segoe UI',sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(8,20,44,.85)"; ctx.strokeText(txt, W / 2, y || H * 0.5);
    ctx.fillStyle = "#fff"; ctx.fillText(txt, W / 2, y || H * 0.5);
    ctx.textAlign = "start"; ctx.globalAlpha = 1;
  }

  /* ---------- l'avancée ---------- */
  function son(n, i) { if (P().son) P().son(n, i); }
  function vibre(ms) { if (P().vibrate) P().vibrate(ms); }
  function majHud() {
    hudDist.textContent = "📏 " + Math.floor(distance) + " m";
    hudScore.textContent = "⭐ " + score();
    hudCad.textContent = "🎁 " + cadeaux;
  }
  function majSaisie() { saisieEl.textContent = buf || " "; }
  function couloirVers(d) {
    if (!enJeu || compte > 0 || finRaison) return;
    var c = Math.max(0, Math.min(2, couloir + d));
    if (c === couloir) return;
    couloir = c; son("touche");
  }
  function boucle(maintenant) {
    if (!enJeu) return;
    var dt = Math.min(0.05, (maintenant - dernier) / 1000);
    dernier = maintenant; t += dt;
    // le traîneau glisse vers son couloir (plus lentement sur la glace)
    var zn = zoneDe(distance), vg = zn.glissant ? 7 : 16;
    xVisu += (couloir - xVisu) * Math.min(1, dt * vg);
    if (secousse) secousse = Math.max(0, secousse - dt * 30);
    if (banniere) { banniere.v -= dt; if (banniere.v <= -0.2) banniere = null; }
    if (finRaison) {                                  // l'accident : un instant de secousse avant l'écran de fin
      dessiner(dt);
      if (t - finAt > 0.9) { fin(); return; }
      raf = requestAnimationFrame(boucle); return;
    }
    if (compte > 0) { compte -= dt; dessiner(dt); raf = requestAnimationFrame(boucle); return; }
    if (zn !== zoneCourante) { zoneCourante = zn; banniere = { txt: zn.nom, v: 2.4 }; if (distance > 1) son("niveau"); }
    var v = vitesse(), pas = v * dt;
    distance += pas; avance += pas;
    objets.forEach(function (o) { o.z -= pas; });
    decor.forEach(function (o) { o.z -= pas; });
    // nouvelles rangées et nouveau décor
    if (avance >= prochaine) { avance = 0; prochaine = rangee(); }
    decoAvance += pas * zn.densite;
    while (decoAvance >= 4.5) { decoAvance -= 4.5; decorNouveau(horizon() + 8); }
    decor = decor.filter(function (o) { return o.z > -3; });
    // au niveau du traîneau
    for (var i = objets.length - 1; i >= 0; i--) {
      var o = objets[i];
      if (!o.passe && o.z < ZR + 0.5 && o.z > -0.6 && o.c === couloir) {
        o.passe = true;
        var pp = proj(o.z, o.c - 1);
        if (o.cadeau) {
          cadeaux++; son("correct", 3); explosion(pp.x, pp.y - 20, ["#ffd23f", "#d7263d", "#fff"], 14);
          objets.splice(i, 1); continue;
        }
        return accident("💥 Choc contre " + (o.dessin === "sapin" ? "un sapin" : o.dessin === "bonhomme" ? "un bonhomme de neige" : o.dessin === "glace" ? "un bloc de glace" : "une barrière") + " !", pp);
      }
      if (o.z < -0.6 && o.cadeau && !o.passe) return accident("🎁 Cadeau oublié : le Père Noël compte sur toi !", proj(o.z, o.c - 1));
      if (o.z < -4) objets.splice(i, 1);
    }
    dessiner(dt);
    majHud();
    if (sorte === "jour" && Math.floor(t * 2) !== Math.floor((t - dt) * 2)) sauverEnCours();
    raf = requestAnimationFrame(boucle);
  }
  var prochaine = 0;
  function accident(raison, p) {
    finRaison = raison; finAt = t; secousse = 10;
    son("absent"); vibre([60, 40, 60]);
    explosion(p.x, p.y - 20, ["#ffffff", "#cfe3f7", "#8a5a32"], 26);
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
    if (finRaison) return;
    if (a === "back") { buf = buf.slice(0, -1); majSaisie(); return; }
    if (a === "enter") { buf = ""; majSaisie(); return; }
    if (!/^[A-Z]$/.test(a)) return;
    var essai = buf + a;
    var visibles = objets.filter(function (o) { return o.mot && o.z < horizon() + 2; });
    if (!visibles.some(function (o) { return o.mot.indexOf(essai) === 0; })) {
      saisieEl.classList.remove("faux"); void saisieEl.offsetWidth; saisieEl.classList.add("faux");
      son("refuse"); return;
    }
    buf = essai; son("touche");
    var cible = visibles.filter(function (o) { return o.mot === buf; }).sort(function (x, y) { return x.z - y.z; })[0];
    if (cible) {
      detruits++; buf = ""; son("correct", 2);
      var p = proj(cible.z, cible.c - 1);
      explosion(p.x, p.y - LV * p.p * 0.4, cible.dessin === "glace" ? ["#9fd8f5", "#e9f8ff", "#5fb3e0"] : cible.dessin === "bonhomme" ? ["#fff", "#d7263d", "#f28a1a"] :
                cible.dessin === "barriere" ? ["#c81f36", "#fff", "#8a5a32"] : ["#1f7a46", "#f3f8ff", "#0d3f26"], 22);
      objets.splice(objets.indexOf(cible), 1);
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
      '<div class="tr-regles">' +
        '<span>⌨️</span><span><b>Tape le mot</b> d\'un obstacle pour le faire exploser</span>' +
        '<span>↔️</span><span><b>Change de couloir</b> : flèches, glisser le doigt, ou ◀ ▶</span>' +
        '<span>🎁</span><span><b>Ramasse chaque cadeau</b> : en laisser passer un, c\'est perdu</span>' +
        '<span>💥</span><span><b>Un seul choc</b> et la course s\'arrête</span>' +
        '<span>🏔️</span><span>Six zones, de plus en plus rapides : jusqu\'où iras-tu ?</span></div>' +
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
        if (a === "partage") return;
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
    sorte = s; enJeu = true; couloir = 1; xVisu = 1; buf = ""; distance = 0; detruits = 0; cadeaux = 0; t = 0; avance = 0; decoAvance = 0;
    objets = []; eclats = []; decor = []; finRaison = ""; secousse = 0; zoneCourante = null; banniere = null;
    prochaine = 26; compte = 3.4;
    preparerCiel();
    for (var z = 4; z < 120; z += 4.5) decor.push({ type: tirer(ZONES[0].deco), z: z, x: (hasard() < 0.5 ? -1 : 1) * (2.15 + hasard() * 1.6), s: 0.85 + hasard() * 0.35 });
    ecran.classList.remove("show");
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    mesurer(); majHud(); majSaisie();
    dernier = performance.now();
    raf = requestAnimationFrame(boucle);
    if (P().mesure) P().mesure("partie:traineau");
  }
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
    var raison = finRaison; finRaison = "";
    buf = ""; majSaisie();
    var sc = score(), o = { sorte: sorte, score: sc, distance: Math.floor(distance), detruits: detruits, cadeaux: cadeaux };
    son(sc >= C.seuilJeton ? "gagne" : "perdu");
    var lignes = [];
    if (sorte === "jour") { if (!apercu()) ecrire(CLE_JOUR, { day: jour(), commence: true, fait: true, score: sc }); lignes = conclure(o); }
    else if (sorte === "bonus") lignes = conclure(o);
    else lignes.push("Entraînement : cette course ne compte pas.");
    var b = bonusDispo(), j = etatJour(), zn = zoneDe(o.distance);
    montrer('<h3>' + (sc >= C.seuilJeton ? "Quelle descente !" : "Fin de la descente") + '</h3>' +
      (raison ? '<div class="raison">' + raison + '</div>' : '') +
      '<div class="gros">⭐ ' + sc + '</div>' +
      '<p>📏 ' + o.distance + ' m · 💥 ' + detruits + ' obstacle' + (detruits > 1 ? "s" : "") + ' · 🎁 ' + cadeaux + ' cadeau' + (cadeaux > 1 ? "x" : "") +
      '<br>Zone atteinte : ' + zn.nom + '</p>' +
      (lignes.length ? '<p>' + lignes.join("<br>") + '</p>' : '') +
      (!(j && j.fait) ? '<button class="btn" data-tr="jour">Course du jour</button>'
        : b > 0 ? '<button class="btn" data-tr="bonus">Tentative bonus (🛷 ' + b + ')</button>' : '') +
      '<button class="btn ghost" data-tr="entrainement">S\'entraîner</button>' +
      (sorte !== "entrainement" ? '<button class="btn ghost" data-tr="partage">📤 Partager</button>' : '') +
      '<button class="btn ghost" data-tr="top">🏆 Classement</button>');
    lierBoutons();
    var pt = ecran.querySelector('[data-tr="partage"]');
    if (pt) pt.addEventListener("click", function () {
      var txt = "🛷 Mot en Six — Traîneau de Noël\n⭐ " + sc + " points · 📏 " + o.distance + " m · " + zn.nom +
        "\nTape les mots pour dégager la piste :\n" + (P().lienPartage ? P().lienPartage("?mode=traineau&src=parttraineau") : "");
      if (P().partager) P().partager(txt);
    });
  }

  /* ---------- ouverture et arrêt (appelés par index.html) ---------- */
  function ouvrir() {
    construire();
    box.style.display = "flex";
    mesurer();
    preparerCiel();
    distance = 0; objets = []; decor = []; eclats = []; t = 0; compte = 0; banniere = null; xVisu = couloir = 1;
    for (var z = 4; z < 120; z += 4.5) decor.push({ type: tirer(ZONES[0].deco), z: z, x: (hasard() < 0.5 ? -1 : 1) * (2.15 + hasard() * 1.6), s: 0.85 + hasard() * 0.35 });
    // les images sont prêtes au bout de quelques millisecondes : on redessine le décor de fond
    dessiner(0); setTimeout(function () { if (!enJeu) dessiner(0); }, 120);
    var j = etatJour();
    if (j && j.commence && !j.fait && !apercu()) {
      ecrire(CLE_JOUR, { day: jour(), commence: true, fait: true, score: j.score || 0 });
      conclure({ sorte: "jour", score: j.score || 0, distance: j.distance || 0, detruits: j.detruits || 0, cadeaux: j.cadeaux || 0 });
    }
    accueil();
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
    if (enJeu && sorte !== "entrainement") fin();
    enJeu = false; cancelAnimationFrame(raf);
    objets = []; finRaison = "";
    if (box) { box.style.display = "none"; ecran.classList.remove("show"); }
  }

  window.Traineau = {
    actif: actif,
    ouvrir: ouvrir,
    arreter: arreter,
    touche: touche,
    fleche: fleche,
    zones: ZONES,
    get enJeu() { return enJeu; },
    get tentatives() { return bonusDispo(); },
    faitAujourdhui: function () { var j = etatJour(); return !!(j && j.fait); },
    // tests : état de la course
    // tests : sauter à une distance pendant un entraînement (pour voir les zones)
    _aller: function (d) { if (enJeu && sorte === "entrainement") { distance = d; } },
    get etat() {
      return { sorte: sorte, couloir: couloir, distance: distance, detruits: detruits, cadeaux: cadeaux, score: score(), compte: compte,
               zone: zoneDe(distance).nom, vitesse: vitesse(), fin: finRaison,
               objets: objets.map(function (o) { return { c: o.c, z: o.z, mot: o.mot, cadeau: !!o.cadeau }; }) };
    }
  };
})();
