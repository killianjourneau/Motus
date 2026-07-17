// ---------------------------------------------------------------------------
// Configuration de la base de données (facultative).
//
// Laisse les deux valeurs VIDES -> le profil fonctionne en local sur l'appareil.
// Renseigne-les -> le profil est sauvegardé dans ta base Supabase et un
// classement s'affiche.
//
// Où trouver ces valeurs : dans ton projet Supabase, Settings > API.
//   SUPABASE_URL       = "Project URL"      (ex : https://abcd1234.supabase.co)
//   SUPABASE_ANON_KEY  = clé "anon public"  (elle est publique, c'est normal)
// ---------------------------------------------------------------------------
window.MOTUS_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
