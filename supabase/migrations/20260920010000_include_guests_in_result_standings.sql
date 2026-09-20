create or replace function private.get_round_result_email_recipients(p_game_id uuid)
returns table (
  game_id uuid,
  game_title text,
  played_at timestamptz,
  results_email_sent_at timestamptz,
  profile_id uuid,
  email text,
  display_name text,
  total_score integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_profile_id uuid;
  v_authorized boolean;
begin
  select p.id
    into v_caller_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;

  if v_caller_profile_id is null then
    raise exception 'Sign in required';
  end if;

  select exists (
    select 1
    from public.games g
    where g.id = p_game_id
      and (
        g.owner_profile_id = v_caller_profile_id
        or exists (
          select 1
          from public.game_players gp
          join public.players pl on pl.id = gp.player_id
          where gp.game_id = g.id
            and pl.profile_id = v_caller_profile_id
        )
      )
  )
  into v_authorized;

  if not v_authorized then
    raise exception 'Not authorized for this round';
  end if;

  if not exists (
    select 1
    from public.game_players gp
    where gp.game_id = p_game_id
  ) or exists (
    select 1
    from public.game_players gp
    where gp.game_id = p_game_id
      and (
        select count(distinct hs.hole_number)
        from public.hole_scores hs
        where hs.game_player_id = gp.id
      ) <> 18
  ) then
    raise exception 'Round is not complete';
  end if;

  return query
  select
    g.id,
    g.title,
    g.played_at,
    g.results_email_sent_at,
    p.id,
    u.email::text,
    coalesce(p.display_name, pl.display_name),
    gp.total_score
  from public.games g
  join public.game_players gp on gp.game_id = g.id
  join public.players pl on pl.id = gp.player_id
  left join public.profiles p on p.id = pl.profile_id
  left join auth.users u on u.id = p.user_id
  where g.id = p_game_id
  order by gp.total_score asc, coalesce(p.display_name, pl.display_name) asc;
end;
$$;
