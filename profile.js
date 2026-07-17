/* Profil joueur partagé (Motus + Rébus).
   - Stockage local (toujours) + synchronisation Supabase (si configuré).
   - Pseudo, parties, victoires, XP, niveau qui progresse, classement.
   - Injecte sa propre fenêtre "Profil" ; les pages n'ont qu'à appeler
     Profile.open(htmlStatsDuJeu) et Profile.addGame({won, xp}). */
(function () {
  "use strict";

  var CFG = window.MOTUS_CONFIG || {};
  var API = (CFG.SUPABASE_URL || "").replace(/\/+$/, "");
  var KEY = CFG.SUPABASE_ANON_KEY || "";
  var configured = !!(API && KEY);

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }

  /* ---------- Niveaux ---------- */
  var TITLES = ["Débutant", "Apprenti", "Amateur", "Habitué", "Confirmé", "Expert", "Maître", "Champion", "Virtuose", "Légende"];
  function levelFromXp(xp) { var L = 1; while (50 * (L + 1) * L <= xp) L++; return L; }
  function levelInfo(xp) {
    var L = levelFromXp(xp), base = 50 * L * (L - 1), next = 50 * (L + 1) * L;
    return { level: L, title: TITLES[Math.min(L - 1, TITLES.length - 1)], inLevel: xp - base, span: next - base, toNext: next - xp, progress: next > base ? (xp - base) / (next - base) : 1 };
  }

  /* ---------- État ---------- */
  var state = store.get("motus.profile", null);
  if (!state) state = { id: uuid(), pseudo: "", xp: 0, games: 0, wins: 0, level: 1 };
  if (!state.id) state.id = uuid();
  state.level = levelFromXp(state.xp);
  function saveLocal() { store.set("motus.profile", state); }
  saveLocal();

  /* ---------- Réseau (Supabase REST) ---------- */
  function headers(extra) {
    var h = { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json" };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function pushRemote() {
    if (!configured) return;
    state.updated_at = new Date().toISOString();
    fetch(API + "/rest/v1/profiles", {
      method: "POST",
      headers: headers({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ id: state.id, pseudo: state.pseudo, xp: state.xp, games: state.games, wins: state.wins, level: state.level, updated_at: state.updated_at })
    }).catch(function () {});
  }
  var pushTimer;
  function pushDebounced() { clearTimeout(pushTimer); pushTimer = setTimeout(pushRemote, 800); }
  function fetchRemote(id) {
    if (!configured) return Promise.resolve(null);
    return fetch(API + "/rest/v1/profiles?select=*&id=eq." + encodeURIComponent(id), { headers: headers() })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (a) { return (a && a[0]) || null; })
      .catch(function () { return null; });
  }
  function syncInit() {
    if (!configured) return;
    fetchRemote(state.id).then(function (rem) {
      if (rem) {
        state.xp = Math.max(state.xp, rem.xp || 0);
        state.games = Math.max(state.games, rem.games || 0);
        state.wins = Math.max(state.wins, rem.wins || 0);
        if (!state.pseudo && rem.pseudo) state.pseudo = rem.pseudo;
        state.level = levelFromXp(state.xp); saveLocal(); pushRemote();
      } else { pushRemote(); }
      refreshOpen();
    });
  }

  /* ---------- UI ---------- */
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function el(id) { return document.getElementById(id); }
  function set(id, v) { var e = el(id); if (e) e.textContent = v; }

  var STYLE = "\
#profileOverlay .modal{ max-width:400px; }\
.prof-row{ display:flex; gap:8px; margin-bottom:14px; }\
#pseudoInput,#restoreCode{ flex:1; height:44px; border:none; border-radius:10px; background:var(--cell); box-shadow:inset 0 0 0 1.5px var(--cell-edge); color:var(--ink); padding:0 12px; font-size:15px; font-weight:600; }\
#pseudoInput:focus,#restoreCode:focus{ outline:none; box-shadow:inset 0 0 0 2px var(--red); }\
.prof-level{ margin-bottom:14px; }\
.prof-lvl{ font-size:16px; font-weight:700; margin-bottom:8px; }\
.xpbar{ height:14px; background:var(--cell); border-radius:8px; overflow:hidden; box-shadow:inset 0 0 0 1.5px var(--cell-edge); }\
.xpbar>div{ height:100%; background:var(--red); width:0; transition:width .5s ease; border-radius:8px; }\
.xptext{ font-size:12px; color:var(--ink-dim); margin-top:4px; text-align:right; }\
.lb{ display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }\
.lb .r{ display:flex; align-items:center; gap:8px; font-size:14px; padding:6px 10px; background:var(--cell); border-radius:8px; }\
.lb .r .rk{ width:20px; color:var(--ink-dim); font-weight:800; }\
.lb .r .nm{ flex:1; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\
.lb .r .lv{ color:var(--ink-dim); font-size:12px; }\
.lb .r.me{ box-shadow:inset 0 0 0 1.5px var(--red); }\
.prof-sync{ margin-bottom:14px; font-size:13px; color:var(--ink-dim); }\
.prof-sync summary{ cursor:pointer; font-weight:700; color:var(--ink); margin-bottom:6px; }\
#syncCode{ flex:1; font-size:11px; word-break:break-all; color:var(--ink-dim); background:var(--cell); padding:8px 10px; border-radius:8px; }\
.prof-sync .btn{ width:auto; padding:0 14px; height:40px; margin:0; font-size:13px; flex:none; }\
#savePseudo{ width:auto; padding:0 16px; height:44px; margin:0; flex:none; }\
.dist-title{ font-size:12px; color:var(--ink-dim); text-transform:uppercase; letter-spacing:.4px; margin:4px 0 8px; }\
.dist{ display:flex; flex-direction:column; gap:6px; margin-bottom:16px; }\
.dist .bar{ display:flex; align-items:center; gap:8px; font-size:13px; }\
.dist .bar .k{ width:12px; color:var(--ink-dim); font-weight:700; }\
.dist .bar .t{ background:var(--red); height:22px; border-radius:5px; min-width:26px; display:flex; align-items:center; justify-content:flex-end; padding:0 8px; color:#fff; font-weight:700; font-size:12px; }";

  var MODAL = '\
<div class="overlay" id="profileOverlay">\
  <div class="modal">\
    <button class="close-x" data-close-prof>&times;</button>\
    <h2>Profil</h2>\
    <div class="prof-row">\
      <input id="pseudoInput" placeholder="Ton pseudo" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false">\
      <button class="btn" id="savePseudo">OK</button>\
    </div>\
    <div class="prof-level">\
      <div class="prof-lvl">Niveau <b id="pLevel">1</b> · <span id="pTitle">Débutant</span></div>\
      <div class="xpbar"><div id="pXpFill"></div></div>\
      <div class="xptext" id="pXpText"></div>\
    </div>\
    <div class="stats">\
      <div class="stat"><div class="n" id="pGames">0</div><div class="l">Parties</div></div>\
      <div class="stat"><div class="n" id="pWins">0</div><div class="l">Victoires</div></div>\
      <div class="stat"><div class="n" id="pXp">0</div><div class="l">XP total</div></div>\
    </div>\
    <div id="gameStats"></div>\
    <div id="lbWrap"><div class="dist-title">Classement</div><div id="leaderboard" class="lb"></div></div>\
    <details class="prof-sync">\
      <summary>Synchroniser sur un autre appareil</summary>\
      <p>Ton code (à coller sur l\'autre appareil pour retrouver ce profil) :</p>\
      <div class="prof-row"><code id="syncCode"></code><button class="btn ghost" id="copyCode">Copier</button></div>\
      <div class="prof-row"><input id="restoreCode" placeholder="Coller un code…" autocomplete="off"><button class="btn ghost" id="restoreBtn">Restaurer</button></div>\
    </details>\
    <button class="btn ghost" data-close-prof>Fermer</button>\
  </div>\
</div>';

  var mounted = false;
  function mount() {
    if (mounted || el("profileOverlay")) { mounted = true; return; }
    mounted = true;
    var st = document.createElement("style"); st.textContent = STYLE; document.head.appendChild(st);
    var wrap = document.createElement("div"); wrap.innerHTML = MODAL; document.body.appendChild(wrap.firstElementChild);

    function close() { el("profileOverlay").classList.remove("open"); }
    var ov = el("profileOverlay");
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close-prof]"), function (b) { b.addEventListener("click", close); });

    el("savePseudo").addEventListener("click", function () { setPseudo(el("pseudoInput").value); });
    el("pseudoInput").addEventListener("keydown", function (e) { if (e.key === "Enter") setPseudo(el("pseudoInput").value); });
    el("copyCode").addEventListener("click", function () {
      try { navigator.clipboard.writeText(state.id); el("copyCode").textContent = "Copié"; setTimeout(function () { el("copyCode").textContent = "Copier"; }, 1200); } catch (e) {}
    });
    el("restoreBtn").addEventListener("click", function () {
      var code = (el("restoreCode").value || "").trim();
      if (!/^[0-9a-f-]{16,}$/i.test(code)) { el("restoreCode").value = ""; el("restoreCode").placeholder = "Code invalide"; return; }
      if (!configured) { el("restoreCode").placeholder = "Base non configurée"; el("restoreCode").value = ""; return; }
      fetchRemote(code).then(function (rem) {
        if (!rem) { el("restoreCode").value = ""; el("restoreCode").placeholder = "Code introuvable"; return; }
        state = { id: code, pseudo: rem.pseudo || "", xp: rem.xp || 0, games: rem.games || 0, wins: rem.wins || 0, level: levelFromXp(rem.xp || 0) };
        saveLocal(); el("restoreCode").value = ""; fill();
      });
    });
  }

  function fill() {
    var li = levelInfo(state.xp);
    set("pLevel", li.level); set("pTitle", li.title);
    var f = el("pXpFill"); if (f) f.style.width = Math.round(li.progress * 100) + "%";
    set("pXpText", li.inLevel + " / " + li.span + " XP  (encore " + li.toNext + ")");
    set("pGames", state.games); set("pWins", state.wins); set("pXp", state.xp);
    var pi = el("pseudoInput"); if (pi && document.activeElement !== pi) pi.value = state.pseudo || "";
    var sc = el("syncCode"); if (sc) sc.textContent = state.id;
    leaderboard();
  }

  function leaderboard() {
    var wrap = el("lbWrap"), box = el("leaderboard");
    if (!wrap || !box) return;
    if (!configured) { wrap.style.display = "none"; return; }
    wrap.style.display = "";
    box.innerHTML = '<div class="r"><span class="nm" style="color:var(--ink-dim)">Chargement…</span></div>';
    fetch(API + "/rest/v1/profiles?select=id,pseudo,level,xp,wins&order=xp.desc&limit=15", { headers: headers() })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        if (!rows.length) { box.innerHTML = '<div class="r"><span class="nm" style="color:var(--ink-dim)">Personne encore — sois le premier !</span></div>'; return; }
        box.innerHTML = rows.map(function (p, i) {
          var me = p.id === state.id ? " me" : "";
          var nm = (p.pseudo && p.pseudo.trim()) ? p.pseudo : "Anonyme";
          return '<div class="r' + me + '"><span class="rk">' + (i + 1) + '</span><span class="nm">' + escapeHtml(nm) + '</span><span class="lv">Niv. ' + (p.level || 1) + " · " + (p.xp || 0) + " XP</span></div>";
        }).join("");
      })
      .catch(function () { box.innerHTML = '<div class="r"><span class="nm" style="color:var(--ink-dim)">Classement indisponible</span></div>'; });
  }

  function refreshOpen() { var o = el("profileOverlay"); if (o && o.classList.contains("open")) fill(); }

  function setPseudo(n) { state.pseudo = (n || "").slice(0, 16); saveLocal(); pushDebounced(); fill(); }
  function open(gameStatsHTML) { mount(); var g = el("gameStats"); if (g) g.innerHTML = gameStatsHTML || ""; fill(); el("profileOverlay").classList.add("open"); }

  window.Profile = {
    state: state,
    configured: configured,
    levelInfo: levelInfo,
    open: open,
    setPseudo: setPseudo,
    addGame: function (o) {
      o = o || {};
      state.games += (o.gamesInc == null ? 1 : o.gamesInc);
      if (o.won) state.wins++;
      state.xp += (o.xp || 0);
      state.level = levelFromXp(state.xp);
      saveLocal(); pushDebounced(); refreshOpen();
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mount(); syncInit(); });
  else { mount(); syncInit(); }
})();
