/* Annonces Discord, envoyées par GitHub Actions — aucun bot à héberger.
 *
 * Discord fournit des « webhooks » : une adresse secrète à laquelle on
 * envoie un message, qui apparaît alors dans le salon choisi.
 *
 *   node scripts/discord.js jour       -> annonce quotidienne
 *   node scripts/discord.js version    -> annonce d'une nouvelle version
 *   node scripts/discord.js jour --test   (affiche sans envoyer)
 *
 * L'adresse du webhook vient de la variable DISCORD_WEBHOOK, fournie par un
 * « secret » GitHub. Elle ne doit JAMAIS être écrite dans le dépôt : le code
 * est public, et quiconque la connaît peut publier dans votre salon.
 */
const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const SITE = (process.env.SITE_URL || "https://killianjourneau.github.io/Motus/").replace(/\/?$/, "/");
const TEST = process.argv.includes("--test");
const QUOI = process.argv[2] || "jour";

/* ---- calcul du mot du jour : EXACTEMENT celui du jeu ----
   Toute différence ici annoncerait un autre mot que celui joué. */
const EPOCH = Math.floor(Date.UTC(2025, 0, 1) / 86400000);
function motsNormaux() {
  const w = {};
  new Function("window", fs.readFileSync(path.join(RACINE, "dico", "motus-words.js"), "utf8"))(w);
  return (w.MOTUS_WORDS && w.MOTUS_WORDS.normal) || [];
}
function cleDuJour(d) {
  // le jeu utilise la date LOCALE du joueur ; on se cale sur Paris
  const p = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p;                                    // AAAA-MM-JJ
}
function numeroDuJour(cle) {
  const [y, m, d] = cle.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000) - EPOCH;
}
function motDuJour(num, pool) {
  return pool[((num * 2654435761) >>> 0) % pool.length];
}

function lien(src) { return SITE + "?src=" + src; }

function annonceJour() {
  const pool = motsNormaux();
  const maintenant = new Date();
  const aujourdhui = numeroDuJour(cleDuJour(maintenant));
  const hier = motDuJour(aujourdhui - 1, pool);
  return [
    "☀️ **Les exercices du jour sont en ligne !**",
    "",
    "📅 **Mot du jour n°" + aujourdhui + "** — un mot, six essais",
    "✍️ **Grammaire du jour** — trois phrases à compléter",
    "🔤 **Orthographe du jour** — trois mots à bien écrire",
    "🔥 **Défi du jour** — trois mots en quinze minutes",
    "",
    // balise spoiler Discord : masqué tant qu'on ne clique pas dessus
    "Le mot d'hier était ||" + hier + "|| (clique pour le révéler)",
    "",
    "👉 " + lien("discord")
  ].join("\n");
}

function annonceVersion() {
  const v = JSON.parse(fs.readFileSync(path.join(RACINE, "package.json"), "utf8")).version;
  const note = (process.env.NOTE_VERSION || "").trim();
  return [
    "🆕 **Mot en Six " + v + " est disponible !**",
    note ? "\n" + note + "\n" : "",
    "Rafraîchis le jeu pour en profiter 👉 " + lien("discord")
  ].join("\n");
}

async function envoyer(texte) {
  if (TEST) { console.log("--- (test, rien n'est envoyé) ---\n" + texte); return; }
  const url = process.env.DISCORD_WEBHOOK;
  if (!url) {
    // pas de secret configuré : on ne fait pas échouer toute la publication
    console.log("DISCORD_WEBHOOK absent : annonce ignorée.");
    return;
  }
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: texte, username: "Mot en Six",
                           allowed_mentions: { parse: [] } })   // jamais de @everyone
  });
  if (!r.ok) {
    console.log("Discord a refusé l'annonce : " + r.status + " " + (await r.text()));
    process.exit(1);
  }
  console.log("Annonce envoyée.");
}

const texte = QUOI === "version" ? annonceVersion() : annonceJour();
envoyer(texte).catch(e => { console.log("Échec : " + e.message); process.exit(1); });

module.exports = { numeroDuJour, motDuJour, cleDuJour };
