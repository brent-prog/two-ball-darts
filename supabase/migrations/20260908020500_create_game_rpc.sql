create or replace function public.create_two_ball_game(
  browser_owner_key text,
  game_title text,
  game_course_name text,
  game_status text default 'complete'
)
returns table (
  id uuid,
  title text,
  played_at timestamptz,
  course_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_owner_key text;
  v_game public.games%rowtype;
begin
  if browser_owner_key is null or length(trim(browser_owner_key)) < 8 then
    raise exception 'A valid owner key is required.';
  end if;

  if auth.uid() is not null then
    select p.id, coalesce(p.owner_key, browser_owner_key)
      into v_profile_id, v_owner_key
    from public.profiles p
    where p.user_id = auth.uid()
    limit 1;

    if v_profile_id is null then
      raise exception 'TwoBall profile not found.';
    end if;
  else
    v_owner_key := browser_owner_key;
  end if;

  insert into public.games (owner_key, owner_profile_id, title, course_name, status)
  values (
    v_owner_key,
    v_profile_id,
    coalesce(nullif(trim(game_title), ''), 'Two Ball Darts Round'),
    coalesce(nullif(trim(game_course_name), ''), 'Official 18'),
    coalesce(nullif(trim(game_status), ''), 'complete')
  )
  returning * into v_game;

  return query select v_game.id, v_game.title, v_game.played_at, v_game.course_name;
end;
$$;

revoke all on function public.create_two_ball_game(text,text,text,text) from public;
grant execute on function public.create_two_ball_game(text,text,text,text) to anon, authenticated;
