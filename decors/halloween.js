/* Mot en Six — décor d'Halloween
 *
 * Lune, étoiles, chauves-souris qui battent des ailes, araignée, brume.
 * Tout est dessiné en SVG : net sur tous les écrans, sans image à charger.
 * Seules des transformations et des opacités sont animées (travail de la
 * carte graphique) : aucun coût pour le jeu.
 *
 * Modèle pour les décors suivants : voir l'en-tête de decors/decors.js.
 */
Decors.enregistrer({
  nom: "halloween",

  /* ---------- couleurs et ambiance ---------- */
  css: `
  :root.halloween:not([data-theme="light"]){
    --bg:#140b22; --bg-2:#1e1033; --cell:#2a1745; --cell-edge:#43265f;
    --absent:#1f1233; --key:#3a2160; --key-edge:#55307f; --ink-dim:#b9a3d9;
  }
  :root.halloween{ --red:#f0681a; }                 /* lettre bien placée : orange citrouille */
  :root.halloween:not([data-accent]){ --accent:#f0681a; }
  :root.halloween:not([data-theme="light"]) body{
    background:
      radial-gradient(ellipse at 50% 118%, rgba(240,104,26,.16), transparent 55%),
      radial-gradient(120% 90% at 50% 0%, #241240 0%, var(--bg) 62%);
    background-attachment:fixed;
  }

  /* étoiles */
  .hw-etoile{ position:absolute; width:2px; height:2px; border-radius:50%; background:#fff;
    opacity:.15; animation:hwScintille var(--d,4s) ease-in-out infinite; animation-delay:var(--r,0s); }
  @keyframes hwScintille{ 50%{ opacity:.85; transform:scale(1.6); } }

  /* lune et son halo */
  .hw-lune{ position:absolute; top:clamp(70px, 11vh, 120px); right:7%; width:clamp(74px, 16vw, 132px); aspect-ratio:1; }
  .hw-lune::before{ content:""; position:absolute; inset:-70%; border-radius:50%;
    background:radial-gradient(circle, rgba(255,226,160,.30) 0%, rgba(255,190,110,.10) 35%, transparent 65%);
    animation:hwHalo 7s ease-in-out infinite; }
  @keyframes hwHalo{ 50%{ opacity:.6; transform:scale(1.06); } }
  .hw-lune svg{ position:relative; width:100%; height:100%; display:block;
    filter:drop-shadow(0 0 18px rgba(255,214,140,.45)); }
  .hw-nuage{ position:absolute; top:calc(clamp(70px, 11vh, 120px) + 28px); right:-30%; width:clamp(150px, 34vw, 280px);
    opacity:.16; animation:hwNuage 46s linear infinite; }
  @keyframes hwNuage{ from{ transform:translateX(0); } to{ transform:translateX(-115vw); } }

  /* chauves-souris : vol horizontal > ondulation > battement d'ailes */
  .hw-vol{ position:absolute; left:0; top:var(--y,18%); width:var(--t,46px);
    animation:hwVol var(--d,22s) linear infinite; animation-delay:var(--r,0s); }
  .hw-vol.inverse{ animation-name:hwVolInverse; }
  @keyframes hwVol{ from{ transform:translateX(-12vw); } to{ transform:translateX(112vw); } }
  @keyframes hwVolInverse{ from{ transform:translateX(112vw); } to{ transform:translateX(-12vw); } }
  .hw-vague{ animation:hwVague var(--o,3.2s) ease-in-out infinite; }
  @keyframes hwVague{ 0%,100%{ transform:translateY(0); } 25%{ transform:translateY(-22px); } 75%{ transform:translateY(16px); } }
  .hw-chauve{ display:block; width:100%; overflow:visible; animation:hwPlane var(--b,.32s) ease-in-out infinite; }
  @keyframes hwPlane{ 50%{ transform:translateY(3px); } }      /* le corps descend quand les ailes remontent */
  .hw-chauve .aile{ transform-box:view-box; transform-origin:32px 17px;
    animation:hwBat var(--b,.32s) ease-in-out infinite; }
  @keyframes hwBat{ 0%,100%{ transform:scaleY(1); } 50%{ transform:scaleY(-.42); } }

  /* araignée au bout de son fil */
  .hw-araignee{ position:absolute; top:0; left:9%; width:22px; animation:hwFil 9s ease-in-out infinite; transform-origin:50% 0; }
  .hw-araignee .fil{ width:1px; height:var(--f,26vh); margin:0 auto; background:linear-gradient(rgba(255,255,255,0), rgba(255,255,255,.35)); }
  .hw-araignee svg{ display:block; width:22px; margin-top:-2px; animation:hwPattes 1.6s ease-in-out infinite; }
  @keyframes hwFil{ 0%,100%{ transform:translateY(-12vh) rotate(0deg); } 45%{ transform:translateY(0) rotate(2deg); } 70%{ transform:translateY(-3vh) rotate(-2deg); } }
  @keyframes hwPattes{ 50%{ transform:scaleX(.88); } }

  /* brume au ras du sol */
  .hw-brume{ position:absolute; bottom:-6vh; left:-20vw; width:140vw; height:28vh; border-radius:50%;
    background:radial-gradient(ellipse at center, rgba(190,160,235,.13), transparent 70%);
    animation:hwBrume 28s ease-in-out infinite alternate; }
  .hw-brume.b{ bottom:-10vh; animation-duration:38s; animation-direction:alternate-reverse; opacity:.8; }
  @keyframes hwBrume{ from{ transform:translateX(-8vw); } to{ transform:translateX(8vw); } }

  /* moins d'animations demandées : le moteur fige tout, on place juste les éléments */
  @media (prefers-reduced-motion: reduce){
    .hw-vol{ transform:translateX(var(--x,60vw)); }
    .hw-araignee{ transform:translateY(-4vh); }
  }`,

  /* ---------- dessin de la scène ---------- */
  scene() {
    let h = "";

    // étoiles, seulement dans le haut du ciel
    for (let i = 0; i < 26; i++) {
      h += '<i class="hw-etoile" style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 42).toFixed(1)
        + '%;--d:' + (2.5 + Math.random() * 4).toFixed(1) + 's;--r:-' + (Math.random() * 6).toFixed(1) + 's"></i>';
    }

    // pleine lune : dégradé, mers lunaires et cratères
    h += '<div class="hw-lune"><svg viewBox="0 0 100 100"><defs>'
       + '<radialGradient id="hwL" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#fffbea"/>'
       + '<stop offset=".55" stop-color="#f6e3a8"/><stop offset="1" stop-color="#d9b46a"/></radialGradient>'
       + '<radialGradient id="hwO" cx="50%" cy="50%" r="50%"><stop offset=".7" stop-color="#000" stop-opacity="0"/>'
       + '<stop offset="1" stop-color="#7a4b1c" stop-opacity=".35"/></radialGradient></defs>'
       + '<circle cx="50" cy="50" r="46" fill="url(#hwL)"/>'
       + '<g fill="#b98f45" opacity=".38">'
       +   '<path d="M30 30c6-5 15-4 18 2s-2 12-9 13-14-2-13-7 1-5 4-8z"/>'
       +   '<path d="M56 54c5-3 13-1 15 5s-3 11-10 11-10-3-10-8 2-6 5-8z"/>'
       +   '<ellipse cx="62" cy="30" rx="7" ry="5"/></g>'
       + '<g fill="none" stroke="#b08440" stroke-opacity=".45" stroke-width="1.4">'
       +   '<circle cx="36" cy="66" r="5"/><circle cx="74" cy="44" r="3.2"/><circle cx="46" cy="80" r="2.6"/>'
       +   '<circle cx="24" cy="50" r="2.4"/></g>'
       + '<circle cx="50" cy="50" r="46" fill="url(#hwO)"/></svg></div>';

    // un voile de brume qui passe devant la lune
    h += '<svg class="hw-nuage" viewBox="0 0 200 50"><defs><filter id="hwF"><feGaussianBlur stdDeviation="4"/></filter></defs>'
       + '<g fill="#d9cdf0" filter="url(#hwF)"><ellipse cx="60" cy="30" rx="55" ry="11"/>'
       + '<ellipse cx="120" cy="24" rx="48" ry="13"/><ellipse cx="165" cy="31" rx="30" ry="9"/></g></svg>';

    // chauve-souris : corps, oreilles, et deux ailes qui battent vraiment
    const aileG = "M30 16 C24 6 14 3 3 8 C7 10 9 13 8 18 C11 16 14 17 15 21 C18 18 22 18 24 22 C25 19 27 18 30 19 Z";
    const aileD = aileG.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => (64 - +x) + " " + y);   // miroir
    const chauve = (b) => '<svg class="hw-chauve" viewBox="0 0 64 34" style="--b:' + b + '">'
       + '<g fill="#0b0514" stroke="rgba(255,190,120,.22)" stroke-width=".8">'
       + '<path class="aile" d="' + aileG + '"/><path class="aile" d="' + aileD + '"/>'
       + '<path d="M28 13 L29 8 L31 12 L33 12 L35 8 L36 13 C38 16 37 23 32 26 C27 23 26 16 28 13 Z"/></g>'
       + '<circle cx="30.4" cy="15" r=".9" fill="#ffb347"/><circle cx="33.6" cy="15" r=".9" fill="#ffb347"/></svg>';
    [
      { y: "16%", t: "52px", d: "24s", r: "-3s",  o: "3.4s", b: ".30s", x: "62vw" },
      { y: "30%", t: "34px", d: "33s", r: "-19s", o: "2.8s", b: ".26s", x: "18vw", inv: 1 },
      { y: "9%",  t: "26px", d: "41s", r: "-30s", o: "3.9s", b: ".24s", x: "40vw" }
    ].forEach(c => {
      h += '<div class="hw-vol' + (c.inv ? " inverse" : "") + '" style="--y:' + c.y + ';--t:' + c.t + ';--d:' + c.d + ';--r:' + c.r + ';--x:' + c.x + '">'
         + '<div class="hw-vague" style="--o:' + c.o + '">' + chauve(c.b) + '</div></div>';
    });

    // une petite araignée qui descend au bout de son fil
    h += '<div class="hw-araignee"><div class="fil"></div><svg viewBox="0 0 22 20">'
       + '<g stroke="#120a1f" stroke-width="1.3" fill="none" stroke-linecap="round">'
       + '<path d="M8 9 L2 4 M8 11 L1 11 M8 13 L2 18 M14 9 L20 4 M14 11 L21 11 M14 13 L20 18"/></g>'
       + '<ellipse cx="11" cy="11" rx="4.2" ry="5" fill="#120a1f"/><circle cx="11" cy="5.8" r="2.6" fill="#120a1f"/>'
       + '<circle cx="10" cy="5.6" r=".55" fill="#ff8a3d"/><circle cx="12" cy="5.6" r=".55" fill="#ff8a3d"/></svg></div>';

    // brume au ras du sol
    h += '<div class="hw-brume"></div><div class="hw-brume b"></div>';
    return h;
  }
});
