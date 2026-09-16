-- ===================================================================
--  DUEL — schéma complet (à exécuter dans Supabase → SQL Editor)
--  Idempotent : peut être relancé sans risque, ne supprime aucune
--  donnée et ne touche pas aux tables profiles / daily_results.
-- ===================================================================

create table if not exists duels (
  id          text primary key,
  created_at  timestamptz default now(),
  status      text        default 'waiting',   -- waiting | playing | done
  started_at  timestamptz,
  p1_id uuid, p1_pseudo text, p1_level int, p1_badge text,
  p2_id uuid, p2_pseudo text, p2_level int, p2_badge text,
  word1 text, word2 text,
  p1_tries int, p1_ms int, p1_done boolean default false, p1_won boolean,
  p2_tries int, p2_ms int, p2_done boolean default false, p2_won boolean
);

-- Colonnes ajoutées après la première version (revanche + émotes)
alter table duels add column if not exists rematch_code text;
alter table duels add column if not exists p1_emote text;
alter table duels add column if not exists p2_emote text;

-- Colonnes de la Course à l'écriture : kind distingue les deux jeux,
-- words contient la suite de mots partagée par les deux joueurs.
alter table duels add column if not exists kind text default 'duel';
alter table duels add column if not exists words text;

-- Essais transmis au fil de la partie, pour que celui qui a fini puisse
-- suivre la grille de son adversaire. Aucune fuite : chacun devine le mot
-- choisi par l'autre, donc voir ces essais n'apprend rien sur le sien.
alter table duels add column if not exists p1_moves text;
alter table duels add column if not exists p2_moves text;

-- Thème de la course, en clair : il n'a rien de secret (les deux joueurs le
-- voient) et il permet à la base de tenir elle-même les records par thème.
alter table duels add column if not exists race_theme text;

-- Meilleur temps par thème. Écrit uniquement par race_record_check ci-dessous,
-- donc non manipulable depuis un téléphone.
create table if not exists race_records (
  theme     text primary key,
  player_id uuid,
  pseudo    text,
  ms        int,
  words     int,
  at        timestamptz default now()
);
alter table race_records enable row level security;
drop policy if exists "lecture records" on race_records;
create policy "lecture records" on race_records for select using (true);

-- Classement Elo du Duel. Le calcul est fait par la base (voir duel_apply_elo) :
-- elle possède déjà les deux résultats, donc le verdict n'est pas manipulable
-- depuis un téléphone. Le client lit ces valeurs mais ne les écrit jamais.
alter table profiles add column if not exists elo int default 1000;
alter table profiles add column if not exists elo_games int default 0;
alter table duels add column if not exists p1_elo int;
alter table duels add column if not exists p2_elo int;
alter table duels add column if not exists p1_elo_delta int;
alter table duels add column if not exists p2_elo_delta int;
create index if not exists profiles_elo_idx on profiles (elo desc);

-- Salon public : visible par tous, rejoignable sans code.
alter table duels add column if not exists is_public boolean default false;
create index if not exists duels_public_idx
  on duels (kind, status, created_at) where is_public;

create index if not exists duels_created_idx on duels (created_at);

alter table duels enable row level security;
-- Aucune écriture directe : tout passe par les fonctions ci-dessous.

-- ---------- Ménage des anciens lobbies ----------
-- Un salon jamais rejoint ne sert plus après 2 h ; toute partie est effacée
-- après 24 h. Cela évite que la table grossisse sans fin et libère les codes.
create or replace function duel_gc() returns void language sql security definer as $$
  delete from duels
   where (status = 'waiting' and created_at < now() - interval '2 hours')
      or created_at < now() - interval '24 hours';
$$;

-- ---------- Créer un duel ----------
create or replace function duel_create(
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_word text
) returns duels language plpgsql security definer as $$
declare v_code text; v_row duels; v_n int := 0;
begin
  perform duel_gc();
  loop
    v_n := v_n + 1;
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                                 1 + floor(random() * 32)::int, 1);
    end loop;
    begin
      insert into duels (id, status, p1_id, p1_pseudo, p1_level, p1_badge, word1, p1_elo)
      values (v_code, 'waiting', p_id, p_pseudo, p_level, p_badge, p_word,
              coalesce((select elo from profiles where id = p_id), 1000))
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      if v_n > 12 then raise exception 'code-indisponible'; end if;
    end;
  end loop;
end $$;

-- ---------- Rejoindre (atomique : un seul adversaire possible) ----------
create or replace function duel_join(
  p_code text, p_id uuid, p_pseudo text, p_level int, p_badge text, p_word text
) returns duels language plpgsql security definer as $$
declare v_row duels; v_code text := upper(trim(p_code));
begin
  update duels set
    p2_id = p_id, p2_pseudo = p_pseudo, p2_level = p_level, p2_badge = p_badge,
    word2 = p_word, status = 'playing',
    p2_elo = coalesce((select elo from profiles where id = p_id), 1000),
    started_at = coalesce(started_at, now())
  where id = v_code
    and p1_id <> p_id
    and (p2_id is null or p2_id = p_id)
    and created_at > now() - interval '2 hours'
  returning * into v_row;

  if v_row.id is null then
    if not exists (select 1 from duels where id = v_code) then
      raise exception 'introuvable';
    elsif exists (select 1 from duels where id = v_code and p1_id = p_id) then
      raise exception 'soi-meme';
    elsif exists (select 1 from duels where id = v_code
                    and created_at <= now() - interval '2 hours') then
      raise exception 'expiree';
    else
      raise exception 'complet';
    end if;
  end if;
  return v_row;
end $$;

-- ---------- Lire l'état ----------
create or replace function duel_get(p_code text)
returns duels language sql security definer stable as $$
  select * from duels where id = upper(trim(p_code));
$$;

-- ---------- Enregistrer son résultat ----------
create or replace function duel_report(
  p_code text, p_id uuid, p_tries int, p_ms int, p_won boolean
) returns duels language plpgsql security definer as $$
declare v_row duels; v_code text := upper(trim(p_code));
begin
  update duels set
    p1_tries = case when p1_id = p_id then p_tries else p1_tries end,
    p1_ms    = case when p1_id = p_id then p_ms    else p1_ms    end,
    p1_won   = case when p1_id = p_id then p_won   else p1_won   end,
    p1_done  = case when p1_id = p_id then true    else p1_done  end,
    p2_tries = case when p2_id = p_id then p_tries else p2_tries end,
    p2_ms    = case when p2_id = p_id then p_ms    else p2_ms    end,
    p2_won   = case when p2_id = p_id then p_won   else p2_won   end,
    p2_done  = case when p2_id = p_id then true    else p2_done  end
  where id = v_code and (p1_id = p_id or p2_id = p_id)
  returning * into v_row;

  if v_row.id is null then raise exception 'introuvable'; end if;

  if coalesce(v_row.kind,'duel') = 'race' and p_won then
    perform race_record_check(v_code, p_id);        -- suite terminée : record éventuel
  end if;

  if coalesce(v_row.p1_done,false) and coalesce(v_row.p2_done,false) then
    update duels set status = 'done' where id = v_code returning * into v_row;
    perform duel_apply_elo(v_code);                       -- classement mis à jour une seule fois
    select * into v_row from duels where id = v_code;     -- on renvoie la ligne avec les deltas
  end if;
  return v_row;
end $$;

-- ---------- Revanche (atomique : le 1er crée, le 2e rejoint) ----------
create or replace function duel_rematch(
  p_code text, p_id uuid, p_pseudo text, p_level int, p_badge text, p_word text
) returns duels language plpgsql security definer as $$
declare v_old duels; v_code text := upper(trim(p_code));
begin
  select * into v_old from duels where id = v_code for update;
  if v_old.id is null then raise exception 'introuvable'; end if;

  if v_old.rematch_code is null then
    -- je lance la revanche : je crée le nouveau duel et j'inscris son code
    declare v_new duels;
    begin
      v_new := duel_create(p_id, p_pseudo, p_level, p_badge, p_word);
      update duels set rematch_code = v_new.id where id = v_code;
      return v_new;
    end;
  else
    -- l'adversaire l'a déjà lancée : je la rejoins
    return duel_join(v_old.rematch_code, p_id, p_pseudo, p_level, p_badge, p_word);
  end if;
end $$;

-- ---------- Envoyer une émote ----------
create or replace function duel_emote(p_code text, p_id uuid, p_emote text)
returns duels language plpgsql security definer as $$
declare v_row duels; v_code text := upper(trim(p_code));
begin
  update duels set
    p1_emote = case when p1_id = p_id then p_emote else p1_emote end,
    p2_emote = case when p2_id = p_id then p_emote else p2_emote end
  where id = v_code and (p1_id = p_id or p2_id = p_id)
  returning * into v_row;
  if v_row.id is null then raise exception 'introuvable'; end if;
  return v_row;
end $$;

-- ===================================================================
--  COURSE À L'ÉCRITURE (kind = 'race')
--  Le créateur fixe la suite de mots ; celui qui rejoint la reçoit,
--  pour que les deux joueurs recopient exactement les mêmes mots.
-- ===================================================================

-- Ancienne signature conservée pour les clients pas encore mis à jour :
-- ils jouent normalement mais ne peuvent pas battre de record (thème inconnu).
create or replace function race_create(
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_words text, p_theme text
) returns duels language plpgsql security definer as $$
declare v_code text; v_row duels; v_n int := 0;
begin
  perform duel_gc();
  loop
    v_n := v_n + 1;
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                                 1 + floor(random() * 32)::int, 1);
    end loop;
    begin
      insert into duels (id, status, kind, p1_id, p1_pseudo, p1_level, p1_badge, words, race_theme)
      values (v_code, 'waiting', 'race', p_id, p_pseudo, p_level, p_badge, p_words, p_theme)
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      if v_n > 12 then raise exception 'code-indisponible'; end if;
    end;
  end loop;
end $$;

-- Ancienne signature conservée pour les clients pas encore mis à jour : ils
-- jouent normalement mais ne peuvent pas battre de record (thème inconnu).
create or replace function race_create(
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_words text
) returns duels language sql security definer as $$
  select race_create(p_id, p_pseudo, p_level, p_badge, p_words, null::text);
$$;

-- Rejoindre une course : pas de mot à fournir, la suite est déjà fixée.
create or replace function race_join(
  p_code text, p_id uuid, p_pseudo text, p_level int, p_badge text
) returns duels language plpgsql security definer as $$
declare v_row duels; v_code text := upper(trim(p_code));
begin
  update duels set
    p2_id = p_id, p2_pseudo = p_pseudo, p2_level = p_level, p2_badge = p_badge,
    status = 'playing', started_at = coalesce(started_at, now())
  where id = v_code
    and kind = 'race'
    and p1_id <> p_id
    and (p2_id is null or p2_id = p_id)
    and created_at > now() - interval '2 hours'
  returning * into v_row;

  if v_row.id is null then
    if not exists (select 1 from duels where id = v_code) then
      raise exception 'introuvable';
    elsif exists (select 1 from duels where id = v_code and kind <> 'race') then
      raise exception 'mauvais-type';
    elsif exists (select 1 from duels where id = v_code and p1_id = p_id) then
      raise exception 'soi-meme';
    elsif exists (select 1 from duels where id = v_code
                    and created_at <= now() - interval '2 hours') then
      raise exception 'expiree';
    else
      raise exception 'complet';
    end if;
  end if;
  return v_row;
end $$;

-- Revanche de course : le 1er relance, le 2e rejoint (même principe que le duel).
create or replace function race_rematch(
  p_code text, p_id uuid, p_pseudo text, p_level int, p_badge text, p_words text, p_theme text
) returns duels language plpgsql security definer as $$
declare v_old duels; v_code text := upper(trim(p_code));
begin
  select * into v_old from duels where id = v_code for update;
  if v_old.id is null then raise exception 'introuvable'; end if;

  if v_old.rematch_code is null then
    declare v_new duels;
    begin
      v_new := race_create(p_id, p_pseudo, p_level, p_badge, p_words, p_theme);
      update duels set rematch_code = v_new.id where id = v_code;
      return v_new;
    end;
  else
    return race_join(v_old.rematch_code, p_id, p_pseudo, p_level, p_badge);
  end if;
end $$;

create or replace function race_rematch(
  p_code text, p_id uuid, p_pseudo text, p_level int, p_badge text, p_words text
) returns duels language sql security definer as $$
  select race_rematch(p_code, p_id, p_pseudo, p_level, p_badge, p_words, null::text);
$$;

-- ===================================================================
--  PARTIES PUBLIQUES
--  Un seul geste : on rejoint le salon public en attente s'il en existe
--  un, sinon on en ouvre un. "for update skip locked" garantit que deux
--  joueurs simultanés ne prennent jamais le même salon.
-- ===================================================================

create or replace function duel_quick(
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_word text
) returns duels language plpgsql security definer as $$
declare v_row duels; v_code text; v_n int := 0; v_target text;
begin
  perform duel_gc();

  select id into v_target
    from duels
   where kind = 'duel' and coalesce(is_public, false) and status = 'waiting'
     and p1_id <> p_id and p2_id is null
     and created_at > now() - interval '30 minutes'
   order by created_at
   limit 1
   for update skip locked;

  if v_target is not null then
    return duel_join(v_target, p_id, p_pseudo, p_level, p_badge, p_word);
  end if;

  loop
    v_n := v_n + 1;
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                                 1 + floor(random() * 32)::int, 1);
    end loop;
    begin
      insert into duels (id, status, kind, is_public, p1_id, p1_pseudo, p1_level, p1_badge, word1)
      values (v_code, 'waiting', 'duel', true, p_id, p_pseudo, p_level, p_badge, p_word)
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      if v_n > 12 then raise exception 'code-indisponible'; end if;
    end;
  end loop;
end $$;

create or replace function race_quick(
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_words text, p_theme text
) returns duels language plpgsql security definer as $$
declare v_row duels; v_code text; v_n int := 0; v_target text;
begin
  perform duel_gc();

  select id into v_target
    from duels
   where kind = 'race' and coalesce(is_public, false) and status = 'waiting'
     and p1_id <> p_id and p2_id is null
     and created_at > now() - interval '30 minutes'
   order by created_at
   limit 1
   for update skip locked;

  if v_target is not null then
    return race_join(v_target, p_id, p_pseudo, p_level, p_badge);
  end if;

  loop
    v_n := v_n + 1;
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                                 1 + floor(random() * 32)::int, 1);
    end loop;
    begin
      insert into duels (id, status, kind, is_public, p1_id, p1_pseudo, p1_level, p1_badge, words, race_theme)
      values (v_code, 'waiting', 'race', true, p_id, p_pseudo, p_level, p_badge, p_words, p_theme)
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      if v_n > 12 then raise exception 'code-indisponible'; end if;
    end;
  end loop;
end $$;

create or replace function race_quick(
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_words text
) returns duels language sql security definer as $$
  select race_quick(p_id, p_pseudo, p_level, p_badge, p_words, null::text);
$$;

-- ---------- Nombre de salons publics en attente ----------
-- Même filtre que l'appariement, pour que le compte affiché corresponde
-- exactement aux salons qu'on peut effectivement rejoindre.
create or replace function mp_waiting(p_kind text)
returns int language sql security definer stable as $$
  select count(*)::int
    from duels
   where kind = p_kind
     and coalesce(is_public, false)
     and status = 'waiting'
     and p2_id is null
     and created_at > now() - interval '30 minutes';
$$;

-- ---------- Suivi des essais en direct ----------
create or replace function duel_moves(p_code text, p_id uuid, p_moves text)
returns duels language plpgsql security definer as $$
declare v_row duels; v_code text := upper(trim(p_code));
begin
  update duels set
    p1_moves = case when p1_id = p_id then p_moves else p1_moves end,
    p2_moves = case when p2_id = p_id then p_moves else p2_moves end
  where id = v_code and (p1_id = p_id or p2_id = p_id)
  returning * into v_row;
  if v_row.id is null then raise exception 'introuvable'; end if;
  return v_row;
end $$;

-- ---------- Classement Elo (Duel uniquement) ----------
-- Appelée une seule fois par duel, quand les deux joueurs ont terminé.
create or replace function duel_apply_elo(p_code text)
returns void language plpgsql security definer as $$
declare
  d duels; ea numeric; sa numeric;
  ra int; rb int; ga int; gb int; ka int; kb int; na int; nb int;
begin
  select * into d from duels where id = p_code for update;
  if d.id is null then return; end if;
  if coalesce(d.kind,'duel') <> 'duel' then return; end if;      -- la Course n'est pas classée
  if d.p1_id is null or d.p2_id is null or d.p1_id = d.p2_id then return; end if;
  if not (coalesce(d.p1_done,false) and coalesce(d.p2_done,false)) then return; end if;
  if d.p1_elo_delta is not null then return; end if;              -- déjà appliqué

  select coalesce(elo,1000), coalesce(elo_games,0) into ra, ga from profiles where id = d.p1_id;
  if not found then ra := 1000; ga := 0; end if;
  select coalesce(elo,1000), coalesce(elo_games,0) into rb, gb from profiles where id = d.p2_id;
  if not found then rb := 1000; gb := 0; end if;

  -- verdict : exactement les règles du jeu (le moins d'essais, puis le temps)
  if coalesce(d.p1_won,false) and not coalesce(d.p2_won,false) then sa := 1;
  elsif coalesce(d.p2_won,false) and not coalesce(d.p1_won,false) then sa := 0;
  elsif coalesce(d.p1_won,false) and coalesce(d.p2_won,false) then
    if    coalesce(d.p1_tries,99) < coalesce(d.p2_tries,99) then sa := 1;
    elsif coalesce(d.p2_tries,99) < coalesce(d.p1_tries,99) then sa := 0;
    elsif coalesce(d.p1_ms,0) < coalesce(d.p2_ms,0) then sa := 1;
    elsif coalesce(d.p2_ms,0) < coalesce(d.p1_ms,0) then sa := 0;
    else sa := 0.5; end if;
  else sa := 0.5; end if;                                          -- aucun n'a trouvé

  ea := 1.0 / (1.0 + power(10.0, (rb - ra)::numeric / 400.0));
  -- coefficient plus élevé tant que le classement n'est pas stabilisé
  ka := case when ga < 10 then 40 else 24 end;
  kb := case when gb < 10 then 40 else 24 end;

  na := greatest(100, round(ra + ka * (sa - ea))::int);
  nb := greatest(100, round(rb + kb * ((1 - sa) - (1 - ea)))::int);

  insert into profiles (id, elo, elo_games) values (d.p1_id, na, ga + 1)
    on conflict (id) do update set elo = excluded.elo, elo_games = excluded.elo_games;
  insert into profiles (id, elo, elo_games) values (d.p2_id, nb, gb + 1)
    on conflict (id) do update set elo = excluded.elo, elo_games = excluded.elo_games;

  update duels set p1_elo = ra, p2_elo = rb,
                   p1_elo_delta = na - ra, p2_elo_delta = nb - rb
   where id = d.id;
end $$;

-- ---------- Record de la Course, par thème ----------
-- Appelée quand un joueur vient de terminer toute la suite. Le temps vient de
-- la base, jamais d'un calcul du téléphone.
create or replace function race_record_check(p_code text, p_id uuid)
returns void language plpgsql security definer as $$
declare d duels; v_ms int; v_words int; v_pseudo text; v_theme text; cur int;
begin
  select * into d from duels where id = upper(trim(p_code));
  if d.id is null or coalesce(d.kind,'duel') <> 'race' then return; end if;
  v_theme := d.race_theme;
  if v_theme is null then return; end if;          -- client trop ancien : pas de record

  if d.p1_id = p_id then
    if not coalesce(d.p1_won,false) then return; end if;
    v_ms := d.p1_ms; v_words := d.p1_tries; v_pseudo := d.p1_pseudo;
  elsif d.p2_id = p_id then
    if not coalesce(d.p2_won,false) then return; end if;
    v_ms := d.p2_ms; v_words := d.p2_tries; v_pseudo := d.p2_pseudo;
  else return;
  end if;
  if v_ms is null or v_ms <= 0 then return; end if;

  select ms into cur from race_records where theme = v_theme;
  if cur is null then
    insert into race_records (theme, player_id, pseudo, ms, words, at)
    values (v_theme, p_id, coalesce(nullif(trim(v_pseudo),''),'Anonyme'), v_ms, v_words, now())
    on conflict (theme) do nothing;
  elsif v_ms < cur then
    update race_records
       set player_id = p_id, pseudo = coalesce(nullif(trim(v_pseudo),''),'Anonyme'),
           ms = v_ms, words = v_words, at = now()
     where theme = v_theme and ms > v_ms;
  end if;
end $$;

-- ---------- Droits ----------
grant execute on function duel_create(uuid,text,int,text,text)            to anon, authenticated;
grant execute on function duel_join(text,uuid,text,int,text,text)         to anon, authenticated;
grant execute on function duel_get(text)                                  to anon, authenticated;
grant execute on function duel_report(text,uuid,int,int,boolean)          to anon, authenticated;
grant execute on function duel_rematch(text,uuid,text,int,text,text)      to anon, authenticated;
grant execute on function duel_emote(text,uuid,text)                      to anon, authenticated;
grant execute on function race_create(uuid,text,int,text,text)            to anon, authenticated;
grant execute on function race_create(uuid,text,int,text,text,text)       to anon, authenticated;
grant execute on function race_quick(uuid,text,int,text,text,text)        to anon, authenticated;
grant execute on function race_rematch(text,uuid,text,int,text,text,text) to anon, authenticated;
grant execute on function race_record_check(text,uuid)                    to anon, authenticated;
grant execute on function race_join(text,uuid,text,int,text)              to anon, authenticated;
grant execute on function race_rematch(text,uuid,text,int,text,text)      to anon, authenticated;
grant execute on function duel_quick(uuid,text,int,text,text)             to anon, authenticated;
grant execute on function race_quick(uuid,text,int,text,text)             to anon, authenticated;
grant execute on function mp_waiting(text)                                to anon, authenticated;
grant execute on function duel_moves(text,uuid,text)                      to anon, authenticated;
grant execute on function duel_apply_elo(text)                            to anon, authenticated;

-- ===================================================================
--  MODE DÉFENSE (multijoueur asynchrone)
--  Chaque joueur pose UN mot de défense. N'importe qui peut tenter de
--  le percer. Un attaquant n'a qu'une seule chance par version du mot :
--  s'il échoue, il doit attendre que le défenseur en change.
-- ===================================================================

create table if not exists defenses (
  player_id  uuid primary key,
  pseudo     text,
  level      int  default 1,
  badge      text,
  word       text not null,          -- obfusqué, comme les mots de duel
  wlen       int  not null,
  version    int  default 1,         -- incrémenté à chaque nouveau mot
  wins       int  default 0,         -- attaques repoussées
  losses     int  default 0,         -- fois où le mot est tombé
  broken     boolean default false,  -- vrai tant qu'un nouveau mot n'est pas posé
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists defenses_active_idx on defenses (broken, updated_at);

-- Ajouts v1.38 : phrase d'accroche + note moyenne du mot posé.
-- « add column if not exists » garde le script rejouable sur une base déjà en service.
alter table defenses add column if not exists taunt      int default 0;   -- index 0-5 dans la liste côté client
alter table defenses add column if not exists rate_sum   int default 0;   -- somme des étoiles reçues
alter table defenses add column if not exists rate_count int default 0;   -- nombre de votes
alter table defense_attacks add column if not exists stars int default 0; -- note donnée par l'attaquant (0 = pas encore noté)
-- Ajouts v1.39 : compteurs propres au MOT EN COURS. wins/losses restent
-- cumulés sur toute la carrière du joueur ; ceux-ci repartent à zéro à
-- chaque nouveau mot posé.
alter table defenses add column if not exists cur_wins   int default 0;
alter table defenses add column if not exists cur_losses int default 0;

-- Une ligne par tentative. Créée AU DÉMARRAGE de l'attaque : abandonner
-- en cours de route compte donc comme un échec, on ne peut pas réessayer.
create table if not exists defense_attacks (
  id           bigserial primary key,
  defender_id  uuid not null,
  attacker_id  uuid not null,
  attacker_pseudo text,
  version      int  not null,
  tries        int  default 0,
  won          boolean default false,
  done         boolean default false,
  seen         boolean default false,   -- le défenseur a-t-il vu le résultat ?
  created_at   timestamptz default now(),
  unique (defender_id, attacker_id, version)
);
create index if not exists defense_attacks_feed_idx
  on defense_attacks (defender_id, done, seen, created_at desc);

alter table defenses        enable row level security;
alter table defense_attacks enable row level security;
-- Aucune écriture directe : tout passe par les fonctions ci-dessous.

-- ---------- Poser (ou remplacer) son mot de défense ----------
-- L'ancienne signature à 6 arguments doit disparaître : la conserver à côté
-- de la nouvelle rendrait l'appel ambigu pour PostgreSQL.
drop function if exists defense_set(uuid, text, int, text, text, int);
create or replace function defense_set(
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_word text, p_len int,
  p_taunt int default 0
) returns defenses language plpgsql security definer as $$
declare v_row defenses;
begin
  if p_len < 4 or p_len > 15 then raise exception 'longueur-invalide'; end if;

  insert into defenses (player_id, pseudo, level, badge, word, wlen, version, broken,
                        taunt, rate_sum, rate_count, updated_at)
  values (p_id, p_pseudo, p_level, p_badge, p_word, p_len, 1, false,
          greatest(0, least(coalesce(p_taunt,0), 6)), 0, 0, now())
  on conflict (player_id) do update
    set pseudo = excluded.pseudo, level = excluded.level, badge = excluded.badge,
        word = excluded.word, wlen = excluded.wlen,
        version = defenses.version + 1,     -- remet tous les attaquants à zéro
        broken = false, taunt = excluded.taunt,
        rate_sum = 0, rate_count = 0,       -- la note porte sur LE mot, pas sur le joueur
        cur_wins = 0, cur_losses = 0,       -- idem pour le palmarès du mot
        updated_at = now()
  returning * into v_row;
  return v_row;
end $$;

-- ---------- Ma défense ----------
create or replace function defense_mine(p_id uuid)
returns defenses language sql security definer stable as $$
  select * from defenses where player_id = p_id;
$$;

-- ---------- Cibles attaquables ----------
-- Le type de retour change (accroche + note) : PostgreSQL impose un drop.
drop function if exists defense_targets(uuid, int);
-- On exclut sa propre défense, celles déjà tombées et non reposées, et
-- toutes celles qu'on a déjà tentées dans leur version courante.
create or replace function defense_targets(p_id uuid, p_limit int default 20)
returns table (
  player_id uuid, pseudo text, level int, badge text,
  wlen int, version int, wins int, losses int,
  taunt int, rate_sum int, rate_count int, cur_wins int, cur_losses int
) language sql security definer stable as $$
  select d.player_id, d.pseudo, d.level, d.badge, d.wlen, d.version, d.wins, d.losses,
         d.taunt, d.rate_sum, d.rate_count, d.cur_wins, d.cur_losses
    from defenses d
   where d.player_id <> p_id
     and not d.broken
     and not exists (
       select 1 from defense_attacks a
        where a.defender_id = d.player_id
          and a.attacker_id = p_id
          and a.version = d.version
     )
   order by d.updated_at desc
   limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

-- ---------- Lancer une attaque ----------
-- Renvoie le mot à deviner. La tentative est enregistrée immédiatement :
-- quitter sans finir vaut échec, et interdit donc de réessayer.
create or replace function defense_attack(p_id uuid, p_pseudo text, p_target uuid)
returns table (word text, wlen int, version int, pseudo text) language plpgsql security definer as $$
declare d defenses;
begin
  if p_id = p_target then raise exception 'soi-meme'; end if;
  select * into d from defenses where player_id = p_target for update;
  if d.player_id is null then raise exception 'introuvable'; end if;
  if d.broken then raise exception 'defense-tombee'; end if;

  begin
    insert into defense_attacks (defender_id, attacker_id, attacker_pseudo, version)
    values (p_target, p_id, p_pseudo, d.version);
  exception when unique_violation then
    raise exception 'deja-tente';
  end;

  return query select d.word, d.wlen, d.version, d.pseudo;
end $$;

-- ---------- Résultat d'une attaque ----------
create or replace function defense_report(
  p_id uuid, p_target uuid, p_version int, p_tries int, p_won boolean
) returns void language plpgsql security definer as $$
declare v_done boolean;
begin
  select done into v_done from defense_attacks
   where defender_id = p_target and attacker_id = p_id and version = p_version;
  if v_done is null then raise exception 'introuvable'; end if;
  if v_done then return; end if;                 -- déjà comptabilisé

  update defense_attacks
     set tries = p_tries, won = p_won, done = true
   where defender_id = p_target and attacker_id = p_id and version = p_version;

  if p_won then
    update defenses set losses = losses + 1, cur_losses = cur_losses + 1,
                        broken = true, updated_at = now()
     where player_id = p_target and version = p_version;
  else
    update defenses set wins = wins + 1, cur_wins = cur_wins + 1
     where player_id = p_target and version = p_version;
  end if;
end $$;

-- ---------- Noter le mot que l'on vient d'attaquer ----------
-- Une seule note par attaquant et par version du mot : on ne peut pas
-- gonfler ni saboter une note en votant plusieurs fois. La note porte sur
-- LE MOT (elle repart à zéro quand le défenseur en change).
create or replace function defense_rate(p_id uuid, p_target uuid, p_version int, p_stars int)
returns void language plpgsql security definer as $$
declare v_old int; v_new int;
begin
  v_new := greatest(1, least(coalesce(p_stars,0), 5));
  select stars into v_old from defense_attacks
   where defender_id = p_target and attacker_id = p_id and version = p_version and done;
  if v_old is null then return; end if;          -- il faut avoir réellement attaqué
  update defense_attacks set stars = v_new
   where defender_id = p_target and attacker_id = p_id and version = p_version;
  update defenses
     set rate_sum   = rate_sum   + v_new - coalesce(v_old,0),
         rate_count = rate_count + (case when coalesce(v_old,0) = 0 then 1 else 0 end)
   where player_id = p_target and version = p_version;
end $$;

-- ---------- Journal des attaques subies ----------
-- Le type de retour change (note donnée) : drop nécessaire.
drop function if exists defense_feed(uuid, int);
create or replace function defense_feed(p_id uuid, p_limit int default 15)
returns table (
  attacker_pseudo text, tries int, won boolean, seen boolean, stars int, created_at timestamptz
) language sql security definer stable as $$
  select a.attacker_pseudo, a.tries, a.won, a.seen, a.stars, a.created_at
    from defense_attacks a
   where a.defender_id = p_id and a.done
   order by a.created_at desc
   limit greatest(1, least(coalesce(p_limit, 15), 50));
$$;

-- ---------- Marquer le journal comme lu ----------
create or replace function defense_seen(p_id uuid)
returns void language sql security definer as $$
  update defense_attacks set seen = true
   where defender_id = p_id and done and not seen;
$$;

grant execute on function defense_mine(uuid)                        to anon, authenticated;
grant execute on function defense_set(uuid,text,int,text,text,int,int) to anon, authenticated;
grant execute on function defense_targets(uuid,int)                 to anon, authenticated;
grant execute on function defense_attack(uuid,text,uuid)            to anon, authenticated;
grant execute on function defense_report(uuid,uuid,int,int,boolean) to anon, authenticated;
grant execute on function defense_feed(uuid,int)                    to anon, authenticated;
grant execute on function defense_rate(uuid,uuid,int,int)           to anon, authenticated;
grant execute on function defense_seen(uuid)                        to anon, authenticated;

-- =====================================================================
-- SUGGESTIONS DE PERSONNAGES (v1.43)
-- N'importe qui peut proposer un personnage ; rien n'apparaît dans le jeu
-- tant qu'un administrateur ne l'a pas approuvé. Le texte soumis est donc
-- invisible des autres joueurs jusqu'à validation — c'est ce qui rend la
-- fonctionnalité sûre sans modération automatique.
-- =====================================================================

-- Qui peut valider. À remplir UNE FOIS à la main depuis la console
-- Supabase avec l'identifiant de profil du propriétaire du jeu :
--   insert into app_admins(player_id) values ('<ton-uuid-de-profil>');
create table if not exists app_admins (
  player_id uuid primary key,
  created_at timestamptz default now()
);

create table if not exists perso_suggestions (
  id          bigserial primary key,
  name        text not null,          -- déjà normalisé côté client : A-Z, 4 à 15
  note        text not null,          -- la notice proposée
  author_id   uuid,
  author_pseudo text,
  status      text default 'pending', -- pending | approved | rejected
  created_at  timestamptz default now(),
  reviewed_at timestamptz
);
create index if not exists perso_sugg_status_idx on perso_suggestions (status, created_at);

-- v1.44 : les suggestions couvrent désormais TOUS les thèmes, pas seulement
-- les personnages. « theme » vaut persos | prenoms | maladies | villes.
alter table perso_suggestions add column if not exists theme text default 'persos';
-- les propositions créées AVANT cette version n'ont pas de thème : on les
-- rattache aux personnages, seul thème qui existait alors
update perso_suggestions set theme = 'persos' where theme is null or btrim(theme) = '';
drop index if exists perso_sugg_name_idx;   -- remplacé : l'unicité est par thème
create unique index if not exists perso_sugg_theme_name_idx
  on perso_suggestions (theme, name)
  where status <> 'rejected';         -- pas deux fois le même dans un thème donné

alter table perso_suggestions enable row level security;
alter table app_admins        enable row level security;

create or replace function is_admin(p_id uuid) returns boolean
language sql security definer stable as $$
  select exists(select 1 from app_admins where player_id = p_id);
$$;

-- Proposer un personnage. Rejeté si déjà proposé ou déjà en jeu (le client
-- vérifie la liste existante avant d'appeler).
-- l'ancienne signature à 4 arguments doit disparaître, sinon un appel à
-- 4 arguments devient ambigu avec la nouvelle (dont le 5e a un défaut)
drop function if exists perso_suggest(uuid, text, text, text);
create or replace function perso_suggest(
  p_id uuid, p_pseudo text, p_name text, p_note text, p_theme text default 'persos'
) returns text language plpgsql security definer as $$
declare v_name text; v_note text; v_theme text;
begin
  v_theme := lower(btrim(coalesce(p_theme, 'persos')));
  if v_theme not in ('persos','prenoms','maladies','villes') then return 'theme-invalide'; end if;
  v_name := upper(regexp_replace(coalesce(p_name,''), '[^A-Za-z]', '', 'g'));
  v_note := btrim(coalesce(p_note,''));
  if length(v_name) < 4 or length(v_name) > 15 then return 'nom-invalide'; end if;
  -- une notice s'impose là où le jeu en affiche une ; ailleurs elle reste
  -- possible mais facultative
  if v_theme in ('persos','prenoms','villes') then
    if length(v_note) < 15 or length(v_note) > 300 then return 'note-invalide'; end if;
  elsif length(v_note) > 300 then
    return 'note-invalide';
  end if;
  if exists(select 1 from perso_suggestions
             where theme = v_theme and name = v_name and status <> 'rejected') then return 'deja-propose'; end if;
  -- garde-fou anti-spam : 5 propositions en attente par personne au maximum
  if (select count(*) from perso_suggestions
       where author_id = p_id and status = 'pending') >= 5 then return 'trop-de-propositions'; end if;
  insert into perso_suggestions(theme, name, note, author_id, author_pseudo)
  values (v_theme, v_name, v_note, p_id, p_pseudo);
  return 'ok';
end $$;

-- Ce que le jeu charge au démarrage : uniquement l'approuvé.
drop function if exists perso_approved();
create or replace function perso_approved()
returns table (theme text, name text, note text) language sql security definer stable as $$
  select s.theme, s.name, s.note from perso_suggestions s
   where s.status = 'approved' order by s.theme, s.name;
$$;

-- Réservé aux administrateurs.
drop function if exists perso_pending(uuid);
create or replace function perso_pending(p_id uuid)
returns table (id bigint, theme text, name text, note text, author_pseudo text, created_at timestamptz)
language sql security definer stable as $$
  select s.id, s.theme, s.name, s.note, s.author_pseudo, s.created_at
    from perso_suggestions s
   where s.status = 'pending' and is_admin(p_id)
   order by s.created_at
   limit 100;
$$;

-- L'administrateur corrige une proposition avant de l'approuver : faute de
-- frappe dans le nom, notice à reformuler, mauvais thème.
create or replace function perso_edit(
  p_id uuid, p_sugg bigint, p_name text, p_note text, p_theme text
) returns text language plpgsql security definer as $$
declare v_name text; v_note text; v_theme text;
begin
  if not is_admin(p_id) then return 'refuse'; end if;
  v_theme := lower(btrim(coalesce(p_theme, 'persos')));
  if v_theme not in ('persos','prenoms','maladies','villes') then return 'theme-invalide'; end if;
  v_name := upper(regexp_replace(coalesce(p_name,''), '[^A-Za-z]', '', 'g'));
  v_note := btrim(coalesce(p_note,''));
  if length(v_name) < 4 or length(v_name) > 15 then return 'nom-invalide'; end if;
  if length(v_note) > 300 then return 'note-invalide'; end if;
  if exists(select 1 from perso_suggestions
             where theme = v_theme and name = v_name and status <> 'rejected'
               and id <> p_sugg) then return 'deja-propose'; end if;
  update perso_suggestions set theme = v_theme, name = v_name, note = v_note
   where id = p_sugg and status = 'pending';
  if not found then return 'introuvable'; end if;
  return 'ok';
end $$;

create or replace function perso_review(p_id uuid, p_sugg bigint, p_approve boolean)
returns text language plpgsql security definer as $$
begin
  if not is_admin(p_id) then return 'refuse'; end if;
  update perso_suggestions
     set status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_at = now()
   where id = p_sugg and status = 'pending';
  if not found then return 'introuvable'; end if;
  return 'ok';
end $$;

-- Permet au client de savoir s'il doit afficher l'écran de validation.
create or replace function perso_is_admin(p_id uuid) returns boolean
language sql security definer stable as $$ select is_admin(p_id); $$;

grant execute on function perso_suggest(uuid,text,text,text,text) to anon, authenticated;
grant execute on function perso_edit(uuid,bigint,text,text,text)  to anon, authenticated;
grant execute on function perso_approved()                   to anon, authenticated;
grant execute on function perso_pending(uuid)                to anon, authenticated;
grant execute on function perso_review(uuid,bigint,boolean)  to anon, authenticated;
grant execute on function perso_is_admin(uuid)               to anon, authenticated;

-- =====================================================================
-- MESURE D'AUDIENCE (v1.50)
--
-- Choix de conception : on stocke des COMPTEURS AGRÉGÉS PAR JOUR, jamais
-- des événements bruts. Conséquences :
--   • aucun identifiant, aucune adresse IP, aucun horodatage précis —
--     rien qui permette de suivre une personne ;
--   • volume dérisoire (~30 lignes par jour) : tient sans souci dans
--     l'offre gratuite, contrairement à une table d'événements ;
--   • mesure strictement interne et anonyme, ce qui la rapproche des
--     conditions d'exemption de consentement de la CNIL (à faire
--     confirmer : je ne suis pas juriste).
--
-- L'unicité par jour est assurée CÔTÉ CLIENT : le navigateur n'envoie
-- « visite » qu'une fois par journée. On compte donc des visiteurs
-- uniques sans jamais transmettre qui que ce soit.
-- =====================================================================

create table if not exists stats_daily (
  jour   date not null,
  cle    text not null,
  valeur int  not null default 0,
  primary key (jour, cle)
);
alter table stats_daily enable row level security;

-- Incrément anonyme. Aucun paramètre identifiant : c'est volontaire.
create or replace function stats_ping(p_cle text)
returns void language plpgsql security definer as $$
declare v_cle text;
begin
  -- liste blanche : empêche de créer des clés arbitraires depuis le client
  v_cle := lower(btrim(coalesce(p_cle, '')));
  if v_cle !~ '^(visite|nouveau|fidele|installe|partie:[a-z]{1,12}|gagne:[a-z]{1,12}|mode:[a-z]{1,12})$'
    then return; end if;

  insert into stats_daily (jour, cle, valeur)
  values (current_date, v_cle, 1)
  on conflict (jour, cle) do update set valeur = stats_daily.valeur + 1;
end $$;

-- Lecture réservée à l'administrateur.
create or replace function stats_read(p_id uuid, p_jours int default 30)
returns table (jour date, cle text, valeur int)
language sql security definer stable as $$
  select s.jour, s.cle, s.valeur
    from stats_daily s
   where is_admin(p_id)
     and s.jour >= current_date - greatest(1, least(coalesce(p_jours, 30), 365))
   order by s.jour desc, s.cle;
$$;

grant execute on function stats_ping(text)     to anon, authenticated;
grant execute on function stats_read(uuid,int) to anon, authenticated;

-- =====================================================================
-- v1.51 — Portée d'un mot approuvé
--
-- Un mot peut entrer dans le jeu de deux façons :
--   • « tirable »   : il peut sortir comme réponse ET être proposé ;
--   • « accepte »   : on a seulement le droit de le taper.
-- Utile pour les variantes et les formes composées (BOBMARLEY à côté de
-- MARLEY) qu'on veut accepter sans jamais les tirer, faute de notice.
-- =====================================================================

alter table perso_suggestions add column if not exists portee text default 'tirable';
update perso_suggestions set portee = 'tirable' where portee is null or btrim(portee) = '';

drop function if exists perso_approved();
create or replace function perso_approved()
returns table (theme text, name text, note text, portee text)
language sql security definer stable as $$
  select s.theme, s.name, s.note, coalesce(s.portee, 'tirable')
    from perso_suggestions s
   where s.status = 'approved' order by s.theme, s.name;
$$;

drop function if exists perso_pending(uuid);
create or replace function perso_pending(p_id uuid)
returns table (id bigint, theme text, name text, note text, portee text,
               author_pseudo text, created_at timestamptz)
language sql security definer stable as $$
  select s.id, s.theme, s.name, s.note, coalesce(s.portee, 'tirable'),
         s.author_pseudo, s.created_at
    from perso_suggestions s
   where s.status = 'pending' and is_admin(p_id)
   order by s.created_at
   limit 100;
$$;

-- perso_edit gagne la portée
drop function if exists perso_edit(uuid, bigint, text, text, text);
create or replace function perso_edit(
  p_id uuid, p_sugg bigint, p_name text, p_note text, p_theme text,
  p_portee text default 'tirable'
) returns text language plpgsql security definer as $$
declare v_name text; v_note text; v_theme text; v_portee text;
begin
  if not is_admin(p_id) then return 'refuse'; end if;
  v_theme := lower(btrim(coalesce(p_theme, 'persos')));
  if v_theme not in ('persos','prenoms','maladies','villes') then return 'theme-invalide'; end if;
  v_portee := lower(btrim(coalesce(p_portee, 'tirable')));
  if v_portee not in ('tirable','accepte') then v_portee := 'tirable'; end if;
  v_name := upper(regexp_replace(coalesce(p_name,''), '[^A-Za-z]', '', 'g'));
  v_note := btrim(coalesce(p_note,''));
  if length(v_name) < 4 or length(v_name) > 15 then return 'nom-invalide'; end if;
  if length(v_note) > 300 then return 'note-invalide'; end if;
  -- un mot seulement acceptable n'a pas besoin de notice : il ne sortira jamais
  if v_portee = 'tirable' and v_theme in ('persos','prenoms','villes') and length(v_note) < 15 then
    return 'note-requise';
  end if;
  if exists(select 1 from perso_suggestions
             where theme = v_theme and name = v_name and status <> 'rejected'
               and id <> p_sugg) then return 'deja-propose'; end if;
  update perso_suggestions set theme = v_theme, name = v_name, note = v_note, portee = v_portee
   where id = p_sugg and status = 'pending';
  if not found then return 'introuvable'; end if;
  return 'ok';
end $$;

grant execute on function perso_edit(uuid,bigint,text,text,text,text) to anon, authenticated;

-- =====================================================================
-- v1.51 — Présence avant le choix du mot (duel)
--
-- Celui qui rejoint saisit le code ET son mot dans le même formulaire :
-- tant qu'il n'a pas validé, le créateur ne voit rien et attend à l'aveugle.
-- On enregistre donc le simple fait que quelqu'un a saisi un code valide.
-- =====================================================================

alter table duels add column if not exists knock_at     timestamptz;
alter table duels add column if not exists knock_pseudo text;

-- Appelé dès qu'un code valide est saisi, avant même le choix du mot.
create or replace function duel_knock(p_code text, p_pseudo text)
returns void language plpgsql security definer as $$
begin
  update duels
     set knock_at = now(), knock_pseudo = left(coalesce(p_pseudo,''), 24)
   where id = upper(btrim(p_code))
     and status = 'waiting'          -- inutile si la partie a déjà commencé
     and p2_id is null;
end $$;

grant execute on function duel_knock(text,text) to anon, authenticated;

-- =====================================================================
-- v1.51 — Distinction débutant / habitué dans la mesure d'audience
-- Aucun niveau ni nombre de parties n'est transmis : seulement lequel des
-- deux compartiments la visite du jour rejoint (même seuil que l'invitation
-- à sauvegarder son compte).
-- =====================================================================
drop function if exists stats_ping(text);
create or replace function stats_ping(p_cle text)
returns void language plpgsql security definer as $$
declare v_cle text;
begin
  v_cle := lower(btrim(coalesce(p_cle, '')));
  if v_cle !~ '^(visite|nouveau|fidele|installe|habitue|debutant|partie:[a-z]{1,12}|gagne:[a-z]{1,12}|mode:[a-z]{1,12})$'
    then return; end if;

  insert into stats_daily (jour, cle, valeur)
  values (current_date, v_cle, 1)
  on conflict (jour, cle) do update set valeur = stats_daily.valeur + 1;
end $$;

grant execute on function stats_ping(text) to anon, authenticated;

-- =====================================================================
-- v1.52.1 — Rattrapage ponctuel
-- Si un rapport d'attaque a échoué silencieusement (connexion coupée au
-- mauvais moment), une attaque marquée gagnée dans defense_attacks pouvait
-- ne jamais avoir fait passer "broken" à vrai sur la défense visée.
-- Sans risque à rejouer : ne touche que les incohérences réelles.
-- =====================================================================
update defenses d
   set broken = true
  from defense_attacks a
 where a.defender_id = d.player_id
   and a.version = d.version
   and a.won = true
   and a.done = true
   and d.broken = false;

-- =====================================================================
-- v1.53 — Mode Mémorisation : classement des records
--
-- Le record est le temps d'affichage LE PLUS BAS atteint : plus il est
-- petit, plus le joueur a mémorisé vite. Une seule ligne par joueur, on
-- ne garde que son meilleur.
-- =====================================================================

create table if not exists memo_records (
  player_id uuid primary key,
  pseudo    text,
  secondes  int not null,          -- temps d'affichage atteint (2 = parfait)
  reussites int default 0,
  at        timestamptz default now()
);
alter table memo_records enable row level security;
drop policy if exists "lecture memo" on memo_records;
create policy "lecture memo" on memo_records for select using (true);

-- Enregistre un record. Ne remplace que si le nouveau temps est MEILLEUR
-- (donc plus petit) : on ne perd jamais son meilleur score en rejouant.
create or replace function memo_record(
  p_id uuid, p_pseudo text, p_sec int, p_reussites int
) returns void language plpgsql security definer as $$
begin
  if p_sec is null or p_sec < 2 or p_sec > 60 then return; end if;
  insert into memo_records (player_id, pseudo, secondes, reussites, at)
  values (p_id, left(coalesce(p_pseudo,'Anonyme'), 24), p_sec, greatest(0, coalesce(p_reussites,0)), now())
  on conflict (player_id) do update
    set pseudo    = excluded.pseudo,
        secondes  = least(memo_records.secondes, excluded.secondes),
        reussites = greatest(memo_records.reussites, excluded.reussites),
        at        = now();
end $$;

-- Classement : les plus bas temps d'abord, départagés par le nombre de
-- réussites puis par l'ancienneté du record.
create or replace function memo_top(p_limit int default 20)
returns table (pseudo text, secondes int, reussites int, at timestamptz)
language sql security definer stable as $$
  select m.pseudo, m.secondes, m.reussites, m.at
    from memo_records m
   order by m.secondes asc, m.reussites desc, m.at asc
   limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

grant execute on function memo_record(uuid,text,int,int) to anon, authenticated;
grant execute on function memo_top(int)                  to anon, authenticated;

-- =====================================================================
-- v2.1 — Battle Royale : 4 joueurs, 4 manches
--
-- Une salle contient jusqu'à 4 joueurs. Les mots des 4 manches sont tirés
-- à la CRÉATION et stockés : tous les joueurs affrontent la même série,
-- personne ne peut tirer un mot plus facile qu'un autre.
-- Les places vides sont comblées par des fantômes déterministes, calculés
-- à partir du code de salle — ils jouent donc pareil pour tout le monde.
-- =====================================================================

create table if not exists royale_rooms (
  id          text primary key,
  status      text default 'waiting',    -- waiting | playing | done
  is_public   boolean default false,
  words       text[] not null,           -- les 4 mots, fixés dès la création
  manche      int default 0,             -- manche en cours (0 = pas commencé)
  manche_at   timestamptz,               -- début de la manche courante
  created_at  timestamptz default now(),
  started_at  timestamptz
);
alter table royale_rooms enable row level security;
drop policy if exists "lecture salles" on royale_rooms;
create policy "lecture salles" on royale_rooms for select using (true);

create table if not exists royale_players (
  room_id   text references royale_rooms(id) on delete cascade,
  player_id uuid,
  pseudo    text,
  level     int default 1,
  badge     text,
  fantome   boolean default false,
  scores    int[] default '{0,0,0,0}',
  total     int default 0,
  joined_at timestamptz default now(),
  primary key (room_id, player_id)
);
alter table royale_players enable row level security;
drop policy if exists "lecture joueurs" on royale_players;
create policy "lecture joueurs" on royale_players for select using (true);

create index if not exists royale_attente_idx on royale_rooms (status, is_public, created_at);

-- Inscrit un joueur dans une salle (ou met à jour son profil s'il y est déjà).
create or replace function royale_inscrire(
  p_room text, p_id uuid, p_pseudo text, p_level int, p_badge text
) returns void language sql security definer as $$
  insert into royale_players (room_id, player_id, pseudo, level, badge)
  values (p_room, p_id, left(coalesce(p_pseudo,'Anonyme'),24), coalesce(p_level,1), p_badge)
  on conflict (room_id, player_id) do update
    set pseudo = excluded.pseudo, level = excluded.level, badge = excluded.badge;
$$;

-- Crée une salle. Les 4 mots sont fournis par le client (tirés dans son
-- dictionnaire) puis figés ici pour toute la partie.
create or replace function royale_create(
  p_id uuid, p_pseudo text, p_level int, p_badge text,
  p_words text[], p_public boolean
) returns text language plpgsql security definer as $$
declare v_code text; v_essais int := 0;
begin
  if array_length(p_words, 1) <> 4 then raise exception 'mots-invalides'; end if;
  loop
    v_code := upper(substr(md5(random()::text), 1, 4));
    exit when not exists (select 1 from royale_rooms where id = v_code);
    v_essais := v_essais + 1;
    if v_essais > 30 then raise exception 'code-indisponible'; end if;
  end loop;

  insert into royale_rooms (id, status, is_public, words)
  values (v_code, 'waiting', coalesce(p_public, false), p_words);
  perform royale_inscrire(v_code, p_id, p_pseudo, p_level, p_badge);
  return v_code;
end $$;

-- Partie rapide : rejoint la salle publique en attente la plus ancienne,
-- sinon en ouvre une nouvelle. Évite de laisser des joueurs seuls.
create or replace function royale_quick(
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_words text[]
) returns text language plpgsql security definer as $$
declare v_code text;
begin
  select r.id into v_code
    from royale_rooms r
   where r.status = 'waiting' and r.is_public
     and r.created_at > now() - interval '3 minutes'
     and (select count(*) from royale_players p where p.room_id = r.id and not p.fantome) < 4
   order by r.created_at asc
   limit 1
     for update skip locked;

  if v_code is null then
    return royale_create(p_id, p_pseudo, p_level, p_badge, p_words, true);
  end if;
  perform royale_inscrire(v_code, p_id, p_pseudo, p_level, p_badge);
  return v_code;
end $$;

-- Rejoindre par code. Refuse une salle pleine ou déjà lancée.
create or replace function royale_join(
  p_code text, p_id uuid, p_pseudo text, p_level int, p_badge text
) returns text language plpgsql security definer as $$
declare v_code text := upper(btrim(p_code)); v_statut text; v_nb int;
begin
  select status into v_statut from royale_rooms where id = v_code;
  if v_statut is null then return 'introuvable'; end if;
  if v_statut <> 'waiting' then
    -- déjà dedans ? on le laisse revenir après une déconnexion
    if exists (select 1 from royale_players where room_id = v_code and player_id = p_id)
      then return 'ok'; end if;
    return 'commencee';
  end if;
  select count(*) into v_nb from royale_players where room_id = v_code and not fantome;
  if v_nb >= 4 and not exists (select 1 from royale_players where room_id = v_code and player_id = p_id)
    then return 'pleine'; end if;
  perform royale_inscrire(v_code, p_id, p_pseudo, p_level, p_badge);
  return 'ok';
end $$;

grant execute on function royale_inscrire(text,uuid,text,int,text)      to anon, authenticated;
grant execute on function royale_create(uuid,text,int,text,text[],boolean) to anon, authenticated;
grant execute on function royale_quick(uuid,text,int,text,text[])       to anon, authenticated;
grant execute on function royale_join(text,uuid,text,int,text)          to anon, authenticated;

-- Lance la partie et comble les places vides par des fantômes.
-- Leur identifiant dérive du code de salle : ils sont donc identiques pour
-- tous les joueurs, et rejouer le même code redonne les mêmes adversaires.
create or replace function royale_start(p_code text)
returns void language plpgsql security definer as $$
declare v_code text := upper(btrim(p_code)); v_nb int; i int;
        v_noms text[] := array['Ombre','Écho','Mirage','Spectre'];
begin
  if not exists (select 1 from royale_rooms where id = v_code and status = 'waiting')
    then return; end if;

  select count(*) into v_nb from royale_players where room_id = v_code;
  i := 0;
  while v_nb < 4 loop
    i := i + 1;
    insert into royale_players (room_id, player_id, pseudo, level, badge, fantome)
    values (v_code,
            -- uuid stable, dérivé du code : même salle = mêmes fantômes
            md5(v_code || ':fantome:' || i)::uuid,
            v_noms[i] || ' 🤖', 1 + (i * 2), '🤖', true)
    on conflict do nothing;
    v_nb := v_nb + 1;
  end loop;

  update royale_rooms
     set status = 'playing', manche = 1, started_at = now(), manche_at = now()
   where id = v_code;
end $$;

-- Enregistre le score d'une manche. Le barème est calculé ICI, jamais côté
-- client : personne ne peut s'attribuer un score arbitraire.
create or replace function royale_report(
  p_code text, p_id uuid, p_manche int, p_essais int, p_ms int, p_won boolean
) returns void language plpgsql security definer as $$
declare v_code text := upper(btrim(p_code)); v_pts int := 0; v_sc int[];
begin
  if p_manche < 1 or p_manche > 4 then return; end if;
  if p_won then
    -- 100 de base, −15 par essai supplémentaire, bonus de rapidité jusqu'à 30
    v_pts := greatest(10, 100 - (greatest(1, coalesce(p_essais,6)) - 1) * 15)
           + greatest(0, 30 - (coalesce(p_ms, 90000) / 3000));
  end if;
  select scores into v_sc from royale_players where room_id = v_code and player_id = p_id;
  if v_sc is null then return; end if;
  v_sc[p_manche] := v_pts;
  update royale_players
     set scores = v_sc,
         total  = coalesce(v_sc[1],0)+coalesce(v_sc[2],0)+coalesce(v_sc[3],0)+coalesce(v_sc[4],0)
   where room_id = v_code and player_id = p_id;
end $$;

-- Passe à la manche suivante, ou termine la partie.
create or replace function royale_next(p_code text)
returns void language plpgsql security definer as $$
declare v_code text := upper(btrim(p_code)); v_m int;
begin
  select manche into v_m from royale_rooms where id = v_code and status = 'playing';
  if v_m is null then return; end if;
  if v_m >= 4 then
    update royale_rooms set status = 'done' where id = v_code;
  else
    update royale_rooms set manche = v_m + 1, manche_at = now() where id = v_code;
  end if;
end $$;

-- État complet de la salle : une seule requête pour tout l'écran.
create or replace function royale_state(p_code text)
returns table (
  id text, status text, is_public boolean, words text[], manche int,
  manche_at timestamptz,
  player_id uuid, pseudo text, level int, badge text, fantome boolean,
  scores int[], total int
) language sql security definer stable as $$
  select r.id, r.status, r.is_public, r.words, r.manche, r.manche_at,
         p.player_id, p.pseudo, p.level, p.badge, p.fantome, p.scores, p.total
    from royale_rooms r
    join royale_players p on p.room_id = r.id
   where r.id = upper(btrim(p_code))
   order by p.total desc, p.joined_at asc;
$$;

grant execute on function royale_start(text)                            to anon, authenticated;
grant execute on function royale_report(text,uuid,int,int,int,boolean)  to anon, authenticated;
grant execute on function royale_next(text)                             to anon, authenticated;
grant execute on function royale_state(text)                            to anon, authenticated;

-- Score des fantômes pour une manche. Déterministe : dérivé du code de
-- salle, de la manche et de l'identifiant du fantôme. Calculé côté serveur
-- pour que personne ne puisse l'influencer, et rejouable sans effet double.
create or replace function royale_ghosts(p_code text, p_manche int)
returns void language plpgsql security definer as $$
declare v_code text := upper(btrim(p_code)); r record; v_h int; v_pts int; v_sc int[];
begin
  if p_manche < 1 or p_manche > 4 then return; end if;
  for r in select player_id, scores from royale_players
            where room_id = v_code and fantome loop
    -- empreinte stable -> 0..99
    v_h := ('x' || substr(md5(v_code || p_manche::text || r.player_id::text), 1, 8))::bit(32)::bigint % 100;
    -- un fantôme réussit 3 fois sur 4, avec un niveau plausible
    if v_h < 75 then
      v_pts := 40 + (v_h % 60);      -- 40..99 : correct sans être imbattable
    else
      v_pts := 0;                     -- il a raté sa manche
    end if;
    v_sc := r.scores;
    if v_sc[p_manche] is null or v_sc[p_manche] = 0 then
      v_sc[p_manche] := v_pts;
      update royale_players
         set scores = v_sc,
             total  = coalesce(v_sc[1],0)+coalesce(v_sc[2],0)+coalesce(v_sc[3],0)+coalesce(v_sc[4],0)
       where room_id = v_code and player_id = r.player_id;
    end if;
  end loop;
end $$;

grant execute on function royale_ghosts(text,int) to anon, authenticated;
