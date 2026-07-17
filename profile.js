/* Profil joueur + couche communautaire (Motus + Rébus).
   - Stockage local (toujours) + synchronisation Supabase (si configuré).
   - Hub à onglets : Profil (pseudo, niveau, XP, badges), Classement (rang
     mondial), Aujourd'hui (résultats de la communauté sur le jeu du jour).
   - Les pages appellent : Profile.game = 'motus'|'rebus' ;
     Profile.open(htmlStatsDuJeu) ; Profile.addGame({won, xp}) ;
     Profile.submitDaily({game, day, tries, won}). */
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
  function todayStr() { var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }

  /* ---------- Niveaux ---------- */
  var TITLES = ["Débutant", "Apprenti", "Amateur", "Habitué", "Confirmé", "Expert", "Maître", "Champion", "Virtuose", "Légende"];
  function levelFromXp(xp) { var L = 1; while (50 * (L + 1) * L <= xp) L++; return L; }
  function levelInfo(xp) {
    var L = levelFromXp(xp), base = 50 * L * (L - 1), next = 50 * (L + 1) * L;
    return { level: L, title: TITLES[Math.min(L - 1, TITLES.length - 1)], inLevel: xp - base, span: next - base, toNext: next - xp, progress: next > base ? (xp - base) / (next - base) : 1 };
  }

  /* ---------- Badges (calculés en local) ---------- */
  var BADGES = [
    { e: "🎯", n: "Première partie", t: function (s) { return s.games >= 1; } },
    { e: "🏆", n: "Première victoire", t: function (s) { return s.wins >= 1; } },
    { e: "⭐", n: "Niveau 5", t: function (s) { return s.level >= 5; } },
    { e: "🔟", n: "10 victoires", t: function (s) { return s.wins >= 10; } },
    { e: "🎖️", n: "50 parties", t: function (s) { return s.games >= 50; } },
    { e: "🚀", n: "500 XP", t: function (s) { return s.xp >= 500; } },
    { e: "💎", n: "Niveau 10", t: function (s) { return s.level >= 10; } },
    { e: "👑", n: "1000 XP", t: function (s) { return s.xp >= 1000; } }
  ];

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
  function countQuery(qs) {
    if (!configured) return Promise.resolve(null);
    return fetch(API + "/rest/v1/" + qs, { headers: headers({ "Prefer": "count=exact", "Range": "0-0" }) })
      .then(function (r) { var cr = r.headers.get("content-range") || "*/0"; return parseInt(cr.split("/")[1], 10) || 0; })
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

  /* ---------- Helpers UI ---------- */
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function el(id) { return document.getElementById(id); }
  function set(id, v) { var e = el(id); if (e) e.textContent = v; }

  var STYLE = `
#profileOverlay .modal{ max-width:410px; }
.prof-tabs{ display:flex; gap:6px; margin:2px 0 16px; }
.ptab{ flex:1; height:38px; border:none; border-radius:10px; background:var(--cell); color:var(--ink-dim); font-weight:700; font-size:13px; cursor:pointer; box-shadow:inset 0 0 0 1.5px var(--cell-edge); }
.ptab.active{ background:var(--red); color:#fff; box-shadow:none; }
.prof-row{ display:flex; gap:8px; margin-bottom:14px; }
#pseudoInput,#restoreCode{ flex:1; height:44px; border:none; border-radius:10px; background:var(--cell); box-shadow:inset 0 0 0 1.5px var(--cell-edge); color:var(--ink); padding:0 12px; font-size:15px; font-weight:600; }
#pseudoInput:focus,#restoreCode:focus{ outline:none; box-shadow:inset 0 0 0 2px var(--red); }
.prof-level{ margin-bottom:14px; }
.prof-lvl{ font-size:16px; font-weight:700; margin-bottom:8px; }
.xpbar{ height:14px; background:var(--cell); border-radius:8px; overflow:hidden; box-shadow:inset 0 0 0 1.5px var(--cell-edge); }
.xpbar>div{ height:100%; background:var(--red); width:0; transition:width .5s ease; border-radius:8px; }
.xptext{ font-size:12px; color:var(--ink-dim); margin-top:4px; text-align:right; }
.badges{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:6px 0 16px; }
.badge2{ aspect-ratio:1; border-radius:12px; background:var(--cell); box-shadow:inset 0 0 0 1.5px var(--cell-edge); display:grid; place-items:center; font-size:26px; position:relative; }
.badge2.off{ filter:grayscale(1); opacity:.32; }
.badge2 .tip{ position:absolute; bottom:-4px; left:50%; transform:translate(-50%,100%); background:var(--ink); color:var(--bg); font-size:10px; font-weight:700; padding:3px 6px; border-radius:6px; white-space:nowrap; opacity:0; pointer-events:none; transition:.15s; z-index:5; }
.badge2:hover .tip{ opacity:1; }
.lb{ display:flex; flex-direction:column; gap:5px; }
.lb .r{ display:flex; align-items:center; gap:8px; font-size:14px; padding:6px 10px; background:var(--cell); border-radius:8px; }
.lb .r .rk{ width:22px; color:var(--ink-dim); font-weight:800; }
.lb .r .nm{ flex:1; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lb .r .lv{ color:var(--ink-dim); font-size:12px; }
.lb .r.me{ box-shadow:inset 0 0 0 1.5px var(--red); }
.myrank{ text-align:center; font-weight:700; margin-bottom:12px; font-size:15px; }
.myrank b{ color:var(--red); font-size:20px; }
.today-head{ text-align:center; margin-bottom:14px; }
.today-big{ font-size:34px; font-weight:800; }
.today-sub{ color:var(--ink-dim); font-size:13px; }
.prof-sync{ margin-top:14px; font-size:13px; color:var(--ink-dim); }
.prof-sync summary{ cursor:pointer; font-weight:700; color:var(--ink); margin-bottom:6px; }
#syncCode{ flex:1; font-size:11px; word-break:break-all; color:var(--ink-dim); background:var(--cell); padding:8px 10px; border-radius:8px; }
.prof-sync .btn{ width:auto; padding:0 14px; height:40px; margin:0; font-size:13px; flex:none; }
#savePseudo{ width:auto; padding:0 16px; height:44px; margin:0; flex:none; }
.muted{ color:var(--ink-dim); text-align:center; font-size:14px; padding:10px 0; }
.dist-title{ font-size:12px; color:var(--ink-dim); text-transform:uppercase; letter-spacing:.4px; margin:4px 0 8px; }
.dist{ display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.dist .bar{ display:flex; align-items:center; gap:8px; font-size:13px; }
.dist .bar .k{ width:12px; color:var(--ink-dim); font-weight:700; }
.dist .bar .t{ background:var(--red); height:22px; border-radius:5px; min-width:26px; display:flex; align-items:center; justify-content:flex-end; padding:0 8px; color:#fff; font-weight:700; font-size:12px; }`;

  var MODAL = `
<div class="overlay" id="profileOverlay">
  <div class="modal">
    <button class="close-x" data-close-prof>&times;</button>
    <div class="prof-tabs">
      <button class="ptab active" data-tab="profil">Profil</button>
      <button class="ptab" data-tab="rank">Classement</button>
      <button class="ptab" data-tab="today">Aujourd'hui</button>
    </div>

    <div class="pane" id="pane-profil">
      <div class="prof-row">
        <input id="pseudoInput" placeholder="Ton pseudo" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false">
        <button class="btn" id="savePseudo">OK</button>
      </div>
      <div class="prof-level">
        <div class="prof-lvl">Niveau <b id="pLevel">1</b> · <span id="pTitle">Débutant</span></div>
        <div class="xpbar"><div id="pXpFill"></div></div>
        <div class="xptext" id="pXpText"></div>
      </div>
      <div class="stats">
        <div class="stat"><div class="n" id="pGames">0</div><div class="l">Parties</div></div>
        <div class="stat"><div class="n" id="pWins">0</div><div class="l">Victoires</div></div>
        <div class="stat"><div class="n" id="pXp">0</div><div class="l">XP total</div></div>
      </div>
      <div class="dist-title">Badges</div>
      <div class="badges" id="badges"></div>
      <div id="gameStats"></div>
      <details class="prof-sync">
        <summary>Synchroniser sur un autre appareil</summary>
        <p>Ton code (à coller sur l'autre appareil pour retrouver ce profil) :</p>
        <div class="prof-row"><code id="syncCode"></code><button class="btn ghost" id="copyCode">Copier</button></div>
        <div class="prof-row"><input id="restoreCode" placeholder="Coller un code…" autocomplete="off"><button class="btn ghost" id="restoreBtn">Restaurer</button></div>
      </details>
    </div>

    <div class="pane" id="pane-rank" style="display:none">
      <div class="myrank" id="myRank"></div>
      <div id="leaderboard" class="lb"></div>
    </div>

    <div class="pane" id="pane-today" style="display:none">
      <div id="todayStats"></div>
    </div>

    <button class="btn ghost" data-close-prof style="margin-top:16px">Fermer</button>
  </div>
</div>`;

  var mounted = false, curTab = "profil";
  function mount() {
    if (mounted || el("profileOverlay")) { mounted = true; return; }
    mounted = true;
    var st = document.createElement("style"); st.textContent = STYLE; document.head.appendChild(st);
    var wrap = document.createElement("div"); wrap.innerHTML = MODAL.trim(); document.body.appendChild(wrap.firstElementChild);

    function close() { el("profileOverlay").classList.remove("open"); }
    var ov = el("profileOverlay");
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close-prof]"), function (b) { b.addEventListener("click", close); });

    Array.prototype.forEach.call(document.querySelectorAll(".ptab"), function (b) {
      b.addEventListener("click", function () { showTab(b.getAttribute("data-tab")); });
    });

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
        saveLocal(); el("restoreCode").value = ""; fillProfil();
      });
    });
  }

  function showTab(tab) {
    curTab = tab;
    Array.prototype.forEach.call(document.querySelectorAll(".ptab"), function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === tab); });
    el("pane-profil").style.display = tab === "profil" ? "" : "none";
    el("pane-rank").style.display = tab === "rank" ? "" : "none";
    el("pane-today").style.display = tab === "today" ? "" : "none";
    if (tab === "profil") fillProfil();
    else if (tab === "rank") loadRank();
    else if (tab === "today") loadToday();
  }

  function fillProfil() {
    var li = levelInfo(state.xp);
    set("pLevel", li.level); set("pTitle", li.title);
    var f = el("pXpFill"); if (f) f.style.width = Math.round(li.progress * 100) + "%";
    set("pXpText", li.inLevel + " / " + li.span + " XP  (encore " + li.toNext + ")");
    set("pGames", state.games); set("pWins", state.wins); set("pXp", state.xp);
    var pi = el("pseudoInput"); if (pi && document.activeElement !== pi) pi.value = state.pseudo || "";
    var sc = el("syncCode"); if (sc) sc.textContent = state.id;
    var b = el("badges");
    if (b) b.innerHTML = BADGES.map(function (bd) {
      var on = bd.t(state);
      return '<div class="badge2' + (on ? "" : " off") + '">' + bd.e + '<span class="tip">' + escapeHtml(bd.n) + '</span></div>';
    }).join("");
  }

  function loadRank() {
    var box = el("leaderboard"), mr = el("myRank");
    if (!configured) { mr.textContent = ""; box.innerHTML = '<div class="muted">Classement disponible une fois la base configurée.</div>'; return; }
    mr.textContent = "…"; box.innerHTML = '<div class="muted">Chargement…</div>';
    Promise.all([
      countQuery("profiles?select=id&xp=gt." + state.xp),
      countQuery("profiles?select=id")
    ]).then(function (r) {
      var above = r[0], total = r[1];
      if (above != null && total != null) mr.innerHTML = "Ta place : <b>#" + (above + 1) + "</b> sur " + total + " joueurs";
      else mr.textContent = "";
    });
    fetch(API + "/rest/v1/profiles?select=id,pseudo,level,xp&order=xp.desc&limit=20", { headers: headers() })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        if (!rows.length) { box.innerHTML = '<div class="muted">Personne encore — sois le premier !</div>'; return; }
        box.innerHTML = rows.map(function (p, i) {
          var me = p.id === state.id ? " me" : "";
          var nm = (p.pseudo && p.pseudo.trim()) ? p.pseudo : "Anonyme";
          return '<div class="r' + me + '"><span class="rk">' + (i + 1) + '</span><span class="nm">' + escapeHtml(nm) + '</span><span class="lv">Niv. ' + (p.level || 1) + " · " + (p.xp || 0) + " XP</span></div>";
        }).join("");
      })
      .catch(function () { box.innerHTML = '<div class="muted">Classement indisponible</div>'; });
  }

  function loadToday() {
    var box = el("todayStats");
    var g = window.Profile.game || "motus";
    var d = todayStr();
    var label = g === "rebus" ? "Rébus du jour" : "Mot du jour";
    if (!configured) { box.innerHTML = '<div class="muted">Stats communautaires disponibles une fois la base configurée.</div>'; return; }
    box.innerHTML = '<div class="muted">Chargement…</div>';
    var base = API + "/rest/v1/daily_results?game=eq." + g + "&day=eq." + d;
    Promise.all([
      fetch(base + "&select=won,tries", { headers: headers() }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }),
      fetch(base + "&won=eq.true&select=pseudo,tries&order=tries.asc,created_at.asc&limit=10", { headers: headers() }).then(function (r) { return r.ok ? r.json() : []; })
    ]).then(function (res) {
      var rows = res[0], top = res[1];
      var total = rows.length, solved = rows.filter(function (x) { return x.won; }).length;
      var pct = total ? Math.round(solved / total * 100) : 0;
      var html = '<div class="today-head"><div class="today-big">' + total + '</div><div class="today-sub">' + (total > 1 ? "joueurs ont tenté le " : "joueur a tenté le ") + label.toLowerCase() + '</div></div>';
      html += '<div class="dist-title">' + pct + '% de réussite (' + solved + "/" + total + ')</div>';
      if (g === "motus") {
        var dist = {}; for (var i = 1; i <= 6; i++) dist[i] = 0;
        rows.forEach(function (x) { if (x.won && x.tries >= 1 && x.tries <= 6) dist[x.tries]++; });
        var max = Math.max(1, dist[1], dist[2], dist[3], dist[4], dist[5], dist[6]);
        html += '<div class="dist-title">Essais de la communauté</div><div class="dist">';
        for (var j = 1; j <= 6; j++) { var v = dist[j], w = Math.max(Math.round(v / max * 100), 8); html += '<div class="bar"><span class="k">' + j + '</span><div class="t" style="width:' + w + '%">' + v + '</div></div>'; }
        html += "</div>";
      }
      html += '<div class="dist-title">Top du jour</div>';
      if (!top.length) html += '<div class="muted">Personne n\'a encore trouvé aujourd\'hui.</div>';
      else html += '<div class="lb">' + top.map(function (p, i) {
        var nm = (p.pseudo && p.pseudo.trim()) ? p.pseudo : "Anonyme";
        var t = g === "motus" ? (p.tries + " essai" + (p.tries > 1 ? "s" : "")) : "trouvé";
        return '<div class="r"><span class="rk">' + (i + 1) + '</span><span class="nm">' + escapeHtml(nm) + '</span><span class="lv">' + t + "</span></div>";
      }).join("") + "</div>";
      box.innerHTML = html;
    }).catch(function () {
      box.innerHTML = '<div class="muted">Stats du jour indisponibles.<br>(As-tu créé la table <b>daily_results</b> ?)</div>';
    });
  }

  function refreshOpen() { var o = el("profileOverlay"); if (o && o.classList.contains("open") && curTab === "profil") fillProfil(); }

  function setPseudo(n) { state.pseudo = (n || "").slice(0, 16); saveLocal(); pushDebounced(); fillProfil(); }
  function open(gameStatsHTML) { mount(); var g = el("gameStats"); if (g) g.innerHTML = gameStatsHTML || ""; showTab("profil"); el("profileOverlay").classList.add("open"); }

  window.Profile = {
    state: state,
    configured: configured,
    game: "motus",
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
    },
    submitDaily: function (o) {
      if (!configured || !o) return;
      fetch(API + "/rest/v1/daily_results?on_conflict=player_id,game,day", {
        method: "POST",
        headers: headers({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify({ player_id: state.id, pseudo: state.pseudo, game: o.game, day: o.day, tries: (o.tries == null ? null : o.tries), won: !!o.won })
      }).catch(function () {});
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mount(); syncInit(); });
  else { mount(); syncInit(); }
})();
