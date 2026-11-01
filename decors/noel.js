/* Mot en Six — décor de Noël
 *
 * Nuit d'hiver : guirlande lumineuse en haut de l'écran, neige qui tombe en
 * trois profondeurs, collines enneigées et sapins au loin, quelques étoiles.
 * Comme pour Halloween : SVG et CSS seulement, uniquement des
 * transformations et des opacités animées (aucun coût pour le jeu).
 */
Decors.enregistrer({
  nom: "noel",

  /* ---------- couleurs et ambiance ---------- */
  css: `
  :root.noel:not([data-theme="light"]){
    --bg:#081a33; --bg-2:#0e2547; --cell:#123059; --cell-edge:#21497d;
    --absent:#0d2240; --key:#1b3d6d; --key-edge:#2b5791; --ink-dim:#a9c2e4;
  }
  :root.noel{ --red:#d7263d; --yellow:#f4c542; }
  :root.noel:not([data-accent]){ --accent:#d7263d; }
  :root.noel:not([data-theme="light"]) body{
    background:
      radial-gradient(ellipse at 50% 120%, rgba(170,210,255,.14), transparent 55%),
      radial-gradient(120% 90% at 50% 0%, #10305c 0%, var(--bg) 64%);
    background-attachment:fixed;
  }

  /* étoiles */
  .nl-etoile{ position:absolute; width:2px; height:2px; border-radius:50%; background:#fff;
    opacity:.15; animation:nlScintille var(--d,4s) ease-in-out infinite; animation-delay:var(--r,0s); }
  @keyframes nlScintille{ 50%{ opacity:.8; transform:scale(1.5); } }

  /* guirlande : un fil en festons, des ampoules qui s'allument tour à tour */
  .nl-guirlande{ position:absolute; top:-4px; left:0; width:100%; height:40px; overflow:visible; }
  .nl-guirlande .amp{ animation:nlAmpoule var(--d,2.4s) ease-in-out infinite; animation-delay:var(--r,0s); }
  @keyframes nlAmpoule{ 0%,100%{ opacity:1; } 50%{ opacity:.35; } }

  /* neige : chute verticale > balancement > flocon */
  .nl-chute{ position:absolute; top:0; left:var(--x,50%); animation:nlChute var(--d,12s) linear infinite; animation-delay:var(--r,0s); }
  @keyframes nlChute{ from{ transform:translateY(-6vh); } to{ transform:translateY(106vh); } }
  .nl-balance{ animation:nlBalance var(--b,4s) ease-in-out infinite alternate; }
  @keyframes nlBalance{ from{ transform:translateX(calc(var(--a,14px) * -1)); } to{ transform:translateX(var(--a,14px)); } }
  .nl-flocon{ display:block; width:var(--t,6px); height:var(--t,6px); border-radius:50%;
    background:radial-gradient(circle, #fff 0%, rgba(255,255,255,.85) 45%, rgba(255,255,255,0) 72%); opacity:var(--o,.8); }
  .nl-cristal{ display:block; width:var(--t,14px); opacity:var(--o,.75); animation:nlTourne 9s linear infinite; }
  @keyframes nlTourne{ to{ transform:rotate(360deg); } }

  /* collines enneigées et sapins, au loin */
  .nl-paysage{ position:absolute; left:0; bottom:0; width:100%; height:clamp(90px, 17vh, 170px); opacity:.55; }
  .nl-paysage svg.collines{ position:absolute; inset:0; width:100%; height:100%; }
  .nl-sapin{ position:absolute; transform:translateX(-50%); height:auto; }

  /* moins d'animations demandées : la neige reste posée dans le ciel */
  @media (prefers-reduced-motion: reduce){
    .nl-chute{ transform:translateY(var(--y,30vh)); }
  }`,

  /* ---------- dessin de la scène ---------- */
  scene() {
    let h = "";
    const r = (a, b) => a + Math.random() * (b - a);

    for (let i = 0; i < 22; i++) {
      h += '<i class="nl-etoile" style="left:' + r(0, 100).toFixed(1) + '%;top:' + r(6, 40).toFixed(1)
        + '%;--d:' + r(2.5, 6).toFixed(1) + 's;--r:-' + r(0, 6).toFixed(1) + 's"></i>';
    }

    // paysage : deux plans de collines (étirées à la largeur de l'écran), et des
    // sapins coiffés de neige posés dessus, qui gardent, eux, leurs proportions
    const sapin = (gauche, bas, haut, c) => '<svg class="nl-sapin" viewBox="-17 -35 34 40" style="left:' + gauche + '%;bottom:' + bas + '%;width:' + (haut * 0.85).toFixed(0) + 'px">'
      + '<rect x="-1.6" y="-2" width="3.2" height="6" fill="#0a1a2e"/>'
      + '<path d="M0,-34 L-9,-18 L-5,-18 L-13,-6 L-7,-6 L-16,4 L16,4 L7,-6 L13,-6 L5,-18 L9,-18 Z" fill="' + c + '"/>'
      + '<path d="M0,-34 L-4.5,-26 Q0,-24 4.5,-26 Z M-9,-18 L-5,-18 Q0,-15.5 5,-18 L9,-18 L6.5,-14 Q0,-12 -6.5,-14 Z'
      + ' M-13,-6 L-7,-6 Q0,-3.5 7,-6 L13,-6 L10.5,-2.4 Q0,-.5 -10.5,-2.4 Z" fill="#e8f2ff" opacity=".85"/></svg>';
    h += '<div class="nl-paysage" aria-hidden="true">'
       + '<svg class="collines" viewBox="0 0 400 100" preserveAspectRatio="none">'
       + '<path d="M0,62 C60,40 110,48 170,58 C230,68 290,36 400,50 L400,100 L0,100 Z" fill="#1d3d68"/></svg>'
       + sapin(11, 42, 74, "#123a3a") + sapin(18, 40, 50, "#123a3a") + sapin(79, 50, 66, "#123a3a") + sapin(88, 47, 46, "#123a3a")
       + '<svg class="collines" viewBox="0 0 400 100" preserveAspectRatio="none">'
       + '<path d="M0,78 C70,64 140,70 210,78 C280,86 330,66 400,72 L400,100 L0,100 Z" fill="#cfe0f5"/>'
       + '<path d="M0,78 C70,64 140,70 210,78 C280,86 330,66 400,72" fill="none" stroke="#fff" stroke-width="1.2" opacity=".7"/></svg>'
       + sapin(62, 16, 58, "#0f2f2b") + sapin(68, 15, 40, "#0f2f2b") + '</div>';

    // neige : trois profondeurs (loin = petit, lent, pâle)
    const cristal = '<svg class="nl-cristal" viewBox="-10 -10 20 20"><g stroke="#fff" stroke-width="1.1" stroke-linecap="round" fill="none">'
      + '<path d="M0,-8.5 L0,8.5 M-7.4,-4.25 L7.4,4.25 M-7.4,4.25 L7.4,-4.25"/>'
      + '<path d="M-2,-6.5 L0,-4.6 L2,-6.5 M-2,6.5 L0,4.6 L2,6.5 M-6.6,-1.3 L-4,-2.3 L-4.6,-5 M6.6,1.3 L4,2.3 L4.6,5 M-6.6,1.3 L-4,2.3 L-4.6,5 M6.6,-1.3 L4,-2.3 L4.6,-5"/></g></svg>';
    const plans = [
      { n: 16, t: [2, 3.5],  d: [16, 24], o: [.35, .55], a: [6, 12] },
      { n: 14, t: [4, 6],    d: [11, 16], o: [.55, .8],  a: [10, 18] },
      { n: 6,  t: [12, 17],  d: [8, 12],  o: [.6, .85],  a: [14, 26], cristal: true }
    ];
    plans.forEach(p => {
      for (let i = 0; i < p.n; i++) {
        const d = r(p.d[0], p.d[1]);
        h += '<div class="nl-chute" style="--x:' + r(0, 100).toFixed(1) + '%;--d:' + d.toFixed(1) + 's;--r:-' + r(0, d).toFixed(1)
          + 's;--y:' + r(5, 85).toFixed(0) + 'vh"><div class="nl-balance" style="--b:' + r(2.6, 5).toFixed(1) + 's;--a:' + r(p.a[0], p.a[1]).toFixed(0) + 'px">'
          + (p.cristal
             ? '<span style="display:block;--t:' + r(p.t[0], p.t[1]).toFixed(0) + 'px;--o:' + r(p.o[0], p.o[1]).toFixed(2) + '">' + cristal + '</span>'
             : '<i class="nl-flocon" style="--t:' + r(p.t[0], p.t[1]).toFixed(1) + 'px;--o:' + r(p.o[0], p.o[1]).toFixed(2) + '"></i>')
          + '</div></div>';
      }
    });

    // guirlande : festons tendus d'un bord à l'autre, ampoules le long du fil
    // largeur réelle de l'écran : les ampoules restent rondes, sur téléphone comme sur PC
    const L = Math.max(320, Math.round(window.innerWidth || 400)), N = Math.max(2, Math.round(L / 210)), couleurs = ["#ff4b5c", "#ffd23f", "#3ddc84", "#4fb6ff", "#ff8ad8"];
    let fil = "M0,4", amps = "", k = 0;
    for (let i = 0; i < N; i++) {
      const x0 = i * L / N, x1 = (i + 1) * L / N, xm = (x0 + x1) / 2;
      fil += " Q" + xm + ",30 " + x1 + ",4";
      for (let j = 1; j <= 4; j++) {
        const t = j / 5, x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * xm + t * t * x1, y = (1 - t) * (1 - t) * 4 + 2 * (1 - t) * t * 30 + t * t * 4;
        const c = couleurs[k++ % couleurs.length];
        amps += '<g transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')"><rect x="-1.6" y="-1" width="3.2" height="3" rx=".6" fill="#2b3a4a"/>'
          + '<ellipse class="amp" cx="0" cy="5.6" rx="3" ry="4.4" fill="' + c + '" style="--d:' + r(1.8, 3.2).toFixed(1) + 's;--r:-' + r(0, 3).toFixed(1)
          + 's;filter:drop-shadow(0 0 3px ' + c + ')"/></g>';
      }
    }
    h += '<svg class="nl-guirlande" viewBox="0 0 ' + L + ' 40" preserveAspectRatio="xMidYMin meet" aria-hidden="true">'
       + '<path d="' + fil + '" fill="none" stroke="#1d2b22" stroke-width="1.4"/>' + amps + '</svg>';
    return h;
  }
});
