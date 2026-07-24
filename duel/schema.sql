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

create index if not exists duels_created_idx on duels (created_at);

alter table duels enable row level security;
-- Aucune écriture directe : tout passe par les fonctions ci-dessous.

-- ---------- Créer un duel ----------
create or replace function duel_create(
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_word text
) returns duels language plpgsql security definer as $$
declare v_code text; v_row duels; v_n int := 0;
begin
  loop
    v_n := v_n + 1;
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                                 1 + floor(random() * 32)::int, 1);
    end loop;
    begin
      insert into duels (id, status, p1_id, p1_pseudo, p1_level, p1_badge, word1)
      values (v_code, 'waiting', p_id, p_pseudo, p_level, p_badge, p_word)
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
    started_at = coalesce(started_at, now())
  where id = v_code
    and p1_id <> p_id
    and (p2_id is null or p2_id = p_id)
  returning * into v_row;

  if v_row.id is null then
    if not exists (select 1 from duels where id = v_code) then
      raise exception 'introuvable';
    elsif exists (select 1 from duels where id = v_code and p1_id = p_id) then
      raise exception 'soi-meme';
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
  returning * into v_row;

  if v_row.id is null then
    if not exists (select 1 from duels where id = v_code) then
      raise exception 'introuvable';
    elsif exists (select 1 from duels where id = v_code and kind <> 'race') then
      raise exception 'mauvais-type';
    elsif exists (select 1 from duels where id = v_code and p1_id = p_id) then
      raise exception 'soi-meme';
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
