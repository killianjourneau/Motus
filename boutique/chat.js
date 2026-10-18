/* Mot en Six — le chat noir
 *
 * Un compagnon purement décoratif : il se promène sur le bord haut de la
 * grille, dort, joue, mange, se roule, chasse les chauves-souris… Il
 * n'apporte rien au jeu, et c'est voulu : on le regarde, c'est tout.
 *
 * Deux parties :
 *  - DESSIN : le chat en SVG (tête de face, quatre poses, accessoires) ;
 *  - VIE    : ses comportements, enchaînés au hasard.
 *
 * Chargé à la demande par boutique/boutique.js (seulement pour qui a adopté
 * le chat ou ouvre la boutique). Toutes les animations sont des
 * transformations : la carte graphique s'en charge, le jeu n'est pas ralenti,
 * et tout s'arrête quand l'onglet est caché.
 */
(function () {
  "use strict";

  /* =====================================================================
     DESSIN
     ===================================================================== */
  // pelage : noir légèrement violacé, cerné d'un liseré plus clair pour
  // rester lisible sur le fond sombre du jeu
  var F = "#1e1929", FL = "#15111d", R = "#5e5378", OEIL = "#dfe65e", NEZ = "#d6849c";

  function patte(x, y, h, cls, loin, ox, oy) {
    return '<rect class="' + cls + '" x="' + x + '" y="' + y + '" width="6.4" height="' + h + '" rx="3.2" fill="' + (loin ? FL : F) +
      '" stroke="' + R + '" stroke-width=".9" style="transform-origin:' + ox + 'px ' + oy + 'px"/>';
  }
  function queue(d, ox, oy) {
    return '<g class="queue" style="transform-origin:' + ox + 'px ' + oy + 'px">' +
      '<path d="' + d + '" fill="none" stroke="' + R + '" stroke-width="7.4" stroke-linecap="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + F + '" stroke-width="5.6" stroke-linecap="round"/></g>';
  }

  /* ---------- accessoires de la tête (repère : centre de la tête) ---------- */
  var ACC = {
    // — tête —
    sorciere: '<g><path d="M-16,-9 Q0,-15.5 16,-9 Q0,-4.5 -16,-9 Z" fill="#2b1748" stroke="#6a45a0" stroke-width=".7"/>' +
      '<path d="M-8.5,-11 C-6.5,-19 -2,-29 5,-36 C4.5,-31 6.5,-27 10.5,-25.5 C8,-24.5 7,-19 8.5,-11 Z" fill="#3c2168" stroke="#6a45a0" stroke-width=".7"/>' +
      '<path d="M-8.6,-11.5 Q0,-14.2 8.5,-11.5 L8.2,-14.6 Q0,-17.3 -8,-14.6 Z" fill="#f0a020"/>' +
      '<rect x="-1.7" y="-16.4" width="3.4" height="3.2" rx=".5" fill="none" stroke="#ffe39a" stroke-width=".8"/></g>',
    citrouille: '<g><ellipse cx="0" cy="-14" rx="11" ry="7" fill="#f07a1a" stroke="#b9520b" stroke-width=".7"/>' +
      '<ellipse cx="-4" cy="-14" rx="4.4" ry="7" fill="#e86d12" stroke="#b9520b" stroke-width=".5"/>' +
      '<ellipse cx="4" cy="-14" rx="4.4" ry="7" fill="#e86d12" stroke="#b9520b" stroke-width=".5"/>' +
      '<ellipse cx="0" cy="-14" rx="2.4" ry="7" fill="#f38a2c" stroke="#b9520b" stroke-width=".4"/>' +
      '<path d="M-5.5,-15.5 L-3.5,-18 L-1.8,-15.5 Z M1.8,-15.5 L3.5,-18 L5.5,-15.5 Z" fill="#5a2306"/>' +
      '<path d="M-4.5,-11.5 Q0,-9 4.5,-11.5 L3,-12.5 L1.5,-11.2 L0,-12.5 L-1.5,-11.2 L-3,-12.5 Z" fill="#5a2306"/>' +
      '<path d="M-.8,-20.5 C-1,-23 0,-24.5 1.8,-25 L2.3,-24 C1.2,-23.4 .9,-22 1,-20.5 Z" fill="#4f7a2a"/>' +
      '<path d="M1.5,-23 C4,-25.5 7,-24.5 7.5,-22.5 C5,-21.5 3,-22 1.5,-23 Z" fill="#6aa13a"/></g>',
    couronne: '<g><path d="M-9.5,-10.5 L-10.5,-22 L-5,-16 L0,-24.5 L5,-16 L10.5,-22 L9.5,-10.5 Q0,-12.5 -9.5,-10.5 Z" fill="#f2c230" stroke="#a87c0e" stroke-width=".7" stroke-linejoin="round"/>' +
      '<circle cx="-10.5" cy="-22.5" r="1.4" fill="#ff4f6d"/><circle cx="0" cy="-25" r="1.6" fill="#4fb6ff"/><circle cx="10.5" cy="-22.5" r="1.4" fill="#ff4f6d"/>' +
      '<circle cx="0" cy="-14.5" r="1.8" fill="#4fd18b" stroke="#a87c0e" stroke-width=".4"/></g>',
    noeud: '<g transform="translate(7.5,-14) rotate(18)"><path d="M0,0 L-6.5,-4 L-6,4.5 Z M0,0 L6.5,-4 L6,4.5 Z" fill="#ff5c9a" stroke="#c23a72" stroke-width=".6" stroke-linejoin="round"/>' +
      '<circle r="1.8" fill="#ff86b5" stroke="#c23a72" stroke-width=".5"/></g>',
    // — yeux — (le masque passe SOUS les yeux, les lunettes par-dessus)
    masque: '<path d="M-12,-2.5 C-10,-7 -3.5,-6 0,-3.5 C3.5,-6 10,-7 12,-2.5 C11,3.5 5,4.2 1.6,1.8 L0,1 L-1.6,1.8 C-5,4.2 -11,3.5 -12,-2.5 Z" fill="#7b3fbf" stroke="#b07fe8" stroke-width=".6"/>' +
      '<path d="M12,-2.5 L15.5,-5 M-12,-2.5 L-15.5,-5" stroke="#b07fe8" stroke-width=".7"/>',
    lunettes: '<g fill="rgba(200,230,255,.13)" stroke="#e5c35c" stroke-width="1"><circle cx="-5" cy="0" r="4.7"/><circle cx="5" cy="0" r="4.7"/></g>' +
      '<path d="M-.4,-.6 Q0,-1.8 .4,-.6 M-9.7,-.8 L-13,-2.5 M9.7,-.8 L13,-2.5" fill="none" stroke="#e5c35c" stroke-width="1"/>',
    // — bouche —
    vampire: '<path d="M-2.4,6.5 L-1.1,6.8 L-1.7,9.8 Z M2.4,6.5 L1.1,6.8 L1.7,9.8 Z" fill="#fff" stroke="#d9d4e6" stroke-width=".3"/>',
    sucette: '<path d="M2.4,7.2 L9.5,12.5" stroke="#efe9f7" stroke-width="1.1" stroke-linecap="round"/>' +
      '<circle cx="11.2" cy="13.8" r="3.4" fill="#ff6fae" stroke="#c43d7d" stroke-width=".5"/>' +
      '<path d="M11.2,13.8 m-1.6,0 a1.6,1.6 0 1,1 1.6,1.6 a2.4,2.4 0 0,1 -2.4,-2.4" fill="none" stroke="#fff" stroke-width=".6"/>',
    // — cou — (dessiné DERRIÈRE la tête : le menton recouvre le haut)
    grelot: '<path d="M-9.5,8.5 Q0,14 9.5,8.5 L9.5,11.5 Q0,17 -9.5,11.5 Z" fill="#d8342c" stroke="#9e1f1a" stroke-width=".5"/>' +
      '<circle cx="0" cy="16" r="2.6" fill="#f2c230" stroke="#a87c0e" stroke-width=".5"/><path d="M-1.2,16.6 L1.2,16.6" stroke="#7a5a08" stroke-width=".5"/>',
    papillon: '<path d="M0,13 L-6.5,9.5 L-6.5,16.5 Z M0,13 L6.5,9.5 L6.5,16.5 Z" fill="#f0681a" stroke="#a8450d" stroke-width=".6" stroke-linejoin="round"/>' +
      '<circle cx="0" cy="13" r="1.7" fill="#c8540f"/>',
    medaille: '<path d="M-9.5,8.5 Q0,14 9.5,8.5 L9.5,11.3 Q0,16.8 -9.5,11.3 Z" fill="#2f6fd6" stroke="#1d4a96" stroke-width=".5"/>' +
      '<path d="M0,15 C-1.2,13.4 -3.8,13.8 -3.8,16 C-3.8,18.1 -1.5,19.4 0,20.9 C1.5,19.4 3.8,18.1 3.8,16 C3.8,13.8 1.2,13.4 0,15 Z" fill="#f2c230" stroke="#a87c0e" stroke-width=".5"/>' +
      '<path d="M-1.6,15.6 Q-1.2,14.8 -.4,15.2" fill="none" stroke="#fff6c8" stroke-width=".5"/>',
    echarpe: '<path d="M-10.5,8 Q0,14.5 10.5,8 L11,12.5 Q0,19 -11,12.5 Z" fill="#f0681a" stroke="#a8450d" stroke-width=".5"/>' +
      '<path d="M-6,10.6 L-6.3,15 M0,12 L0,16.5 M6,10.6 L6.3,15" stroke="#6a3aa8" stroke-width="1.6"/>' +
      '<path d="M4,14 L7,25 L11.5,23.5 L8.5,13 Z" fill="#f0681a" stroke="#a8450d" stroke-width=".5"/>' +
      '<path d="M5.3,18 L9.7,16.6 M6.5,22 L10.8,20.6" stroke="#6a3aa8" stroke-width="1.4"/>'
  };
  var EMPLACEMENT = { sorciere:"tete", citrouille:"tete", couronne:"tete", noeud:"tete",
                      masque:"yeux", lunettes:"yeux", vampire:"bouche", sucette:"bouche",
                      grelot:"cou", papillon:"cou", echarpe:"cou", medaille:"cou", cape:"dos", ailes:"dos" };

  /* La tête, de face : c'est elle qui rend le chat attachant, quelle que
     soit la pose du corps. Ordre des calques : cou (derrière), oreilles,
     tête, masque, yeux, nez et bouche, moustaches, bouche, lunettes, chapeau. */
  function tete(p) {
    p = p || {};
    var porte = function (slot) { var id = p[slot]; return (id && ACC[id] && EMPLACEMENT[id] === slot) ? id : null; };
    var yeux = porte("yeux");
    var oreille = function (s) {
      return '<path d="M' + (-12.5 * s) + ',-2 L' + (-11.5 * s) + ',-18.5 L' + (-2.5 * s) + ',-10.5 Z" fill="' + F + '" stroke="' + R + '" stroke-width="1" stroke-linejoin="round"/>' +
             '<path d="M' + (-10.6 * s) + ',-5.2 L' + (-10.1 * s) + ',-15 L' + (-4.8 * s) + ',-10.4 Z" fill="#4a2c40"/>';
    };
    var oeil = function (x) {
      return '<ellipse cx="' + x + '" cy="0" rx="3.4" ry="3.9" fill="' + OEIL + '" stroke="#98a524" stroke-width=".4"/>' +
             '<g class="pu"><ellipse cx="' + x + '" cy=".2" rx="1.15" ry="3" fill="#0b0910"/>' +
             '<circle cx="' + (x + 1.1) + '" cy="-1.5" r=".95" fill="#fff"/></g>';
    };
    return '<g class="cn-tete">' +
      (porte("cou") ? ACC[p.cou] : "") +
      oreille(1) + oreille(-1) +
      '<path d="M-13.5,1.5 C-13.5,-8 -7.5,-11.6 0,-11.6 C7.5,-11.6 13.5,-8 13.5,1.5 C13.5,8.6 7.4,12.2 0,12.2 C-7.4,12.2 -13.5,8.6 -13.5,1.5 Z" fill="' + F + '" stroke="' + R + '" stroke-width="1"/>' +
      (yeux === "masque" ? ACC.masque : "") +
      '<g class="yo">' + oeil(-5) + oeil(5) + '</g>' +
      '<g class="yf" fill="none" stroke="#8d82a8" stroke-width=".9" stroke-linecap="round"><path d="M-8,.6 Q-5,2.6 -2,.6 M2,.6 Q5,2.6 8,.6"/></g>' +
      '<g class="yc" fill="none" stroke="' + OEIL + '" stroke-width="1.3" stroke-linecap="round"><path d="M-8,1.6 Q-5,-2.2 -2,1.6 M2,1.6 Q5,-2.2 8,1.6"/></g>' +
      '<path d="M-1.7,3.8 L1.7,3.8 L0,5.7 Z" fill="' + NEZ + '" stroke-linejoin="round"/>' +
      '<path class="bf" d="M0,5.7 Q-1.2,7.5 -2.9,6.9 M0,5.7 Q1.2,7.5 2.9,6.9" fill="none" stroke="#8d82a8" stroke-width=".75" stroke-linecap="round"/>' +
      '<g class="bo"><ellipse cx="0" cy="8" rx="2.6" ry="3" fill="#5a2340"/><ellipse cx="0" cy="9.6" rx="1.6" ry="1.1" fill="#e07893"/></g>' +
      '<g stroke="rgba(235,226,255,.5)" stroke-width=".55" stroke-linecap="round"><path d="M-7,4.6 L-19,2.4 M-7,5.8 L-19,7 M7,4.6 L19,2.4 M7,5.8 L19,7"/></g>' +
      (porte("bouche") ? ACC[p.bouche] : "") +
      (yeux === "lunettes" ? ACC.lunettes : "") +
      (porte("tete") ? ACC[p.tete] : "") +
      '</g>';
  }

  /* ---------- accessoires du dos, propres à chaque pose ---------- */
  var AILE = "M0,0 C-4,-8 -12,-14 -23,-15.5 C-19.5,-12.5 -18.5,-9 -19.5,-5.5 C-15.5,-7.5 -12.5,-5.5 -11.5,-2.5 C-8.5,-5.5 -4.5,-4.5 -3.5,-1.5 Z";
  function ailes(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<g class="aile2"><path d="' + AILE + '" transform="rotate(-18)" fill="#2c1840" stroke="#5c3d84" stroke-width=".8" stroke-linejoin="round"/></g>' +
      '<g class="aile1"><path d="' + AILE + '" fill="#3c2158" stroke="#7a52aa" stroke-width=".8" stroke-linejoin="round"/></g></g>';
  }
  var CAPE = {
    debout: { dos: '<path d="M69,36 C60,33 48,34.5 39,38 C34,44 33.5,52 36.5,58 C45,55 55,52 64,50.5 C68,47 70,42 69,36 Z" fill="#7a1426" stroke="#b02a43" stroke-width=".8"/>' +
                   '<path d="M64,41 C56,41 47,43 41,46 C40,50 40.5,54 42,56.5 C49,54 56,52 62,51 Z" fill="#a81d36" opacity=".55"/>',
              col: '<path d="M62,40 L59.5,25.5 L68,32 Z M88,40 L90.5,25.5 L82,32 Z" fill="#7a1426" stroke="#b02a43" stroke-width=".7" stroke-linejoin="round"/>' },
    assis:  { dos: '<path d="M55,33 C46,34 37.5,42 33,52 C30,60 30.5,66 33.5,69.5 L45,69.5 C42.5,60 46,48 57,40 Z" fill="#7a1426" stroke="#b02a43" stroke-width=".8"/>',
              col: '<path d="M45.5,34 L43,19.5 L51.5,26 Z M70.5,34 L73,19.5 L64.5,26 Z" fill="#7a1426" stroke="#b02a43" stroke-width=".7" stroke-linejoin="round"/>' }
  };
  function dos(pose, p) {
    var id = p && p.dos;
    if (id === "ailes") return { avant: pose === "debout" ? ailes(53, 39) : ailes(48, 40), col: "" };
    if (id === "cape" && CAPE[pose]) return { avant: CAPE[pose].dos, col: CAPE[pose].col };
    return { avant: "", col: "" };
  }

  /* ---------- objets de la maison ---------- */
  function gamelle(belle) {
    return belle
      ? '<g class="cn-gamelle"><path d="M83,62 L103,62 L100.5,70 L85.5,70 Z" fill="#2f7fd1" stroke="#1d5797" stroke-width=".7" stroke-linejoin="round"/>' +
        '<ellipse cx="93" cy="62" rx="10" ry="2.4" fill="#1d5797"/><ellipse cx="93" cy="61.6" rx="8" ry="1.6" fill="#8a5a3a"/>' +
        '<path d="M88.5,66 Q91,64 93.5,66 Q91,68 88.5,66 Z M93.5,66 L95.8,64.6 L95.8,67.4 Z" fill="#d9eeff"/></g>'
      : '<g class="cn-gamelle"><path d="M84,63 L102,63 L100,70 L86,70 Z" fill="#9aa3b5" stroke="#6b7385" stroke-width=".7"/>' +
        '<ellipse cx="93" cy="63" rx="9" ry="2.2" fill="#6b7385"/><ellipse cx="93" cy="62.7" rx="7.2" ry="1.4" fill="#8a5a3a"/></g>';
  }
  function coussin() {
    return '<g><ellipse cx="50" cy="66.5" rx="37" ry="6" fill="#5b2f8f" stroke="#8b5cc7" stroke-width=".8"/>' +
      '<ellipse cx="50" cy="64.6" rx="31" ry="3" fill="#6d3ba9"/>' +
      '<circle cx="14" cy="67" r="1.7" fill="#f2c230"/><circle cx="86" cy="67" r="1.7" fill="#f2c230"/></g>';
  }

  /* ---------- les quatre poses (repère 100 × 72, sol à y = 70) ---------- */
  function corps(pose, p, maison) {
    p = p || {}; maison = maison || {};
    var d = dos(pose, p);
    if (pose === "assis") {
      return '<g class="tout">' +
        queue("M38,68 C28,70.5 19,69 17,63 C16,60 18,58 20,59", 38, 68) +
        '<ellipse cx="42" cy="56" rx="15" ry="13.5" fill="' + F + '" stroke="' + R + '" stroke-width="1"/>' +
        patte(53.5, 46, 24, "pa1", true, 56.7, 48) +
        '<path d="M36,62 C33,49 40,37 53,34 C61,32.5 66,38 65.5,48 C65,58 60,66 52,69.5 L40,69.5 Z" fill="' + F + '" stroke="' + R + '" stroke-width="1"/>' +
        '<ellipse cx="37" cy="68.6" rx="8.5" ry="2.6" fill="' + F + '" stroke="' + R + '" stroke-width=".9"/>' +
        d.avant + d.col +
        '<g transform="translate(58,25)"><g class="cn-t">' + tete(p) + '</g></g>' +
        patte(58.5, 47, 23, "pa2", false, 61.7, 49) +
        '</g>';
    }
    if (pose === "dodo") {
      return (maison.coussin ? coussin() : "") +
        '<g class="tout"' + (maison.coussin ? ' transform="translate(0,-3.5)"' : "") + '>' +
        '<g class="respire">' +
        '<ellipse cx="33" cy="57.5" rx="13" ry="11" fill="' + F + '" stroke="' + R + '" stroke-width="1"/>' +
        '<ellipse cx="48" cy="59.5" rx="27" ry="11" fill="' + F + '" stroke="' + R + '" stroke-width="1"/>' +
        '</g>' +
        queue("M22,62 C20,71 46,72.5 64,69", 22, 62) +
        '<ellipse cx="66" cy="68.4" rx="7" ry="2.3" fill="' + F + '" stroke="' + R + '" stroke-width=".9"/>' +
        '<g transform="translate(72,57) rotate(-6) scale(.96)"><g class="cn-t">' + tete(p) + '</g></g>' +
        '</g>';
    }
    if (pose === "dos") {
      return '<g class="tout roule">' +
        queue("M24,61 C14,63 9,59 9,53", 24, 61) +
        patte(38.5, 39, 17, "jb1", true, 41.7, 55) + patte(63.5, 37, 17, "jb2", true, 66.7, 53) +
        '<ellipse cx="48" cy="58.5" rx="25.5" ry="10.5" fill="' + F + '" stroke="' + R + '" stroke-width="1"/>' +
        '<ellipse cx="48" cy="54.5" rx="15" ry="4.5" fill="#29233a"/>' +
        patte(32.5, 40, 16, "jb3", false, 35.7, 55) + patte(57.5, 38, 16, "jb4", false, 60.7, 53) +
        '<g transform="translate(74,56.5) rotate(-22)"><g class="cn-t">' + tete(p) + '</g></g>' +
        '</g>';
    }
    // debout (marche, saut, affût, étirement, repas, jeu)
    return '<g class="tout">' +
      '<g transform="translate(-3,0)">' + gamelle(maison.gamelle) + '</g>' +
      patte(32, 49, 21, "pf1", true, 35.2, 51) + patte(62, 49, 21, "pa1", true, 65.2, 51) +
      queue("M31,46 C21,45 15,37 16,26 C16.5,21 19,18 21,18", 31, 46) +
      '<path d="M28,48 C27.5,40 34,36.5 45,37 C55,37.5 62,35.5 68.5,37.5 C75.5,40 78.5,46.5 76,52 C73.5,56.5 68,58 61,58 L39,58 C32,58 28.5,54 28,48 Z" fill="' + F + '" stroke="' + R + '" stroke-width="1"/>' +
      patte(37, 50, 20, "pf2", false, 40.2, 52) + patte(67, 50, 20, "pa2", false, 70.2, 52) +
      d.avant + d.col +
      '<g transform="translate(75,31)"><g class="cn-t">' + tete(p) + '</g></g>' +
      '</g>';
  }

  function svg(pose, p, maison, cls) {
    return '<svg class="cn-svg ' + (cls || "") + '" viewBox="0 0 100 72" aria-hidden="true">' + corps(pose, p, maison) + '</svg>';
  }

  /* ---------- petits objets indépendants ---------- */
  var JOUET = {
    papier: '<svg viewBox="-10 -10 20 20"><circle r="8.5" fill="#e9e6f0" stroke="#a9a3b8" stroke-width=".8"/>' +
            '<path d="M-6,-3 L-1,-1 L1,-6 M2,0 L6,3 M-3,4 L0,1 L3,6" fill="none" stroke="#a9a3b8" stroke-width=".7"/></svg>',
    pelote: '<svg viewBox="-10 -10 20 20"><circle r="8.5" fill="#e0384f" stroke="#a51f33" stroke-width=".8"/>' +
            '<path d="M-7,-4 C-2,-7 4,-6 7,-2 M-8,1 C-3,-2 4,-1 8,3 M-5,6 C-1,3 3,4 5,7 M-2,-8 C-5,-2 -4,4 0,8" fill="none" stroke="#ff7d8f" stroke-width=".9"/></svg>',
    souris: '<svg viewBox="-12 -10 24 20"><path d="M10,3 C14,4 15,8 12,9" fill="none" stroke="#e98fa8" stroke-width="1" stroke-linecap="round"/>' +
            '<ellipse cx="0" cy="3" rx="9.5" ry="5.8" fill="#9ea3b3" stroke="#6d7284" stroke-width=".8"/>' +
            '<circle cx="-5.5" cy="-2.5" r="3" fill="#9ea3b3" stroke="#6d7284" stroke-width=".7"/><circle cx="-5.5" cy="-2.5" r="1.6" fill="#f2a7bb"/>' +
            '<circle cx="-8.2" cy="2" r=".9" fill="#222"/><circle cx="-9.8" cy="4" r=".9" fill="#e98fa8"/></svg>'
  };
  var CADEAU = {
    feuille: '<svg viewBox="-10 -10 20 20"><path d="M0,-9 C5,-6 8.5,-1 6.5,4 C4.5,8 -.5,9.5 -4,6.5 C-8,3 -6.5,-5 0,-9 Z" fill="#e8781e" stroke="#a8450d" stroke-width=".7"/>' +
             '<path d="M-3,5.5 C-1,1 1.5,-3 2.5,-6.5 M-.8,1.4 L2.6,1.8 M-2.2,3.6 L-4.6,2.4" fill="none" stroke="#a8450d" stroke-width=".6"/><path d="M-3,5.5 L-5.5,9" stroke="#7a3a0c" stroke-width=".9" stroke-linecap="round"/></svg>',
    plume:   '<svg viewBox="-10 -10 20 20"><path d="M7,-8 C1,-7 -5,-1 -6,6 C-1,5 5,0 7,-8 Z" fill="#d9d2ef" stroke="#8d82a8" stroke-width=".6"/>' +
             '<path d="M7,-8 C2,-2 -2,3 -8,9" fill="none" stroke="#8d82a8" stroke-width=".7" stroke-linecap="round"/></svg>',
    bonbon:  '<svg viewBox="-12 -8 24 16"><path d="M-6,0 L-11,-4.5 L-11,4.5 Z M6,0 L11,-4.5 L11,4.5 Z" fill="#ff9ec7" stroke="#c43d7d" stroke-width=".5" stroke-linejoin="round"/>' +
             '<ellipse rx="6.5" ry="4.8" fill="#ff6fae" stroke="#c43d7d" stroke-width=".6"/><path d="M-3,-4 L1,4.2 M1,-4.6 L4.6,3" stroke="#fff" stroke-width="1.1" opacity=".8"/></svg>'
  };
  var NOM_CADEAU = { feuille: "une feuille d'automne", plume: "une plume", bonbon: "un bonbon" };
  function chauveSouris() {
    var g = "M30 16 C24 6 14 3 3 8 C7 10 9 13 8 18 C11 16 14 17 15 21 C18 18 22 18 24 22 C25 19 27 18 30 19 Z";
    var d = g.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, function (m, x, y) { return (64 - +x) + " " + y; });
    return '<svg viewBox="0 0 64 34"><g fill="#0b0514" stroke="rgba(255,190,120,.28)" stroke-width=".8">' +
      '<path class="cs-aile" d="' + g + '"/><path class="cs-aile" d="' + d + '"/>' +
      '<path d="M28 13 L29 8 L31 12 L33 12 L35 8 L36 13 C38 16 37 23 32 26 C27 23 26 16 28 13 Z"/></g>' +
      '<circle cx="30.4" cy="15" r=".9" fill="#ffb347"/><circle cx="33.6" cy="15" r=".9" fill="#ffb347"/></svg>';
  }
  function lanterne() {
    return '<svg viewBox="-14 -16 28 30"><ellipse cx="0" cy="12.5" rx="11" ry="1.8" fill="rgba(0,0,0,.35)"/>' +
      '<ellipse cx="0" cy="2" rx="12" ry="10" fill="#f07a1a" stroke="#b9520b" stroke-width=".8"/>' +
      '<ellipse cx="-4.5" cy="2" rx="5" ry="10" fill="#e86d12" stroke="#b9520b" stroke-width=".5"/>' +
      '<ellipse cx="4.5" cy="2" rx="5" ry="10" fill="#e86d12" stroke="#b9520b" stroke-width=".5"/>' +
      '<g class="ln-feu" fill="#ffd34d"><path d="M-7,0 L-4,-4 L-1.5,0 Z M1.5,0 L4,-4 L7,0 Z"/>' +
      '<path d="M-7,4.5 Q0,10 7,4.5 L5,4 L3.5,6 L1.5,4.2 L0,6.2 L-1.5,4.2 L-3.5,6 L-5,4 Z"/></g>' +
      '<path d="M-1,-7.5 C-1.2,-11 0,-13 2.5,-14 L3,-12.8 C1.5,-12 1,-10 1.1,-7.5 Z" fill="#4f7a2a"/></svg>';
  }

  /* Vignette pour la boutique : l'objet porté par une tête de chat, ou
     l'objet seul pour la maison. */
  function vignette(id) {
    if (id === "chat") return svg("assis", {}, {});
    if (EMPLACEMENT[id] === "dos") { var o = {}; o.dos = id; return svg("assis", o, {}); }
    if (EMPLACEMENT[id]) {
      var q = {}; q[EMPLACEMENT[id]] = id;
      return '<svg viewBox="-24 -38 48 58" aria-hidden="true">' + tete(q) + '</svg>';
    }
    if (id === "coussin") return '<svg viewBox="8 54 84 18" aria-hidden="true">' + coussin() + '</svg>';
    if (id === "gamelle") return '<svg viewBox="80 56 26 16" aria-hidden="true">' + gamelle(true) + '</svg>';
    if (id === "lanterne") return lanterne();
    if (JOUET[id]) return JOUET[id];
    return "";
  }

  /* =====================================================================
     STYLE
     ===================================================================== */
  var CSS = [
    "#chatScene{position:fixed;inset:0;pointer-events:none;z-index:40;overflow:hidden;}",
    ".cn{position:absolute;left:0;top:0;will-change:transform;}",
    ".cn-sens{width:100%;height:100%;transition:transform .18s;}",
    ".cn-svg{width:100%;height:100%;overflow:visible;display:block;filter:drop-shadow(0 0 2.5px rgba(170,140,255,.28));}",
    ":root[data-theme=\"light\"] .cn-svg{filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.25));}",
    ".cn-svg *{transform-box:view-box;}",
    // yeux : ouverts par défaut ; fermés en dormant ou en bâillant ; plissés de bonheur
    ".cn-svg .yf,.cn-svg .yc,.cn-svg .bo{display:none;}",
    ".dort .yo,.baille .yo,.content .yo{display:none;}",
    ".dort .yf,.baille .yf{display:inline;}",
    ".content .yc{display:inline;}",
    ".baille .bo{display:inline;} .baille .bf{display:none;}",
    ".cn-svg .yo{transform-origin:0 0;transition:transform .07s;}",
    ".cligne .yo{transform:scaleY(.12);}",
    // queue : balancement tranquille
    ".cn-svg .queue{animation:cnQueue 3.2s ease-in-out infinite;}",
    "@keyframes cnQueue{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(7deg)}}",
    ".affut .queue{animation-duration:.5s;}",
    // marche : pattes en diagonale, léger roulis du corps
    ".cn-svg .pa1,.cn-svg .pa2,.cn-svg .pf1,.cn-svg .pf2{transition:transform .25s;}",
    ".marche .pa1,.marche .pf2{animation:cnPas .58s ease-in-out infinite;}",
    ".marche .pa2,.marche .pf1{animation:cnPas .58s ease-in-out infinite;animation-delay:-.29s;}",
    "@keyframes cnPas{0%,100%{transform:rotate(17deg)}50%{transform:rotate(-17deg)}}",
    ".marche .tout{animation:cnRoulis .29s ease-in-out infinite alternate;}",
    "@keyframes cnRoulis{to{transform:translateY(-.9px)}}",
    // saut : pattes avant tendues vers l'avant, arrière vers l'arrière
    ".saute .pa1,.saute .pa2{transform:rotate(-48deg);} .saute .pf1,.saute .pf2{transform:rotate(42deg);}",
    ".saute .queue{animation:none;transform:rotate(-28deg);}",
    // affût : ramassé, l'arrière-train qui frétille
    ".affut .tout{transform-origin:70px 70px;animation:cnFretille .2s ease-in-out infinite alternate;}",
    "@keyframes cnFretille{from{transform:translateY(3.5px) rotate(-1.6deg)}to{transform:translateY(3.5px) rotate(1.6deg)}}",
    // étirement : l'avant s'allonge au ras du sol
    ".cn-svg .tout{transition:transform .5s;}",
    ".etire .tout{transform-origin:34px 70px;transform:rotate(9deg);} .etire .pa1,.etire .pa2{transform:rotate(-58deg);}",
    ".etire .queue{animation:none;transform:rotate(-20deg);}",
    // repas : tête dans la gamelle
    ".cn-svg .cn-gamelle{opacity:0;transition:opacity .4s;}",
    ".mange .cn-gamelle{opacity:1;}",
    ".cn-svg .cn-t{transition:transform .35s;}",
    ".mange .cn-t{transform:translate(7px,17px) rotate(10deg);animation:cnMange .45s ease-in-out infinite alternate;}",
    "@keyframes cnMange{from{transform:translate(7px,16px) rotate(10deg)}to{transform:translate(7px,18.5px) rotate(13deg)}}",
    // jeu : un coup de patte
    ".tape .pa2{transition:transform .1s;transform:rotate(-75deg);}",
    // toilette : la patte avant monte à la bouche, la tête se penche
    ".toilette .pa2{transform:rotate(168deg) scaleY(.72);transition:transform .35s;}",
    ".toilette .cn-t{animation:cnLeche .5s ease-in-out infinite alternate;}",
    "@keyframes cnLeche{from{transform:rotate(8deg)}to{transform:rotate(14deg) translateY(1px)}}",
    // le regard : les pupilles suivent ce qui l'intéresse
    ".cn-svg .pu{transform:translate(var(--rgx,0px),var(--rgy,0px));transition:transform .35s ease-out;}",
    // tristesse : tête basse, queue immobile
    ".triste .cn-t{transform:translateY(2.6px) rotate(-5deg);} .triste .queue{animation:none;}",
    // inquiétude (Pendu) : queue basse, le corps tendu
    ".inquiet .queue{animation:none;transform:rotate(-72deg);} .cn-pose-assis.inquiet .queue{transform:rotate(-8deg);}",
    ".inquiet .tout{transform:translateY(1.5px);}",
    // bulle d'émotion au-dessus de la tête
    ".cn-emo{position:absolute;left:50%;top:0;transform:translate(-50%,-100%) scale(.4);opacity:0;pointer-events:none;white-space:nowrap;" +
      "font:15px/1 system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif;background:rgba(255,255,255,.94);color:#222;" +
      "padding:4px 6px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.3);transition:opacity .2s,transform .25s cubic-bezier(.3,1.6,.6,1);}",
    ".cn-emo::after{content:'';position:absolute;left:50%;bottom:-4px;margin-left:-4px;border:4px solid transparent;border-bottom:0;border-top-color:rgba(255,255,255,.94);}",
    ".cn-emo.vu{opacity:1;transform:translate(-50%,-100%) scale(1);}",
    // cadeaux déposés au bord de la grille
    ".cn-cadeau{transition:opacity .5s;} .cn-cadeau.pris{opacity:0;}",
    // regard levé (chasse)
    ".guette .cn-t{transform:translateY(-1.5px) rotate(-6deg);}",
    // sieste : respiration lente
    ".cn-svg .respire{transform-origin:48px 70px;animation:cnRespire 3.6s ease-in-out infinite;}",
    "@keyframes cnRespire{50%{transform:scaleY(1.045)}}",
    // sur le dos : il se tortille
    ".cn-svg .roule{transform-origin:48px 66px;animation:cnRoule 1.5s ease-in-out infinite;}",
    "@keyframes cnRoule{0%,100%{transform:rotate(-9deg)}50%{transform:rotate(9deg)}}",
    ".cn-svg .jb1,.cn-svg .jb3{animation:cnGigote .5s ease-in-out infinite alternate;}",
    ".cn-svg .jb2,.cn-svg .jb4{animation:cnGigote .5s ease-in-out infinite alternate-reverse;}",
    "@keyframes cnGigote{from{transform:rotate(-16deg)}to{transform:rotate(14deg)}}",
    // ailes de chauve-souris portées
    ".cn-svg .aile1,.cn-svg .aile2{animation:cnAile 1.1s ease-in-out infinite;}",
    ".cn-svg .aile2{animation-delay:-.15s;}",
    ".saute .aile1,.saute .aile2{animation-duration:.25s;}",
    "@keyframes cnAile{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(16deg)}}",
    // sommeil, cœurs, nom
    ".cn-zzz{position:absolute;left:68%;top:14%;font:700 11px system-ui,sans-serif;color:#b9a8e6;display:none;}",
    ".dort.cn-pose-dodo .cn-zzz{display:block;}",
    ".cn-zzz span{position:absolute;opacity:0;animation:cnZ 3.3s ease-out infinite;}",
    ".cn-zzz span:nth-child(2){animation-delay:1.1s;font-size:9px;} .cn-zzz span:nth-child(3){animation-delay:2.2s;font-size:13px;}",
    "@keyframes cnZ{0%{opacity:0;transform:translate(0,6px)}25%{opacity:.9}100%{opacity:0;transform:translate(12px,-22px)}}",
    ".cn-coeur{position:absolute;color:#ff6b9a;font-size:13px;pointer-events:none;animation:cnCoeur 1.5s ease-out forwards;}",
    "@keyframes cnCoeur{0%{opacity:0;transform:translateY(0) scale(.6)}20%{opacity:1}100%{opacity:0;transform:translateY(-34px) scale(1.15)}}",
    ".cn-nom{position:absolute;left:50%;bottom:118%;transform:translateX(-50%);white-space:nowrap;background:var(--cell,#222);color:var(--ink,#fff);" +
      "font:700 11px system-ui,sans-serif;padding:3px 8px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.35);opacity:0;transition:opacity .3s;}",
    ".cn-nom.vu{opacity:1;}",
    // objets indépendants
    ".cn-objet{position:absolute;left:0;top:0;will-change:transform;}",
    ".cn{transition:opacity .35s;}",
    ".cn-objet svg{width:100%;height:100%;display:block;overflow:visible;}",
    ".cn-jouet{transition:opacity .4s;}",
    ".cn-cs .cs-aile{transform-box:view-box;transform-origin:32px 17px;animation:cnCs .2s ease-in-out infinite;}",
    "@keyframes cnCs{50%{transform:scaleY(-.45)}}",
    ".cn-lanterne .ln-feu{animation:cnFeu 2.6s ease-in-out infinite;}",
    "@keyframes cnFeu{0%,100%{opacity:.95}40%{opacity:.7}60%{opacity:1}75%{opacity:.8}}",
    ".cn-lanterne svg{filter:drop-shadow(0 0 6px rgba(255,160,40,.55));}",
    // moins d'animations demandées : le chat reste paisible, sans balancement
    "@media (prefers-reduced-motion: reduce){#chatScene *{animation:none !important;transition:none !important;}}"
  ].join("\n");

  /* =====================================================================
     VIE — un compagnon, pas un économiseur d'écran
     ---------------------------------------------------------------------
     Minuit a des BESOINS qui évoluent avec le temps (énergie, faim, envie
     de jouer, humeur) : ce sont eux qui décident de ce qu'il fait, pas un
     simple tirage au sort. Il REMARQUE la partie (il suit des yeux la case
     où l'on écrit, s'enthousiasme d'un bon essai, console après une
     défaite, s'inquiète au Pendu), il se SOUVIENT (il fait la fête quand
     on revient après une absence), et une COMPLICITÉ se construit jour
     après jour, qui lui fait gagner de nouvelles attentions.
     Le jeu n'en dépend jamais : rien n'est bloqué, rien n'est puni.
     ===================================================================== */
  var P = function () { return window.MotusPont || {}; };
  var calmeVoulu = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var scene = null, el = null, sens = null, zzz = null, bulle = null, emo = null, lanterneEl = null;
  var etat = { porte: {}, maison: {}, nom: "Minuit", complicite: 0, niveau: 1 };
  var x = 0, y = 0, dir = 1, pose = "", classes = "", actionEnCours = "";
  var H = 40, W = 56, sol = 0, gauche = 0, droite = 300, ancreOk = false, support = "grille";
  var actif = false, raf = 0, dernier = 0, depuisAncre = 1, depuisSauve = 0;
  var taches = [], generation = 0, interruption = null;
  var ANNULE = { annule: true };

  function hasard(a, b) { return a + Math.random() * (b - a); }
  function borne(v) { return Math.max(0, Math.min(100, v)); }
  function aujourdhui() {
    var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  /* ---------- l'esprit : besoins et souvenirs ----------
     energie : se dépense en bougeant, revient en dormant
     faim    : monte doucement ; chaque mot trouvé remplit sa gamelle
     ennui   : monte au repos ; jouer et chasser le font retomber
     humeur  : caresses et victoires la font monter */
  var CLE_ESPRIT = "motus.chatEsprit";
  var esprit = null;
  function chargerEsprit() {
    var e = null;
    try { e = JSON.parse(localStorage.getItem(CLE_ESPRIT)); } catch (x) {}
    var v = { energie: 75, faim: 35, ennui: 30, humeur: 60, croquettes: 1, maj: 0, jour: "", gains: {}, cadeauAt: 0, reclameAt: 0 };
    if (e && typeof e === "object") for (var k in v) if (typeof e[k] === typeof v[k] && e[k] !== null) v[k] = e[k];
    return v;
  }
  function sauverEsprit() {
    if (!esprit) return;
    esprit.maj = Date.now();
    try { localStorage.setItem(CLE_ESPRIT, JSON.stringify(esprit)); } catch (x) {}
  }
  // le temps passe aussi quand on n'est pas là : il s'est reposé, il a un peu faim
  function rattraper() {
    var h = esprit.maj ? (Date.now() - esprit.maj) / 3600000 : 0;
    if (h > 0.02) {
      esprit.energie = borne(esprit.energie + h * 35);
      esprit.faim = Math.min(85, esprit.faim + h * 18);
      esprit.ennui = Math.min(75, esprit.ennui + h * 8);
      esprit.humeur = borne(esprit.humeur + (55 - esprit.humeur) * Math.min(1, h / 6));
    }
    return h;
  }
  function besoins(dt) {
    var dort = pose === "dodo", bouge = classes.indexOf("marche") >= 0, effort = /saute|affut|tape/.test(classes);
    esprit.energie = borne(esprit.energie + (dort ? 0.30 : effort ? -0.45 : bouge ? -0.10 : -0.025) * dt);
    esprit.faim = borne(esprit.faim + (dort ? 0.006 : 0.013) * dt);
    esprit.ennui = borne(esprit.ennui + (dort ? 0.004 : effort ? -1.2 : 0.035) * dt);
    esprit.humeur += (55 - esprit.humeur) * 0.002 * dt;
  }

  /* ---------- la complicité : elle se construit, jour après jour ----------
     Chaque source a son plafond quotidien : revenir chaque jour compte plus
     que de caresser cent fois le même soir. */
  var PLAFOND = { visite: 2, caresse: 3, victoire: 4, cadeau: 1, console: 1 };
  function lien(raison, n) {
    if (esprit.jour !== aujourdhui()) { esprit.jour = aujourdhui(); esprit.gains = {}; }
    var g = esprit.gains[raison] || 0, max = PLAFOND[raison] || 1;
    if (g >= max) return;
    var d = Math.min(n || 1, max - g);
    esprit.gains[raison] = g + d;
    sauverEsprit();
    if (window.Boutique && Boutique.lien) { try { Boutique.lien(d); } catch (x) {} }
  }

  /* ---------- placement : sur la grille, ou sur le mot du Pendu ---------- */
  function surface() {
    var b = document.getElementById("board");
    if (b && b.offsetParent !== null && b.style.display !== "none") return { el: b, type: "grille" };
    var pb = document.getElementById("penduBox"), pr = document.getElementById("penduRow");
    if (pb && pr && pb.style.display !== "none" && pr.offsetParent !== null) return { el: pr, type: "pendu" };
    return null;
  }
  function ancrer() {
    var s = surface(), r = s ? s.el.getBoundingClientRect() : null;
    if (!r || r.height < 20 || r.width < 40) { ancreOk = false; return; }
    support = s.type;
    var t = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tile")) || 48;
    // la place libre entre ce qui est au-dessus (bandeau, compteur du Pendu) et la surface
    var plafond = 0;
    ["hud", "giveUpBtn", support === "pendu" ? "penduLives" : ""].forEach(function (id) {
      var e = id && document.getElementById(id);
      if (e && e.offsetParent !== null && getComputedStyle(e).visibility !== "hidden" && getComputedStyle(e).opacity !== "0") {
        var b = e.getBoundingClientRect(); if (b.height > 0 && b.bottom <= r.top + 2) plafond = Math.max(plafond, b.bottom);
      }
    });
    var libre = r.top - plafond;
    H = Math.max(30, Math.min(68, t * 1.25, libre * 1.1));
    W = H * 100 / 72;
    sol = r.top;
    gauche = r.left - W * 0.15;
    droite = Math.max(gauche + 10, r.right - W * 0.85);
    x = Math.max(gauche, Math.min(droite, x));
    el.style.width = W + "px"; el.style.height = H + "px";
    if (lanterneEl) {
      var lw = H * 0.62;
      lanterneEl.style.width = lw + "px"; lanterneEl.style.height = lw * 30 / 28 + "px";
      lanterneEl.style.transform = "translate(" + (r.right - lw * 0.95) + "px," + (sol - lw * 30 / 28 * 0.9) + "px)";
    }
    cadeaux.forEach(function (c) { placerCadeau(c); });
    ancreOk = true;
  }

  function dessiner(p, cls) {
    if (p !== pose) {
      pose = p;
      sens.innerHTML = svg(p, etat.porte, etat.maison);
    }
    var c = "cn cn-pose-" + p + (cls ? " " + cls : "");
    if (c !== classes) { classes = c; el.className = c; }
  }
  function appliquer() {
    el.style.transform = "translate(" + x.toFixed(1) + "px," + (sol - H * 70 / 72 + y).toFixed(1) + "px)";
    sens.style.transform = dir < 0 ? "scaleX(-1)" : "none";
  }

  /* ---------- le regard ---------- */
  var TETE = { debout: [0.75, 31 / 72], assis: [0.58, 25 / 72], dodo: [0.72, 57 / 72], dos: [0.74, 56 / 72] };
  var regardT = 0;
  function teteEcran() {
    var f = TETE[pose] || TETE.assis;
    return { x: x + W * (dir > 0 ? f[0] : 1 - f[0]), y: sol - H * 70 / 72 + y + H * f[1], fx: dir > 0 ? f[0] : 1 - f[0], fy: f[1] };
  }
  /* tx, ty : point de l'écran à regarder (null : il te regarde, toi) */
  function regarder(tx, ty, ms) {
    if (!el) return;
    var t = teteEcran();
    var gx = tx == null ? 0 : Math.max(-1, Math.min(1, (tx - t.x) / (W * 0.9)));
    var gy = ty == null ? 0 : Math.max(-1, Math.min(1, (ty - t.y) / (H * 1.2)));
    el.style.setProperty("--rgx", (gx * 1.35 * dir).toFixed(2) + "px");
    el.style.setProperty("--rgy", (gy * 1.1).toFixed(2) + "px");
    clearTimeout(regardT);
    if (ms !== 0) regardT = setTimeout(function () { regarder(null, null, 0); }, ms || 2600);
  }
  function tourner(tx) { if (tx != null) dir = tx >= x + W / 2 ? 1 : -1; }

  /* ---------- tâches animées, avancées par la boucle ---------- */
  function tache(f, mouvement) {
    var g = generation;
    return new Promise(function (ok, ko) {
      taches.push({ f: f, ok: ok, ko: ko, g: g, m: !!mouvement });
      if (mouvement && lent) { clearTimeout(lent); lent = 0; dernier = performance.now(); raf = requestAnimationFrame(boucle); }
    });
  }
  /* tâche de fond (jouet qui roule, chauve-souris qui vole) : tourne
     jusqu'à ce qu'on l'arrête, ou qu'elle se termine d'elle-même */
  function fond(f) {
    var o = { stop: false };
    o.fin = tache(function (dt) { return o.stop || f(dt); }, true);
    o.fin.catch(function () {});
    return o;
  }
  function pause(ms) {
    var t = 0;
    return tache(function (dt) { t += dt * 1000; return t >= ms; });
  }
  function marcherVers(cible, vitesse) {
    cible = Math.max(gauche, Math.min(droite, cible));
    dir = cible >= x ? 1 : -1;
    return tache(function (dt) {
      var v = (vitesse || H * 0.95) * dt, d = cible - x;
      if (Math.abs(d) <= v) { x = cible; return true; }
      x += v * Math.sign(d); return false;
    }, true);
  }
  function bond(hauteur, duree, avance) {
    var t = 0, x0 = x;
    return tache(function (dt) {
      t += dt * 1000;
      var k = Math.min(1, t / duree);
      y = -4 * hauteur * k * (1 - k);
      x = Math.max(gauche, Math.min(droite, x0 + (avance || 0) * k));
      if (k >= 1) { y = 0; return true; }
      return false;
    }, true);
  }
  function annulerTout() {
    generation++;
    var t = taches; taches = [];
    t.forEach(function (k) { k.ko(ANNULE); });
    y = 0;
  }

  /* Une image par écran quand il bouge ; cinq par seconde quand il est
     assis ou endormi (seules les attentes avancent, les petites animations
     du corps sont l'affaire du navigateur). */
  var lent = 0;
  function prochaine() {
    var bouge = taches.some(function (k) { return k.m && k.g === generation; });
    if (bouge) raf = requestAnimationFrame(boucle);
    else lent = setTimeout(function () { lent = 0; raf = requestAnimationFrame(boucle); }, 200);
  }
  function boucle(t) {
    raf = 0;
    if (!actif) return;
    var dt = Math.min(0.25, ((t - dernier) || 16) / 1000); dernier = t;
    depuisAncre += dt; depuisSauve += dt;
    if (depuisAncre > 0.4) { depuisAncre = 0; ancrer(); }
    if (!ancreOk || document.hidden) { el.style.display = "none"; suspendre(); return; }
    el.style.display = "";
    besoins(dt);
    if (depuisSauve > 20) { depuisSauve = 0; sauverEsprit(); }
    var encore = [];
    taches.forEach(function (k) {
      if (k.g !== generation) return;
      var fini = false;
      try { fini = k.f(dt); } catch (e) { fini = true; }
      if (fini) k.ok(); else encore.push(k);
    });
    taches = encore;
    appliquer();
    prochaine();
  }
  // quand rien n'est affiché ou l'onglet caché : plus aucune image calculée
  var reveil = 0;
  function suspendre() {
    if (reveil) return;
    sauverEsprit();
    reveil = setInterval(function () {
      if (!actif) { clearInterval(reveil); reveil = 0; return; }
      ancrer();
      if (ancreOk && !document.hidden) {
        clearInterval(reveil); reveil = 0;
        dernier = performance.now();
        if (!raf && !lent) raf = requestAnimationFrame(boucle);
      }
    }, 800);
  }

  /* ---------- petits gestes de vie : clignements, coups d'œil ---------- */
  var clignTimer = 0;
  function cligner() {
    clearTimeout(clignTimer);
    clignTimer = setTimeout(function () {
      if (!actif) return;
      el.classList.add("cligne");
      setTimeout(function () {
        if (!actif) return;
        el.classList.remove("cligne"); classes = el.className;
        // de temps en temps, un coup d'œil de côté, puis vers toi
        if (pose !== "dodo" && Math.random() < 0.3) regarder(x + W / 2 + hasard(-3, 3) * W, sol - hasard(0, 2) * H, hasard(900, 2200));
        cligner();
      }, 140);
    }, hasard(2500, 6500));
  }

  /* ---------- petits effets ---------- */
  function coeurs(n) {
    for (var i = 0; i < n; i++) (function (i) {
      setTimeout(function () {
        if (!el) return;
        var c = document.createElement("span");
        c.className = "cn-coeur"; c.textContent = "♥";
        c.style.left = (hasard(0.35, 0.8) * W) + "px"; c.style.top = (-H * 0.1) + "px";
        el.appendChild(c);
        setTimeout(function () { c.remove(); }, 1600);
      }, i * 260);
    })(i);
  }
  function emote(t, ms) {
    if (!emo) return;
    var h = teteEcran();
    emo.textContent = t;
    emo.style.left = (h.fx * 100) + "%";
    emo.style.top = ((h.fy - 0.34) * 100) + "%";
    emo.classList.remove("vu"); void emo.offsetWidth; emo.classList.add("vu");
    clearTimeout(emo._t);
    emo._t = setTimeout(function () { if (emo) emo.classList.remove("vu"); }, ms || 1800);
  }
  function montrerNom(suffixe) {
    bulle.textContent = (etat.nom || "Minuit") + (suffixe || " ♥");
    bulle.classList.add("vu");
    clearTimeout(bulle._t);
    bulle._t = setTimeout(function () { bulle.classList.remove("vu"); }, 2200);
  }
  function miaou(ronron) {
    // pas un son avant que le joueur ait touché la page (les navigateurs le refusent, à raison)
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    var ctx = P().audio && P().audio();
    if (!ctx) return;
    try {
      var t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      if (ronron) {
        // ronronnement : un grave qui vibre doucement
        var lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = "sawtooth"; o.frequency.value = 52;
        lfo.frequency.value = 24; lg.gain.value = 0.025;
        lfo.connect(lg); lg.connect(g.gain);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.03, t0 + 0.25);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
        lfo.start(t0); lfo.stop(t0 + 1.85);
      } else {
        o.type = "triangle";
        o.frequency.setValueAtTime(520, t0);
        o.frequency.exponentialRampToValueAtTime(820, t0 + 0.12);
        o.frequency.exponentialRampToValueAtTime(430, t0 + 0.42);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.48);
      }
      o.connect(g); g.connect(ctx.destination);
      o.start(t0); o.stop(t0 + (ronron ? 1.85 : 0.5));
    } catch (e) {}
  }

  function jouetsPossedes() {
    var l = ["pelote", "souris"].filter(function (k) { return etat.maison[k]; });
    return l.length ? l : ["papier"];
  }
  function objet(cls, html, w, h) {
    var o = document.createElement("div");
    o.className = "cn-objet " + cls; o.innerHTML = html;
    o.style.width = w + "px"; o.style.height = h + "px";
    scene.insertBefore(o, el);
    return o;
  }
  function caseActive() { try { return P().caseActive ? P().caseActive() : null; } catch (e) { return null; } }
  function centreX() { return x + W / 2; }
  function loin(tx) { return tx != null && Math.abs(tx - centreX()) > W * 1.1; }
  // une place à côté d'un point, sans le cacher
  function aCoteDe(tx) {
    var c = tx - W / 2 + (tx > centreX() ? -W * 0.6 : W * 0.6);
    if (c < gauche || c > droite) c = tx - W / 2 + (tx > centreX() ? W * 0.6 : -W * 0.6);
    return c;
  }

  /* ---------- les cadeaux (complicité 3) ---------- */
  var cadeaux = [];
  function placerCadeau(c) {
    var t = H * 0.34;
    c.el.style.width = t + "px"; c.el.style.height = t + "px";
    var r = surface(); r = r ? r.el.getBoundingClientRect() : null;
    if (!r) return;
    var cx = Math.max(r.left + t * 0.5, Math.min(r.right - t * 1.5, c.x));
    c.el.style.transform = "translate(" + (cx - t / 2).toFixed(1) + "px," + (r.top - t * 0.9).toFixed(1) + "px)";
  }
  function deposerCadeau(type, px) {
    var c = { type: type, x: px, el: objet("cn-cadeau", CADEAU[type], 10, 10) };
    cadeaux.push(c); placerCadeau(c);
    c.fin = setTimeout(function () { retirerCadeau(c); }, 120000);
    return c;
  }
  function retirerCadeau(c) {
    clearTimeout(c.fin);
    c.el.classList.add("pris");
    setTimeout(function () { c.el.remove(); }, 500);
    cadeaux = cadeaux.filter(function (k) { return k !== c; });
  }

  /* =====================================================================
     CE QU'IL FAIT DE LUI-MÊME
     ===================================================================== */
  var debutCalme = Date.now(), derniereTouche = 0, toucheX = null, toucheY = null;
  var ACTIONS = {
    promenade: function () {
      var cible = x;
      for (var i = 0; i < 6 && Math.abs(cible - x) < W * 0.8; i++) cible = hasard(gauche, droite);
      dessiner("debout", "marche");
      return marcherVers(cible);
    },
    assis: function () {
      dessiner("assis");
      return pause(hasard(3500, 8000));
    },
    toilette: function () {
      dessiner("assis");
      return pause(700).then(function () { dessiner("assis", "toilette"); return pause(hasard(2600, 4200)); })
        .then(function () { dessiner("assis"); return pause(900); });
    },
    baille: function () {
      dessiner("assis");
      return pause(800).then(function () { dessiner("assis", "baille"); return pause(1500); })
        .then(function () { dessiner("assis"); return pause(1200); });
    },
    // il dort jusqu'à être reposé (plus longtemps la nuit, ou si on le laisse tranquille)
    dodo: function (dejaCouche) {
      var calme = (Date.now() - debutCalme) / 60000, h = new Date().getHours();
      var nuit = (h >= 22 || h < 7);
      var duree = Math.max(15000, (92 - esprit.energie) / 0.30 * 1000) * (nuit ? 1.4 : 1) * (calme > 5 ? 1.3 : 1);
      duree = Math.min(duree, 6 * 60000);
      var avant = dejaCouche === true ? pause(10) : (dessiner("assis", "baille"), pause(1300));
      return avant.then(function () { dessiner("dodo", "dort"); return pause(duree); })
        .then(function () { dessiner("debout", "etire"); return pause(1900); })
        .then(function () { dessiner("debout"); return pause(500); });
    },
    roulade: function () {
      dessiner("dos", "content");
      return pause(hasard(3000, 5000)).then(function () { dessiner("debout", "etire"); return pause(1600); })
        .then(function () { dessiner("debout"); return pause(400); });
    },
    etirement: function () {
      dessiner("debout", "etire");
      return pause(2100).then(function () { dessiner("debout"); return pause(500); });
    },
    // il mange ce qu'il y a dans sa gamelle : une croquette par mot trouvé
    mange: function () {
      if (esprit.croquettes <= 0) return ACTIONS.reclame();
      if (x + W * 1.1 > droite + W * 0.85) dir = -1; else if (x < gauche + W * 0.3) dir = 1;
      dessiner("debout");
      return pause(300).then(function () { dessiner("debout", "mange"); return pause(hasard(4500, 6500)); })
        .then(function () {
          esprit.croquettes = Math.max(0, esprit.croquettes - 1);
          esprit.faim = borne(esprit.faim - 55); esprit.humeur = borne(esprit.humeur + 5); sauverEsprit();
          dessiner("debout"); return pause(700);
        })
        .then(function () { dessiner("assis", "toilette"); return pause(2200); });
    },
    // gamelle vide et le ventre qui crie : il te le fait savoir (gentiment, et pas trop souvent)
    reclame: function () {
      esprit.reclameAt = Date.now(); sauverEsprit();
      dessiner("assis"); regarder(null);
      emote("🐟", 2600); miaou(false);
      return pause(2800).then(function () { dessiner("assis", "toilette"); return pause(1800); });
    },
    joue: function () {
      var l = jouetsPossedes(), type = l[Math.floor(Math.random() * l.length)];
      var taille = H * 0.36, haut = taille * (type === "souris" ? 20 / 24 : 1), jx = 0, rot = 0;
      var o = objet("cn-jouet", JOUET[type], taille, haut);
      o.style.opacity = "0";
      if (x + W * 1.6 > droite + W * 0.85) dir = -1; else if (x < gauche + W * 0.6) dir = 1;
      jx = x + W / 2 + dir * W * 0.62;
      var suivi = fond(function () {
        o.style.transform = "translate(" + (jx - taille / 2).toFixed(1) + "px," + (sol - haut * 0.98).toFixed(1) + "px) rotate(" + rot.toFixed(0) + "deg)";
        return false;
      });
      var coup = function (n) {
        if (n <= 0) return Promise.resolve();
        var cote = jx >= x + W / 2 ? 1 : -1;
        dessiner("debout", "marche");
        return marcherVers(jx - cote * W * 0.62 - W / 2).then(function () {
          dir = jx >= x + W / 2 ? 1 : -1;
          regarder(jx, sol, 1500);
          dessiner("debout", "affut"); return pause(hasard(400, 900));
        }).then(function () {
          dessiner("debout", "tape"); return pause(150);
        }).then(function () {
          dessiner("debout");
          var dist = hasard(W * 0.9, W * 2) * dir, but = jx + dist;
          var bas = gauche + W * 0.3, hautX = droite + W * 0.7;
          if (but < bas || but > hautX) but = jx - dist * 0.7;
          but = Math.max(bas, Math.min(hautX, but));
          return tache(function (dt) {
            var r = but - jx; if (dt > 0.05) dt = 0.05;
            if (Math.abs(r) < 0.6) { jx = but; return true; }
            var pas = r * Math.min(1, dt * 2.4);
            jx += pas; rot += pas / (taille / 2) * 57.3;
            return false;
          });
        }).then(function () { return coup(n - 1); });
      };
      var fin = function () { suivi.stop = true; o.remove(); };
      return pause(60).then(function () { o.style.opacity = "1"; return coup(Math.round(hasard(2, 4))); })
        .then(function () { esprit.ennui = borne(esprit.ennui - 45); dessiner("assis", "content"); return pause(1800); })
        .then(function () { o.style.opacity = "0"; return pause(450); })
        .then(fin, function (e) { fin(); throw e; });
    },
    chasse: function () {
      var cs = objet("cn-cs", chauveSouris(), H * 0.62, H * 0.62 * 34 / 64);
      var cw = H * 0.62, venue = Math.random() < 0.5 ? -1 : 1;
      var bx = venue < 0 ? gauche - cw * 2 : droite + W + cw, by = sol - H * 2.1, t = 0, fuite = false, fy = 0;
      var cibleX = x + W / 2 - cw / 2 + venue * W * 0.25;
      var vol = fond(function (dt) {
        t += dt;
        if (fuite) { fy -= dt * H * 5; bx += dt * H * 4 * -venue; }
        else bx += (cibleX - bx) * Math.min(1, dt * 1.6);
        var yy = by + fy + Math.sin(t * 5) * H * 0.12;
        cs.style.transform = "translate(" + bx.toFixed(1) + "px," + yy.toFixed(1) + "px)";
        if (!fuite) regarder(bx + cw / 2, yy, 400);       // il ne la quitte pas des yeux
        return fuite && (by + fy < -cw * 2 || bx < -cw * 3 || bx > innerWidth + cw * 3);
      });
      dir = venue;
      dessiner("assis", "guette");
      return pause(1700).then(function () {
        dessiner("debout", "affut"); return pause(hasard(900, 1500));
      }).then(function () {
        dessiner("debout", "saute");
        setTimeout(function () { fuite = true; }, 260);
        return bond(H * 1.15, 720, dir * W * 0.15);
      }).then(function () {
        esprit.ennui = borne(esprit.ennui - 30);
        dessiner("debout"); return pause(500);
      }).then(function () {
        dessiner("assis", "toilette");             // l'air de rien
        return Promise.race([vol.fin, pause(2600)]);
      }).then(function () { vol.stop = true; cs.remove(); }, function (e) { vol.stop = true; cs.remove(); throw e; });
    },
    // complicité 4 : il vient s'installer près de la case où tu réfléchis
    pres: function () {
      var c = caseActive();
      if (!c) return ACTIONS.assis();
      dessiner("debout", "marche");
      return marcherVers(aCoteDe(c.x)).then(function () {
        tourner(c.x); dessiner("assis"); regarder(c.x, c.y, 4000);
        return pause(hasard(5000, 9000));
      });
    },
    // complicité 3 : il t'apporte un petit cadeau
    cadeau: function () {
      esprit.cadeauAt = Date.now(); sauverEsprit();
      var types = Object.keys(CADEAU), type = types[Math.floor(Math.random() * types.length)];
      var c = caseActive(), cible = c ? aCoteDe(c.x) : hasard(gauche, droite);
      dessiner("debout", "marche");
      return marcherVers(cible, H * 1.2).then(function () {
        dessiner("debout", "affut"); return pause(500);
      }).then(function () {
        deposerCadeau(type, x + W / 2 + dir * W * 0.5);
        emote("🎁", 2200);
        dessiner("assis", "content"); regarder(null, null, 3000);
        return pause(3200);
      });
    }
  };

  /* ---------- ce qu'il CHOISIT : selon ses besoins, l'heure, la partie ---------- */
  var precedente = "";
  function choisir() {
    if (calmeVoulu) return esprit.energie < 50 ? "dodo" : "assis";
    var e = esprit.energie, f = esprit.faim, en = esprit.ennui, hu = esprit.humeur, now = Date.now();
    var h = new Date().getHours(), nuit = (h >= 22 || h < 7), niveau = etat.niveau || 1;
    var c = caseActive(), depuisTouche = now - derniereTouche;
    var s = {
      promenade: 0.5 + e / 100 * 1.3,
      assis: 0.9, toilette: 0.45, etirement: 0.25,
      baille: e < 50 ? 0.5 : 0.12,
      dodo: e < 75 ? Math.pow((100 - e) / 100, 1.5) * 4 + (nuit ? 0.8 : 0) : 0.03,
      mange: esprit.croquettes > 0 && f > 45 ? (f - 30) / 70 * 3 : 0,
      reclame: esprit.croquettes <= 0 && f > 70 && now - esprit.reclameAt > 5 * 60000 ? 1.6 : 0,
      joue: e > 30 ? 0.2 + en / 100 * 2.2 : 0,
      chasse: e > 45 ? 0.15 + en / 100 * 1.3 : 0,
      roulade: hu > 60 ? (hu - 50) / 50 * 1.0 : 0.1,
      // pendant que tu réfléchis (sans écrire depuis un moment), il vient près de ta case
      pres: niveau >= 4 && c && depuisTouche > 6000 && depuisTouche < 150000 && loin(c.x) ? 1.8 : 0,
      cadeau: niveau >= 3 && now - esprit.cadeauAt > 25 * 60000 && cadeaux.length === 0 ? 0.25 : 0
    };
    if (precedente && s[precedente] != null) s[precedente] /= 4;      // pas deux fois de suite la même chose
    if (precedente === "dodo") s.dodo = 0;
    var total = 0, k;
    for (k in s) total += s[k];
    var r = Math.random() * total;
    for (k in s) { r -= s[k]; if (r <= 0) return k; }
    return "assis";
  }

  function vivre() {
    if (!actif) return;
    var nom = interruption ? interruption.nom : choisir();
    var f = interruption ? interruption.f : ACTIONS[nom];
    interruption = null;
    precedente = nom; actionEnCours = nom;
    var g = generation;
    Promise.resolve().then(f).then(function () { }, function (e) { if (e !== ANNULE && window.console) console.warn(e); })
      .then(function () {
        if (g === generation) vivre();       // une interruption a déjà relancé la vie
      });
  }
  function interrompre(nom, f) {
    interruption = { nom: nom, f: f };
    annulerTout();
    document.querySelectorAll(".cn-jouet,.cn-cs").forEach(function (o) { o.remove(); });
    vivre();
  }

  /* =====================================================================
     CE QU'IL REMARQUE : la partie, et toi
     ===================================================================== */
  // ce qu'un simple événement de jeu n'interrompt pas (il finit son repas, sa partie de chasse…)
  var ABSORBE = { dodo: 1, joue: 1, chasse: 1, mange: 1, salut: 1, joie: 1, console: 1, cadeau: 1, agace: 1, caresse: 1, roule: 1 };
  var derniereReaction = 0, touchesEnDormant = 0, caresses = [], boudeJusqua = 0;
  function disponible() { return !ABSORBE[actionEnCours]; }
  function reagir(nom, f, delai) {
    var now = Date.now();
    if (now - derniereReaction < (delai || 0)) return false;
    derniereReaction = now;
    interrompre(nom, f);
    return true;
  }

  var REACTIONS = {
    // retrouvailles : il accourt, d'autant plus content que l'absence a été longue
    salut: function (heures) {
      var depuisCote = Math.random() < 0.5;
      x = depuisCote ? gauche : droite;
      el.style.opacity = "0";
      setTimeout(function () { if (el) el.style.opacity = "1"; }, 30);
      dessiner("debout", "marche");
      return marcherVers((gauche + droite) / 2 + hasard(-0.2, 0.2) * W, H * 2.3).then(function () {
        emote("❤", 2200); miaou(false); dessiner("debout", "content");
        return bond(H * 0.4, 380, 0);
      }).then(function () {
        dessiner("assis", "content"); regarder(null, null, 3000);
        coeurs(heures > 48 && (etat.niveau || 1) >= 2 ? 6 : 3);
        if (heures > 48) montrerNom(" t'attendait ♥");
        return pause(2600);
      });
    },
    // tu écris : il suit la case des yeux, et (complicité 3) vient voir de plus près
    suivre: function () {
      if (toucheX == null) return pause(10);
      dessiner("debout", "marche");
      return marcherVers(aCoteDe(toucheX), H * 1.5).then(function () {
        tourner(toucheX); dessiner("assis"); regarder(toucheX, toucheY, 3000);
        return pause(hasard(2500, 5000));
      });
    },
    // il dormait, tu tapes au clavier : il sursaute
    sursaut: function () {
      emote("❗", 1300); dessiner("debout");
      return bond(H * 0.35, 320, 0).then(function () {
        dessiner("debout", "etire"); return pause(1400);
      }).then(function () {
        dessiner("assis"); regarder(toucheX, toucheY, 2500); return pause(1800);
      });
    },
    // un bel essai : il frétille
    excite: function (info) {
      tourner(info.x); emote("❗", 1500); regarder(info.x, info.y, 2500);
      dessiner("debout", "affut");
      return pause(1100).then(function () { dessiner("assis", "content"); return pause(1600); });
    },
    // un essai où rien n'est juste : il compatit
    decu: function (info) {
      tourner(info.x); emote("💧", 1700); dessiner("assis", "triste"); regarder(info.x, info.y, 2000);
      return pause(2000).then(function () { dessiner("assis", "toilette"); return pause(1500); });
    },
    // un indice : il va gratter la case révélée
    indice: function (info) {
      dessiner("debout", "marche");
      return marcherVers(aCoteDe(info.x), H * 1.4).then(function () {
        tourner(info.x); regarder(info.x, info.y, 2500);
        dessiner("debout", "tape"); emote("✨", 1500); return pause(220);
      }).then(function () { dessiner("assis", "content"); return pause(2000); });
    },
    // mot trouvé : il saute de joie, puis (s'il a faim) mange la croquette que tu viens de gagner
    joie: function () {
      dessiner("debout", "content"); coeurs(4); emote("🎉", 1600);
      return bond(H * 0.5, 420, 0).then(function () { return bond(H * 0.42, 380, 0); })
        .then(function () { dessiner("assis", "content"); regarder(null); return pause(1800); })
        .then(function () { return esprit.faim > 40 ? ACTIONS.mange() : pause(10); });
    },
    // partie perdue : il est triste avec toi, puis (complicité 2) vient te consoler
    console: function () {
      dessiner("assis", "triste"); emote("💧", 1800); regarder(null, null, 1500);
      return pause(1900).then(function () {
        if ((etat.niveau || 1) < 2) return pause(800);
        dessiner("debout", "marche");
        return marcherVers((gauche + droite) / 2, H * 1.2).then(function () {
          dessiner("assis", "content"); regarder(null, null, 3000);
          coeurs(3); miaou(true); emote("❤", 2000); lien("console", 1);
          return pause(2600);
        });
      });
    },
    // nouvelle grille : il vient voir
    nouvelle: function () {
      dessiner("debout", "marche");
      return marcherVers((gauche + droite) / 2 + hasard(-0.6, 0.6) * W).then(function () {
        dessiner("assis"); var c = caseActive(); if (c) regarder(c.x, c.y, 2500);
        return pause(2200);
      });
    },
    // Pendu : chaque erreur le fait sursauter ; vers la fin, il ne tient plus en place
    peur: function (info) {
      var potence = document.getElementById("penduSvg"), r = potence && potence.getBoundingClientRect();
      var px = r ? r.left + r.width * 0.68 : null, py = r ? r.top + r.height * 0.3 : null;
      var critique = info.erreurs >= info.max - 2;
      emote(critique ? "😿" : "❗", 1500);
      dessiner("debout", critique ? "inquiet" : "");
      tourner(px); regarder(px, py, 3000);
      return bond(H * 0.22, 260, 0).then(function () {
        if (!critique) { dessiner("assis", "guette"); regarder(px, py, 2500); return pause(2200); }
        // il fait les cent pas
        var a = x, b = Math.max(gauche, Math.min(droite, x + (x > (gauche + droite) / 2 ? -1 : 1) * W * 1.2));
        dessiner("debout", "marche inquiet");
        return marcherVers(b, H * 1.3).then(function () { return marcherVers(a, H * 1.3); })
          .then(function () { tourner(px); dessiner("assis", "inquiet"); regarder(px, py, 3000); return pause(2500); });
      });
    },
    // Pendu : une bonne lettre (plusieurs d'un coup, c'est la fête)
    trouve: function (info) {
      tourner(info.x); regarder(info.x, info.y, 2000);
      emote(info.n > 1 ? "❗" : "✨", 1300);
      dessiner("assis", "content");
      return pause(1600);
    },
    caresse: function () {
      coeurs(3); miaou(true); dessiner("assis", "content"); regarder(null, null, 2000);
      return pause(2400);
    },
    caresseDodo: function () {
      coeurs(2); miaou(true); dessiner("dodo", "dort content");
      return pause(2600).then(function () { return ACTIONS.dodo(true); });
    },
    // encore des caresses : il se roule sur le dos
    roule: function () {
      coeurs(4); miaou(true); dessiner("dos", "content");
      return pause(hasard(2800, 3800)).then(function () { dessiner("debout", "etire"); return pause(1300); })
        .then(function () { dessiner("assis", "content"); return pause(800); });
    },
    // trop, c'est trop : un coup de patte, et il s'éloigne bouder
    agace: function () {
      emote("💢", 1800); esprit.humeur = borne(esprit.humeur - 12);
      dessiner("debout", "tape");
      return pause(240).then(function () {
        dessiner("debout"); return pause(200);
      }).then(function () {
        var milieu = (gauche + droite) / 2;
        dessiner("debout", "marche");
        return marcherVers(x > milieu ? gauche : droite, H * 2.1);
      }).then(function () {
        dessiner("assis"); dir = x > (gauche + droite) / 2 ? 1 : -1;   // il te tourne le dos
        return pause(5000);
      });
    },
    esquive: function () {
      emote("💢", 1100);
      var cote = x > (gauche + droite) / 2 ? -1 : 1;
      dessiner("debout", "saute");
      return bond(H * 0.3, 340, cote * W * 0.9).then(function () { dessiner("assis"); dir = -cote; return pause(2000); });
    },
    merci: function () {
      coeurs(3); emote("❤", 1600); miaou(false); dessiner("assis", "content"); regarder(null, null, 2000);
      return pause(2200);
    }
  };

  /* ---------- toucher : le chat, ou un cadeau qu'il t'a laissé ---------- */
  function surClic(e) {
    if (!actif || !ancreOk || el.style.display === "none") return;
    var cible = e.target;
    if (cible && cible.closest && cible.closest("button, a, input, textarea, select, #keyboard, .overlay")) return;
    // un cadeau ?
    for (var i = 0; i < cadeaux.length; i++) {
      var rc = cadeaux[i].el.getBoundingClientRect(), mc = 8;
      if (e.clientX >= rc.left - mc && e.clientX <= rc.right + mc && e.clientY >= rc.top - mc && e.clientY <= rc.bottom + mc) {
        var c = cadeaux[i];
        retirerCadeau(c);
        lien("cadeau", 1);
        if (P().toast) P().toast("🎁 " + (etat.nom || "Minuit") + " t'a offert " + NOM_CADEAU[c.type] + " ♥", 2200);
        reagir("merci", REACTIONS.merci);
        return;
      }
    }
    if (cible && cible.closest && cible.closest(".tile")) return;
    var r = el.getBoundingClientRect(), m = 6;
    if (e.clientX < r.left - m || e.clientX > r.right + m || e.clientY < r.top - m * 2 || e.clientY > r.bottom + m) return;
    var now = Date.now();
    debutCalme = now;
    if (now < boudeJusqua) { reagir("esquive", REACTIONS.esquive); return; }
    caresses = caresses.filter(function (t) { return now - t < 12000; });
    caresses.push(now);
    var n = caresses.length;
    if (n >= 8) { caresses = []; boudeJusqua = now + 15000; reagir("agace", REACTIONS.agace); return; }
    montrerNom();
    esprit.humeur = borne(esprit.humeur + 6);
    lien("caresse", 1);
    if (pose === "dodo" && n === 1) { reagir("caresseDodo", REACTIONS.caresseDodo); return; }
    if (n >= 4 && n <= 5 && !calmeVoulu) { reagir("roule", REACTIONS.roule); return; }
    reagir("caresse", REACTIONS.caresse);
  }

  /* =====================================================================
     API
     ===================================================================== */
  function installerStyle() {
    if (document.getElementById("cnStyle")) return;
    var s = document.createElement("style");
    s.id = "cnStyle"; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function surMasque() { if (document.hidden) sauverEsprit(); }

  window.ChatNoir = {
    svg: svg,
    tete: tete,
    vignette: vignette,
    installerStyle: installerStyle,

    /* e = { porte, maison, nom, complicite, niveau } */
    demarrer: function (e) {
      installerStyle();
      if (actif) { this.habiller(e); return; }
      etat = e || etat;
      esprit = chargerEsprit();
      var absence = rattraper();
      scene = document.createElement("div");
      scene.id = "chatScene"; scene.setAttribute("aria-hidden", "true");
      el = document.createElement("div"); el.className = "cn";
      sens = document.createElement("div"); sens.className = "cn-sens";
      zzz = document.createElement("div"); zzz.className = "cn-zzz"; zzz.innerHTML = "<span>z</span><span>z</span><span>Z</span>";
      bulle = document.createElement("div"); bulle.className = "cn-nom";
      emo = document.createElement("div"); emo.className = "cn-emo";
      el.appendChild(sens); el.appendChild(zzz); el.appendChild(bulle); el.appendChild(emo);
      scene.appendChild(el);
      document.body.appendChild(scene);
      actif = true; pose = ""; classes = ""; x = 0; y = 0;
      this.habiller(etat);
      ancrer();
      x = gauche + (droite - gauche) * hasard(0.2, 0.8);
      dessiner("assis");
      // première visite du jour : la complicité grandit
      if (esprit.jour !== aujourdhui()) lien("visite", 2);
      sauverEsprit();
      document.addEventListener("click", surClic);
      document.addEventListener("visibilitychange", surMasque);
      window.addEventListener("pagehide", sauverEsprit);
      dernier = performance.now();
      raf = requestAnimationFrame(boucle);
      cligner();
      // de retour après plusieurs heures : il accourt
      if (absence > 6 && !calmeVoulu) { interruption = { nom: "salut", f: function () { return REACTIONS.salut(absence); } }; }
      vivre();
    },

    arreter: function () {
      if (!actif) return;
      sauverEsprit();
      actif = false;
      annulerTout();
      if (raf) cancelAnimationFrame(raf); raf = 0; clearTimeout(lent); lent = 0;
      clearInterval(reveil); reveil = 0; clearTimeout(clignTimer); clearTimeout(regardT);
      cadeaux.forEach(function (c) { clearTimeout(c.fin); }); cadeaux = [];
      document.removeEventListener("click", surClic);
      document.removeEventListener("visibilitychange", surMasque);
      window.removeEventListener("pagehide", sauverEsprit);
      if (scene) scene.remove();
      scene = el = sens = emo = null; lanterneEl = null;
    },

    habiller: function (e) {
      etat = e || etat;
      if (!actif) return;
      var p = pose; pose = "";
      if (p) dessiner(p, classes.replace(/^cn cn-pose-\w+ ?/, ""));
      if (etat.maison && etat.maison.lanterne) {
        if (!lanterneEl) { lanterneEl = objet("cn-lanterne", lanterne(), 20, 20); }
      } else if (lanterneEl) { lanterneEl.remove(); lanterneEl = null; }
      ancrer();
    },

    // la complicité a changé (sans redessiner le chat)
    majLien: function (complicite, niveau) { etat.complicite = complicite; etat.niveau = niveau; },

    /* ce qui se passe dans la partie */
    evenement: function (nom, info) {
      if (!actif || !esprit) return;
      info = info || {};
      var dort = pose === "dodo";
      if (nom === "victoire") {
        debutCalme = Date.now();
        esprit.croquettes = Math.min(3, esprit.croquettes + 1);
        esprit.humeur = borne(esprit.humeur + 8);
        lien("victoire", 1); sauverEsprit();
        if (!ancreOk) return;
        if (calmeVoulu) { emote("🎉", 1600); return; }
        reagir("joie", REACTIONS.joie);
        return;
      }
      if (!ancreOk) return;
      if (nom === "defaite") {
        if (calmeVoulu) { emote("💧", 1600); return; }
        reagir("console", REACTIONS.console);
        return;
      }
      if (nom === "touche") {
        derniereTouche = Date.now();
        if (info.x != null) { toucheX = info.x; toucheY = info.y; }
        if (dort) {
          // il ne se réveille pas à la première lettre…
          touchesEnDormant++;
          if (touchesEnDormant >= 4 && !calmeVoulu) { touchesEnDormant = 0; reagir("sursaut", REACTIONS.sursaut); }
          return;
        }
        touchesEnDormant = 0;
        regarder(info.x, info.y, 2500);
        if ((etat.niveau || 1) >= 3 && disponible() && loin(info.x) && !calmeVoulu) reagir("suivre", REACTIONS.suivre, 2500);
        return;
      }
      if (dort || calmeVoulu) return;               // le reste ne le réveille pas
      if (nom === "essai") {
        if (!disponible()) { regarder(info.x, info.y, 2000); return; }
        var total = info.total || 1, part = ((info.bien || 0) + 0.5 * (info.mal || 0)) / total;
        if (part >= 0.6) reagir("excite", function () { return REACTIONS.excite(info); });
        else if ((info.bien || 0) + (info.mal || 0) === 0) reagir("decu", function () { return REACTIONS.decu(info); });
        else { regarder(info.x, info.y, 2200); emote("❓", 1400); }
        return;
      }
      if (nom === "indice") { reagir("indice", function () { return REACTIONS.indice(info); }); return; }
      if (nom === "partie") { if (disponible() && Math.random() < 0.6) reagir("nouvelle", REACTIONS.nouvelle, 4000); return; }
      if (nom === "pendu-erreur") { reagir("peur", function () { return REACTIONS.peur(info); }); return; }
      if (nom === "pendu-bonne") { if (disponible()) reagir("trouve", function () { return REACTIONS.trouve(info); }); return; }
    },

    // ce que la boutique affiche
    get esprit() { return esprit ? { croquettes: esprit.croquettes, faim: Math.round(esprit.faim), energie: Math.round(esprit.energie), humeur: Math.round(esprit.humeur) } : null; },

    // lance un comportement précis (tests)
    faire: function (nom, info) {
      if (!actif) return;
      if (ACTIONS[nom]) interrompre(nom, ACTIONS[nom]);
      else if (REACTIONS[nom]) interrompre(nom, function () { return REACTIONS[nom](info || { x: centreX(), y: sol, erreurs: 6, max: 8, n: 2 }); });
    },
    get comportements() { return Object.keys(ACTIONS).concat(Object.keys(REACTIONS)); },

    get actif() { return actif; },
    get pose() { return pose; },
    get action() { return actionEnCours; }
  };
})();
