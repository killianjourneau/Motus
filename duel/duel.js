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

  /* Nombre de salons publics rejoignables, pour ne pas attendre à l'aveugle. */
  function waitingCount(kind) {
    return rpc("mp_waiting", { p_kind: kind }).then(function (n) {
      var v = (n && n.mp_waiting !== undefined) ? n.mp_waiting : n;
      return typeof v === "number" ? v : 0;
    }).catch(function () { return null; });
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

    /* Partie publique : rejoint un salon ouvert s'il en existe un, sinon en crée un. */
    publicCount: function () { return waitingCount("duel"); },

    quick: function (word) {
      var m = me();
      return rpc("duel_quick", {
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

    /* Transmet la liste des essais déjà joués, pour le suivi en direct.
       Silencieux : un échec ne doit jamais gêner la partie en cours. */
    moves: function (code, list) {
      var m = me();
      return rpc("duel_moves", {
        p_code: String(code || "").toUpperCase(), p_id: m.id,
        p_moves: hide((list || []).join(","))
      }).then(function (row) { return row ? D.parse(row) : null; }).catch(function () { return null; });
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
      // classement Elo : calculé et écrit par la base, jamais par le client
      d.myElo    = d.side === 2 ? d.p2_elo : d.p1_elo;
      d.oppElo   = d.side === 2 ? d.p1_elo : d.p2_elo;
      d.myDelta  = d.side === 2 ? d.p2_elo_delta : d.p1_elo_delta;
      var raw = d.side === 2 ? (d.p1_moves || "") : (d.p2_moves || "");
      d.oppMoves = raw ? show(raw).split(",").filter(Boolean) : [];
      d.rematch = d.rematch_code || "";
      d.isPublic = !!d.is_public;
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

  /* ==================================================================
     COURSE À L'ÉCRITURE
     Les deux joueurs recopient la même suite de mots, de plus en plus
     longs. Le plus rapide gagne ; chaque faute coûte une vie.
     La suite est fixée par le créateur et partagée via la base, pour
     que personne ne tombe sur des mots différents.
     ================================================================== */
  var R = {
    configured: configured,
    LIMIT_MS: LIMIT_MS,

    create: function (theme, words) {
      var m = me();
      return rpc("race_create", {
        p_id: m.id, p_pseudo: m.pseudo, p_level: m.level, p_badge: m.badge,
        p_words: hide(JSON.stringify({ t: theme, w: words })), p_theme: theme
      }).then(function (row) {
        if (!row || !row.id) throw new Error("creation-impossible");
        return R.parse(row);
      });
    },

    /* Course publique : rejoint une course ouverte, sinon en crée une.
       En cas de jonction, la suite de mots déjà fixée l'emporte. */
    publicCount: function () { return waitingCount("race"); },

    /* Meilleurs temps par thème. Tenus par la base, jamais écrits par le client. */
    records: function () {
      if (!configured) return Promise.resolve(null);
      return fetch(API + "/rest/v1/race_records?select=theme,pseudo,ms,words", { headers: headers(), cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (rows) {
          if (!rows) return null;
          var by = {};
          rows.forEach(function (x) { if (x && x.theme) by[x.theme] = x; });
          return by;
        })
        .catch(function () { return null; });
    },

    quick: function (theme, words) {
      var m = me();
      return rpc("race_quick", {
        p_id: m.id, p_pseudo: m.pseudo, p_level: m.level, p_badge: m.badge,
        p_words: hide(JSON.stringify({ t: theme, w: words })), p_theme: theme
      }).then(function (row) {
        if (!row || !row.id) throw new Error("creation-impossible");
        return R.parse(row);
      });
    },

    join: function (code) {
      var m = me();
      return rpc("race_join", {
        p_code: String(code || "").trim().toUpperCase(),
        p_id: m.id, p_pseudo: m.pseudo, p_level: m.level, p_badge: m.badge
      }).then(function (row) {
        if (!row || !row.id) throw new Error("jonction-impossible");
        return R.parse(row);
      });
    },

    rematch: function (code, theme, words) {
      var m = me();
      return rpc("race_rematch", {
        p_code: String(code || "").toUpperCase(),
        p_id: m.id, p_pseudo: m.pseudo, p_level: m.level, p_badge: m.badge,
        p_words: hide(JSON.stringify({ t: theme, w: words })), p_theme: theme
      }).then(function (row) {
        if (!row || !row.id) throw new Error("revanche-impossible");
        return R.parse(row);
      });
    },

    fetch: function (code) {
      return rpc("duel_get", { p_code: String(code || "").toUpperCase() }).then(function (row) {
        if (!row || !row.id) throw new Error("introuvable");
        return R.parse(row);
      });
    },

    /* done = nombre de mots recopiés ; won = suite terminée entièrement */
    report: function (code, res) {
      var m = me();
      return rpc("duel_report", {
        p_code: String(code || "").toUpperCase(), p_id: m.id,
        p_tries: res.done || 0, p_ms: Math.round(res.ms || 0), p_won: !!res.won
      }).then(function (row) { return row ? R.parse(row) : null; });
    },

    emote: function (code, value) { return D.emote(code, value); },

    parse: function (d) {
      var m = me();
      d.side = (d.p1_id === m.id) ? 1 : (d.p2_id === m.id ? 2 : 0);
      d.opp = d.side === 2
        ? { id: d.p1_id, pseudo: d.p1_pseudo, level: d.p1_level, badge: d.p1_badge }
        : { id: d.p2_id, pseudo: d.p2_pseudo, level: d.p2_level, badge: d.p2_badge };
      d.mine = d.side === 2
        ? { done: d.p2_tries, ms: d.p2_ms, over: !!d.p2_done, won: !!d.p2_won }
        : { done: d.p1_tries, ms: d.p1_ms, over: !!d.p1_done, won: !!d.p1_won };
      d.his = d.side === 2
        ? { done: d.p1_tries, ms: d.p1_ms, over: !!d.p1_done, won: !!d.p1_won }
        : { done: d.p2_tries, ms: d.p2_ms, over: !!d.p2_done, won: !!d.p2_won };
      d.oppEmote = d.side === 2 ? (d.p1_emote || "") : (d.p2_emote || "");
      var raw = d.side === 2 ? (d.p1_moves || "") : (d.p2_moves || "");
      d.oppMoves = raw ? show(raw).split(",").filter(Boolean) : [];
      d.rematch = d.rematch_code || "";
      var pack = null;
      try { pack = JSON.parse(show(d.words || "")); } catch (e) {}
      d.theme = (pack && pack.t) || "mots";
      d.list = (pack && pack.w) || [];
      d.isPublic = !!d.is_public;
      d.ready = !!(d.status === "playing" && d.list.length);
      d.deadline = d.started_at ? (new Date(d.started_at).getTime() + LIMIT_MS) : 0;
      return d;
    },

    /* Le plus rapide gagne. Si personne ne termine, le plus avancé l'emporte. */
    verdict: function (d) {
      var a = d.mine, b = d.his;
      if (a.won && !b.won) return { r: "win", why: "Ton adversaire n'a pas terminé la suite." };
      if (!a.won && b.won) return { r: "lose", why: "Tu n'as pas terminé la suite." };
      if (a.won && b.won) {
        if (a.ms !== b.ms) {
          return a.ms < b.ms
            ? { r: "win", why: "Tu as été le plus rapide." }
            : { r: "lose", why: "Ton adversaire a été le plus rapide." };
        }
        return { r: "draw", why: "Exactement le même temps !" };
      }
      if ((a.done || 0) !== (b.done || 0)) {
        return (a.done || 0) > (b.done || 0)
          ? { r: "win", why: (a.done || 0) + " mots contre " + (b.done || 0) + "." }
          : { r: "lose", why: (b.done || 0) + " mots contre " + (a.done || 0) + "." };
      }
      return { r: "draw", why: "Vous avez recopié autant de mots." };
    },

    watch: function (code, cb) {
      var stop = false, t = null, busy = false;
      function tick() {
        if (stop || busy) return;
        busy = true; clearTimeout(t);
        R.fetch(code)
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

  window.Race = R;

  /* =====================================================================
     Mode Défense — multijoueur asynchrone.
     Chaque joueur pose un mot ; les autres tentent de le percer, une seule
     fois par version du mot. Toute la logique de droit d'attaque et de
     comptage est tenue par la base (voir defense_* dans schema.sql).
     ===================================================================== */
  var F = {
    configured: configured,

    /* Poser ou remplacer son mot de défense. */
    set: function (word, taunt) {
      var m = me(), w = String(word || "").toUpperCase();
      return rpc("defense_set", {
        p_id: m.id, p_pseudo: m.pseudo, p_level: m.level, p_badge: m.badge,
        p_word: hide(w), p_len: w.length, p_taunt: taunt || 0
      }).then(function (row) { return F.parse(row); });
    },

    /* Noter le mot que l'on vient d'attaquer (1 à 5 étoiles).
       Une seule note par attaquant et par version : la base s'en assure. */
    rate: function (targetId, version, stars) {
      var m = me();
      return rpc("defense_rate", {
        p_id: m.id, p_target: targetId, p_version: version, p_stars: stars
      }).catch(function () { return null; });
    },

    /* Ma défense actuelle, ou null si je n'en ai pas encore posé. */
    mine: function () {
      var m = me();
      return rpc("defense_mine", { p_id: m.id })
        .then(function (row) { return F.parse(row); })
        .catch(function () { return null; });
    },

    /* Défenses que je peux attaquer maintenant. */
    targets: function (limit) {
      var m = me();
      return rpc("defense_targets", { p_id: m.id, p_limit: limit || 20 })
        .then(function (rows) { return rows ? [].concat(rows) : []; })
        .catch(function () { return []; });
    },

    /* Lance l'attaque : la tentative est consommée dès cet appel. */
    attack: function (targetId) {
      var m = me();
      return rpc("defense_attack", { p_id: m.id, p_pseudo: m.pseudo, p_target: targetId })
        .then(function (row) {
          if (!row) throw new Error("introuvable");
          return {
            target: show(row.word),
            len: row.wlen,
            version: row.version,
            pseudo: row.pseudo || "Anonyme"
          };
        });
    },

    report: function (targetId, version, o) {
      var m = me();
      o = o || {};
      return rpc("defense_report", {
        p_id: m.id, p_target: targetId, p_version: version,
        p_tries: o.tries || 0, p_won: !!o.won
      }).catch(function () { return null; });
    },

    /* Journal des attaques subies (les plus récentes d'abord). */
    feed: function (limit) {
      var m = me();
      return rpc("defense_feed", { p_id: m.id, p_limit: limit || 15 })
        .then(function (rows) { return rows ? [].concat(rows) : []; })
        .catch(function () { return []; });
    },

    markSeen: function () {
      var m = me();
      return rpc("defense_seen", { p_id: m.id }).catch(function () { return null; });
    },

    parse: function (row) {
      if (!row) return null;
      var d = Array.isArray(row) ? row[0] : row;
      if (!d || !d.player_id) return null;
      return {
        id: d.player_id, pseudo: d.pseudo || "Anonyme",
        len: d.wlen, version: d.version,
        wins: d.wins || 0, losses: d.losses || 0,
        broken: !!d.broken,
        taunt: d.taunt || 0,
        rateSum: d.rate_sum || 0, rateCount: d.rate_count || 0,
        word: show(d.word)            // mon propre mot : je peux le relire
      };
    },

    /* Message lisible pour les erreurs renvoyées par la base. */
    err: function (e) {
      var m = String((e && e.message) || e || "");
      if (m.indexOf("deja-tente") >= 0)      return "Tu as déjà tenté cette défense — attends qu'il change de mot.";
      if (m.indexOf("defense-tombee") >= 0)  return "Cette défense vient de tomber, son mot va changer.";
      if (m.indexOf("soi-meme") >= 0)        return "Tu ne peux pas attaquer ta propre défense.";
      if (m.indexOf("longueur-invalide") >= 0) return "Le mot doit faire entre 4 et 15 lettres.";
      if (m.indexOf("introuvable") >= 0)     return "Défense introuvable.";
      return "Connexion impossible — réessaie.";
    }
  };

  window.Defense = F;
})();
