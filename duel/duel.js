/* Duel joueur contre joueur.
   Chaque joueur choisit le mot que l'autre devra deviner.
   Vainqueur : le moins d'essais ; à égalité, le temps le plus court.
   Limite : 5 minutes après le début du duel.

   Échange via Supabase (table "duels"), avec interrogation régulière :
   pas de serveur temps réel nécessaire. */
(function () {
  "use strict";

  var CFG = window.MOTUS_CONFIG || {};
  var API = (CFG.SUPABASE_URL || "").replace(/\/+$/, "");
  var KEY = CFG.SUPABASE_ANON_KEY || "";
  var configured = !!(API && KEY);

  var LIMIT_MS = 5 * 60 * 1000;          // 5 minutes
  var POLL_MS = 2500;

  function headers(extra) {
    var h = { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json" };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  /* Code de partie : 5 caractères, sans I/O/0/1 pour éviter les confusions */
  var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function newCode() {
    var s = "";
    for (var i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return s;
  }

  /* Le mot n'est pas stocké en clair : ça n'empêcherait pas un tricheur
     déterminé, mais ça évite de le lire d'un coup d'œil dans la base. */
  function hide(w) { try { return btoa(unescape(encodeURIComponent(String(w).split("").reverse().join("")))); } catch (e) { return w; } }
  function show(w) { try { return decodeURIComponent(escape(atob(String(w)))).split("").reverse().join(""); } catch (e) { return w; } }

  function req(path, opt) {
    if (!configured) return Promise.reject(new Error("no-config"));
    return fetch(API + "/rest/v1/" + path, opt).then(function (r) {
      if (!r.ok) throw new Error("http-" + r.status);
      return r.status === 204 ? null : r.json();
    });
  }

  function me() {
    var p = (window.Profile && window.Profile.state) || {};
    var b = "";
    try { b = (window.Profile.badges.filter(function (x) { return x.id === p.emblem; })[0] || {}).e || ""; } catch (e) {}
    return {
      id: p.id || "anon",
      pseudo: (p.pseudo || "").trim() || "Anonyme",
      level: p.level || 1,
      badge: b
    };
  }

  var API_OBJ = {
    configured: configured,
    LIMIT_MS: LIMIT_MS,

    /* Crée un duel et renvoie son code. word = mot que l'adversaire devra trouver. */
    create: function (word) {
      var m = me(), code = newCode();
      return req("duels", {
        method: "POST",
        headers: headers({ "Prefer": "return=representation" }),
        body: JSON.stringify({
          id: code, status: "waiting",
          p1_id: m.id, p1_pseudo: m.pseudo, p1_level: m.level, p1_badge: m.badge,
          word1: hide(word)
        })
      }).then(function () { return code; });
    },

    /* Rejoint un duel existant. */
    join: function (code, word) {
      var m = me();
      code = String(code || "").trim().toUpperCase();
      return req("duels?id=eq." + encodeURIComponent(code) + "&select=*", { headers: headers() })
        .then(function (rows) {
          var d = rows && rows[0];
          if (!d) throw new Error("introuvable");
          if (d.p2_id && d.p2_id !== m.id) throw new Error("complet");
          if (d.p1_id === m.id) throw new Error("soi-meme");
          return req("duels?id=eq." + encodeURIComponent(code), {
            method: "PATCH",
            headers: headers({ "Prefer": "return=representation" }),
            body: JSON.stringify({
              p2_id: m.id, p2_pseudo: m.pseudo, p2_level: m.level, p2_badge: m.badge,
              word2: hide(word), status: "playing", started_at: new Date().toISOString()
            })
          }).then(function (r) { return API_OBJ.parse((r && r[0]) || d); });
        });
    },

    fetch: function (code) {
      return req("duels?id=eq." + encodeURIComponent(String(code).toUpperCase()) + "&select=*", { headers: headers() })
        .then(function (rows) {
          var d = rows && rows[0];
          if (!d) throw new Error("introuvable");
          return API_OBJ.parse(d);
        });
    },

    /* Enregistre le résultat du joueur. side vaut 1 ou 2. */
    report: function (code, side, res) {
      var patch = {};
      patch["p" + side + "_tries"] = res.tries || 0;
      patch["p" + side + "_ms"] = Math.round(res.ms || 0);
      patch["p" + side + "_won"] = !!res.won;
      patch["p" + side + "_done"] = true;
      return req("duels?id=eq." + encodeURIComponent(code), {
        method: "PATCH", headers: headers({ "Prefer": "return=minimal" }),
        body: JSON.stringify(patch)
      });
    },

    /* Ajoute les champs pratiques : mots déchiffrés, camp du joueur, échéance. */
    parse: function (d) {
      var m = me();
      d.side = (d.p1_id === m.id) ? 1 : (d.p2_id === m.id ? 2 : 0);
      d.myWord = d.side === 1 ? show(d.word1 || "") : show(d.word2 || "");     // le mot que J'AI choisi
      d.target = d.side === 1 ? show(d.word2 || "") : show(d.word1 || "");     // le mot que JE dois trouver
      d.opp = d.side === 1
        ? { id: d.p2_id, pseudo: d.p2_pseudo, level: d.p2_level, badge: d.p2_badge }
        : { id: d.p1_id, pseudo: d.p1_pseudo, level: d.p1_level, badge: d.p1_badge };
      d.mine = d.side === 1
        ? { tries: d.p1_tries, ms: d.p1_ms, done: d.p1_done, won: d.p1_won }
        : { tries: d.p2_tries, ms: d.p2_ms, done: d.p2_done, won: d.p2_won };
      d.his = d.side === 1
        ? { tries: d.p2_tries, ms: d.p2_ms, done: d.p2_done, won: d.p2_won }
        : { tries: d.p1_tries, ms: d.p1_ms, done: d.p1_done, won: d.p1_won };
      d.deadline = d.started_at ? (new Date(d.started_at).getTime() + LIMIT_MS) : 0;
      return d;
    },

    /* Départage : moins d'essais, puis temps le plus court. */
    verdict: function (d) {
      var a = d.mine, b = d.his;
      var aw = a.done && a.won, bw = b.done && b.won;
      if (aw && !bw) return { r: "win", why: "Ton adversaire n'a pas trouvé." };
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

    /* Interrogation régulière de l'état du duel. */
    watch: function (code, cb) {
      var stop = false, t = null;
      function tick() {
        if (stop) return;
        API_OBJ.fetch(code).then(function (d) { if (!stop) cb(null, d); })
          .catch(function (e) { if (!stop) cb(e); })
          .then(function () { if (!stop) t = setTimeout(tick, POLL_MS); });
      }
      tick();
      return function () { stop = true; clearTimeout(t); };
    }
  };

  window.Duel = API_OBJ;
})();
