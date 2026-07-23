/* Duel joueur contre joueur.
   Chaque joueur choisit le mot que l'autre devra deviner.
   Vainqueur : le moins d'essais ; à égalité, le temps le plus court.
   Limite : 5 minutes après le début du duel.

   Toute la logique passe par des fonctions de la base (voir schema.sql) :
   elles sont atomiques et s'exécutent avec les droits du propriétaire,
   ce qui évite les écritures refusées ou partielles. */
(function () {
  "use strict";

  var CFG = window.MOTUS_CONFIG || {};
  var API = (CFG.SUPABASE_URL || "").replace(/\/+$/, "");
  var KEY = CFG.SUPABASE_ANON_KEY || "";
  var configured = !!(API && KEY);

  var LIMIT_MS = 5 * 60 * 1000;
  var POLL_MS = 2500;

  function headers() {
    return { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json" };
  }

  /* Le mot n'est pas stocké en clair : ça n'arrête pas un tricheur décidé,
     mais ça évite de le lire d'un coup d'œil. */
  function hide(w) { try { return btoa(unescape(encodeURIComponent(String(w).split("").reverse().join("")))); } catch (e) { return w; } }
  function show(w) { if (!w) return ""; try { return decodeURIComponent(escape(atob(String(w)))).split("").reverse().join(""); } catch (e) { return String(w); } }

  /* Appelle une fonction de la base. Les erreurs métier ('introuvable',
     'complet', 'soi-meme') remontent telles quelles. */
  function rpc(name, params) {
    if (!configured) return Promise.reject(new Error("non-configure"));
    return fetch(API + "/rest/v1/rpc/" + name, {
      method: "POST", headers: headers(), body: JSON.stringify(params || {})
    }).then(function (r) {
      return r.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) {}
        if (!r.ok) {
          var msg = (data && (data.message || data.hint || data.details)) || ("http-" + r.status);
          if (/n'existe pas|does not exist|PGRST202|404/i.test(msg) || r.status === 404) msg = "fonctions-absentes";
          throw new Error(String(msg).replace(/^ERREUR:\s*/i, ""));
        }
        return Array.isArray(data) ? (data[0] || null) : data;
      });
    });
  }

  function me() {
    var p = (window.Profile && window.Profile.state) || {};
    var badge = "";
    try {
      var list = (window.Profile && window.Profile.badges) || [];
      for (var i = 0; i < list.length; i++) if (list[i].id === p.emblem) { badge = list[i].e; break; }
    } catch (e) {}
    return {
      id: p.id || "00000000-0000-4000-8000-000000000000",
      pseudo: (p.pseudo || "").trim() || "Anonyme",
      level: p.level || 1,
      badge: badge
    };
  }

  var D = {
    configured: configured,
    LIMIT_MS: LIMIT_MS,

    create: function (word) {
      var m = me();
      return rpc("duel_create", {
        p_id: m.id, p_pseudo: m.pseudo, p_level: m.level, p_badge: m.badge, p_word: hide(word)
      }).then(function (row) {
        if (!row || !row.id) throw new Error("creation-impossible");
        return D.parse(row);
      });
    },

    join: function (code, word) {
      var m = me();
      return rpc("duel_join", {
        p_code: String(code || "").trim().toUpperCase(),
        p_id: m.id, p_pseudo: m.pseudo, p_level: m.level, p_badge: m.badge, p_word: hide(word)
      }).then(function (row) {
        if (!row || !row.id) throw new Error("jonction-impossible");
        return D.parse(row);
      });
    },

    fetch: function (code) {
      return rpc("duel_get", { p_code: String(code || "").toUpperCase() }).then(function (row) {
        if (!row || !row.id) throw new Error("introuvable");
        return D.parse(row);
      });
    },

    report: function (code, res) {
      var m = me();
      return rpc("duel_report", {
        p_code: String(code || "").toUpperCase(), p_id: m.id,
        p_tries: res.tries || 0, p_ms: Math.round(res.ms || 0), p_won: !!res.won
      }).then(function (row) { return row ? D.parse(row) : null; });
    },

    /* Revanche : le 1er à cliquer crée le nouveau duel, le 2e le rejoint
       (résolu côté base, donc pas d'échange de code). */
    rematch: function (code, word) {
      var m = me();
      return rpc("duel_rematch", {
        p_code: String(code || "").toUpperCase(),
        p_id: m.id, p_pseudo: m.pseudo, p_level: m.level, p_badge: m.badge, p_word: hide(word)
      }).then(function (row) {
        if (!row || !row.id) throw new Error("revanche-impossible");
        return D.parse(row);
      });
    },

    /* Émote : phrase toute faite envoyée à l'adversaire. La valeur inclut
       un horodatage pour que deux envois identiques soient bien détectés. */
    emote: function (code, value) {
      var m = me();
      return rpc("duel_emote", {
        p_code: String(code || "").toUpperCase(), p_id: m.id, p_emote: String(value)
      }).then(function (row) { return row ? D.parse(row) : null; }).catch(function () { return null; });
    },

    /* Ajoute les champs pratiques : mots déchiffrés, camp, échéance. */
    parse: function (d) {
      var m = me();
      d.side = (d.p1_id === m.id) ? 1 : (d.p2_id === m.id ? 2 : 0);
      d.myWord = d.side === 2 ? show(d.word2) : show(d.word1);
      d.target = d.side === 2 ? show(d.word1) : show(d.word2);
      d.opp = d.side === 2
        ? { id: d.p1_id, pseudo: d.p1_pseudo, level: d.p1_level, badge: d.p1_badge }
        : { id: d.p2_id, pseudo: d.p2_pseudo, level: d.p2_level, badge: d.p2_badge };
      d.mine = d.side === 2
        ? { tries: d.p2_tries, ms: d.p2_ms, done: !!d.p2_done, won: !!d.p2_won }
        : { tries: d.p1_tries, ms: d.p1_ms, done: !!d.p1_done, won: !!d.p1_won };
      d.his = d.side === 2
        ? { tries: d.p1_tries, ms: d.p1_ms, done: !!d.p1_done, won: !!d.p1_won }
        : { tries: d.p2_tries, ms: d.p2_ms, done: !!d.p2_done, won: !!d.p2_won };
      d.oppEmote = d.side === 2 ? (d.p1_emote || "") : (d.p2_emote || "");
      d.rematch = d.rematch_code || "";
      d.ready = !!(d.status === "playing" && d.target);
      d.deadline = d.started_at ? (new Date(d.started_at).getTime() + LIMIT_MS) : 0;
      return d;
    },

    verdict: function (d) {
      var a = d.mine, b = d.his;
      var aw = a.done && a.won, bw = b.done && b.won;
      if (aw && !bw) return { r: "win", why: "Ton adversaire n'a pas trouvé le mot." };
      if (!aw && bw) return { r: "lose", why: "Tu n'as pas trouvé le mot." };
      if (!aw && !bw) return { r: "draw", why: "Aucun des deux n'a trouvé." };
      if (a.tries !== b.tries) {
        return a.tries < b.tries
          ? { r: "win", why: a.tries + " essais contre " + b.tries + "." }
          : { r: "lose", why: b.tries + " essais contre " + a.tries + "." };
      }
      if (a.ms !== b.ms) {
        return a.ms < b.ms
          ? { r: "win", why: "Même nombre d'essais, mais tu as été plus rapide." }
          : { r: "lose", why: "Même nombre d'essais, mais il a été plus rapide." };
      }
      return { r: "draw", why: "Même nombre d'essais et même temps !" };
    },

    /* Interrogation régulière, relancée au retour sur l'application
       (les navigateurs mobiles gèlent les minuteurs en arrière-plan). */
    watch: function (code, cb) {
      var stop = false, t = null, busy = false;
      function tick() {
        if (stop || busy) return;
        busy = true; clearTimeout(t);
        D.fetch(code)
          .then(function (d) { if (!stop) cb(null, d); })
          .catch(function (e) { if (!stop) cb(e); })
          .then(function () { busy = false; if (!stop) t = setTimeout(tick, POLL_MS); });
      }
      function onVis() { if (!document.hidden && !stop) tick(); }
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("focus", onVis);
      tick();
      var stopper = function () {
        stop = true; clearTimeout(t);
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("focus", onVis);
      };
      stopper.now = tick;
      return stopper;
    }
  };

  window.Duel = D;
})();
