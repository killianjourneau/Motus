-- ===================================================================
--  DUEL — schéma complet (à exécuter dans Supabase → SQL Editor)
--  Remplace toute version précédente. Sans risque : ne touche pas
--  aux tables profiles et daily_results.
-- ===================================================================

drop table if exists duels cascade;

create table duels (
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

create index on duels (created_at);

-- Aucune écriture directe n'est autorisée : tout passe par les fonctions
-- ci-dessous, qui s'exécutent avec les droits du propriétaire de la table.
alter table duels enable row level security;

-- ---------- Créer un duel ----------
create or replace function duel_create(
  p_id uuid, p_pseudo text, p_level int, p_badge text, p_word text
) returns duels language plpgsql security definer as $$
declare v_code text; v_row duels; v_n int := 0;
begin
  loop
    v_n := v_n + 1;
    -- code de 5 caractères, sans I/O/0/1 pour éviter les confusions
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

-- ---------- Droits ----------
grant execute on function duel_create(uuid,text,int,text,text)        to anon, authenticated;
grant execute on function duel_join(text,uuid,text,int,text,text)     to anon, authenticated;
grant execute on function duel_get(text)                              to anon, authenticated;
grant execute on function duel_report(text,uuid,int,int,boolean)      to anon, authenticated;
