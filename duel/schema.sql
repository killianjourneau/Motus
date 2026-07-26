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

create or replace function race_create(
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_words text
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
      insert into duels (id, status, kind, p1_id, p1_pseudo, p1_level, p1_badge, words)
      values (v_code, 'waiting', 'race', p_id, p_pseudo, p_level, p_badge, p_words)
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      if v_n > 12 then raise exception 'code-indisponible'; end if;
    end;
  end loop;
end $$;

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
  p_code text, p_id uuid, p_pseudo text, p_level int, p_badge text, p_words text
) returns duels language plpgsql security definer as $$
declare v_old duels; v_code text := upper(trim(p_code));
begin
  select * into v_old from duels where id = v_code for update;
  if v_old.id is null then raise exception 'introuvable'; end if;

  if v_old.rematch_code is null then
    declare v_new duels;
    begin
      v_new := race_create(p_id, p_pseudo, p_level, p_badge, p_words);
      update duels set rematch_code = v_new.id where id = v_code;
      return v_new;
    end;
  else
    return race_join(v_old.rematch_code, p_id, p_pseudo, p_level, p_badge);
  end if;
end $$;

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
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_words text
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
      insert into duels (id, status, kind, is_public, p1_id, p1_pseudo, p1_level, p1_badge, words)
      values (v_code, 'waiting', 'race', true, p_id, p_pseudo, p_level, p_badge, p_words)
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      if v_n > 12 then raise exception 'code-indisponible'; end if;
    end;
  end loop;
end $$;

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

-- ---------- Droits ----------
grant execute on function duel_create(uuid,text,int,text,text)            to anon, authenticated;
grant execute on function duel_join(text,uuid,text,int,text,text)         to anon, authenticated;
grant execute on function duel_get(text)                                  to anon, authenticated;
grant execute on function duel_report(text,uuid,int,int,boolean)          to anon, authenticated;
grant execute on function duel_rematch(text,uuid,text,int,text,text)      to anon, authenticated;
grant execute on function duel_emote(text,uuid,text)                      to anon, authenticated;
grant execute on function race_create(uuid,text,int,text,text)            to anon, authenticated;
grant execute on function race_join(text,uuid,text,int,text)              to anon, authenticated;
grant execute on function race_rematch(text,uuid,text,int,text,text)      to anon, authenticated;
grant execute on function duel_quick(uuid,text,int,text,text)             to anon, authenticated;
grant execute on function race_quick(uuid,text,int,text,text)             to anon, authenticated;
grant execute on function mp_waiting(text)                                to anon, authenticated;
grant execute on function duel_moves(text,uuid,text)                      to anon, authenticated;
grant execute on function duel_apply_elo(text)                            to anon, authenticated;
