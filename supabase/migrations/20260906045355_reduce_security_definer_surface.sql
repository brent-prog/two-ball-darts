create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.tbd_request_owner_key()
returns text language sql stable security invoker set search_path = '' as $$
  select nullif((coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-tbd-owner-key'), '');
$$;

create or replace function private.tbd_my_profile_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function private.tbd_is_friend_profile(other_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_profile_id = private.tbd_my_profile_id() and f.addressee_profile_id = other_profile_id)
        or (f.addressee_profile_id = private.tbd_my_profile_id() and f.requester_profile_id = other_profile_id))
  );
$$;

create or replace function private.tbd_can_use_player(target_player_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.players p
    where p.id = target_player_id
      and ((p.profile_id is null and p.owner_profile_id is null and private.tbd_request_owner_key() is not null and p.owner_key = private.tbd_request_owner_key())
        or p.profile_id = private.tbd_my_profile_id()
        or p.owner_profile_id = private.tbd_my_profile_id()
        or (p.profile_id is not null and private.tbd_is_friend_profile(p.profile_id)))
  );
$$;

create or replace function private.tbd_can_view_game(target_game_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.games g
    where g.id = target_game_id
      and ((g.owner_profile_id is null and private.tbd_request_owner_key() is not null and g.owner_key = private.tbd_request_owner_key())
        or g.owner_profile_id = private.tbd_my_profile_id()
        or exists (
          select 1 from public.game_players gp
          join public.players p on p.id = gp.player_id
          where gp.game_id = g.id
            and (p.profile_id = private.tbd_my_profile_id()
              or p.owner_profile_id = private.tbd_my_profile_id()
              or (p.profile_id is not null and private.tbd_is_friend_profile(p.profile_id)))
        ))
  );
$$;

create or replace function private.tbd_can_manage_game(target_game_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.games g
    where g.id = target_game_id
      and (g.owner_profile_id = private.tbd_my_profile_id()
        or (g.owner_profile_id is null and private.tbd_request_owner_key() is not null and g.owner_key = private.tbd_request_owner_key()))
  );
$$;

create or replace function private.tbd_can_view_game_player(target_game_player_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.game_players gp where gp.id = target_game_player_id and private.tbd_can_view_game(gp.game_id));
$$;

create or replace function private.tbd_can_manage_game_player(target_game_player_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.game_players gp where gp.id = target_game_player_id and private.tbd_can_manage_game(gp.game_id));
$$;

revoke all on function private.tbd_request_owner_key() from public;
revoke all on function private.tbd_my_profile_id() from public;
revoke all on function private.tbd_is_friend_profile(uuid) from public;
revoke all on function private.tbd_can_use_player(uuid) from public;
revoke all on function private.tbd_can_view_game(uuid) from public;
revoke all on function private.tbd_can_manage_game(uuid) from public;
revoke all on function private.tbd_can_view_game_player(uuid) from public;
revoke all on function private.tbd_can_manage_game_player(uuid) from public;
grant execute on function private.tbd_request_owner_key() to anon, authenticated;
grant execute on function private.tbd_my_profile_id() to anon, authenticated;
grant execute on function private.tbd_is_friend_profile(uuid) to anon, authenticated;
grant execute on function private.tbd_can_use_player(uuid) to anon, authenticated;
grant execute on function private.tbd_can_view_game(uuid) to anon, authenticated;
grant execute on function private.tbd_can_manage_game(uuid) to anon, authenticated;
grant execute on function private.tbd_can_view_game_player(uuid) to anon, authenticated;
grant execute on function private.tbd_can_manage_game_player(uuid) to anon, authenticated;

create or replace function private.tbd_assign_player_owner_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_profile_id uuid;
begin
  if auth.uid() is not null and new.profile_id is null and new.owner_profile_id is null then
    select id into v_profile_id from public.profiles where user_id = auth.uid() limit 1;
    new.owner_profile_id := v_profile_id;
  end if;
  return new;
end;
$$;

create or replace function private.tbd_assign_game_owner_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_profile_id uuid;
  v_owner_key text;
begin
  if auth.uid() is not null then
    select id, owner_key into v_profile_id, v_owner_key from public.profiles where user_id = auth.uid() limit 1;
    new.owner_profile_id := v_profile_id;
    if v_owner_key is not null then new.owner_key := v_owner_key; end if;
  else
    new.owner_profile_id := null;
  end if;
  return new;
end;
$$;

revoke all on function private.tbd_assign_player_owner_profile() from public, anon, authenticated;
revoke all on function private.tbd_assign_game_owner_profile() from public, anon, authenticated;

drop trigger if exists tbd_assign_player_owner_profile on public.players;
create trigger tbd_assign_player_owner_profile before insert or update on public.players for each row execute function private.tbd_assign_player_owner_profile();
drop trigger if exists tbd_assign_game_owner_profile on public.games;
create trigger tbd_assign_game_owner_profile before insert or update on public.games for each row execute function private.tbd_assign_game_owner_profile();

drop policy if exists "scoped players read" on public.players;
drop policy if exists "scoped players insert" on public.players;
drop policy if exists "scoped players update" on public.players;
drop policy if exists "scoped players delete" on public.players;
create policy "scoped players read" on public.players for select to anon, authenticated using (private.tbd_can_use_player(id));
create policy "scoped players insert" on public.players for insert to anon, authenticated with check (
  private.tbd_request_owner_key() is not null and owner_key = private.tbd_request_owner_key()
  and ((auth.uid() is null and profile_id is null and owner_profile_id is null)
    or (auth.uid() is not null and (profile_id is null or profile_id = private.tbd_my_profile_id()) and (owner_profile_id is null or owner_profile_id = private.tbd_my_profile_id())))
);
create policy "scoped players update" on public.players for update to anon, authenticated using (
  (profile_id is null and owner_profile_id is null and owner_key = private.tbd_request_owner_key())
  or profile_id = private.tbd_my_profile_id() or owner_profile_id = private.tbd_my_profile_id()
) with check (
  private.tbd_request_owner_key() is not null and owner_key = private.tbd_request_owner_key()
  and (profile_id is null or profile_id = private.tbd_my_profile_id())
  and (owner_profile_id is null or owner_profile_id = private.tbd_my_profile_id())
);
create policy "scoped players delete" on public.players for delete to anon, authenticated using (
  (profile_id is null and owner_profile_id is null and owner_key = private.tbd_request_owner_key())
  or profile_id = private.tbd_my_profile_id() or owner_profile_id = private.tbd_my_profile_id()
);

drop policy if exists "scoped games read" on public.games;
drop policy if exists "scoped games insert" on public.games;
drop policy if exists "scoped games update" on public.games;
drop policy if exists "scoped games delete" on public.games;
create policy "scoped games read" on public.games for select to anon, authenticated using (private.tbd_can_view_game(id));
create policy "scoped games insert" on public.games for insert to anon, authenticated with check (
  (auth.uid() is null and owner_profile_id is null and private.tbd_request_owner_key() is not null and owner_key = private.tbd_request_owner_key())
  or (auth.uid() is not null and owner_profile_id = private.tbd_my_profile_id())
);
create policy "scoped games update" on public.games for update to anon, authenticated using (private.tbd_can_manage_game(id)) with check (
  (auth.uid() is null and owner_profile_id is null and private.tbd_request_owner_key() is not null and owner_key = private.tbd_request_owner_key())
  or (auth.uid() is not null and owner_profile_id = private.tbd_my_profile_id())
);
create policy "scoped games delete" on public.games for delete to anon, authenticated using (private.tbd_can_manage_game(id));

drop policy if exists "scoped game_players read" on public.game_players;
drop policy if exists "scoped game_players insert" on public.game_players;
drop policy if exists "scoped game_players update" on public.game_players;
drop policy if exists "scoped game_players delete" on public.game_players;
create policy "scoped game_players read" on public.game_players for select to anon, authenticated using (private.tbd_can_view_game(game_id));
create policy "scoped game_players insert" on public.game_players for insert to anon, authenticated with check (private.tbd_can_manage_game(game_id) and private.tbd_can_use_player(player_id));
create policy "scoped game_players update" on public.game_players for update to anon, authenticated using (private.tbd_can_manage_game(game_id)) with check (private.tbd_can_manage_game(game_id) and private.tbd_can_use_player(player_id));
create policy "scoped game_players delete" on public.game_players for delete to anon, authenticated using (private.tbd_can_manage_game(game_id));

drop policy if exists "scoped hole_scores read" on public.hole_scores;
drop policy if exists "scoped hole_scores insert" on public.hole_scores;
drop policy if exists "scoped hole_scores update" on public.hole_scores;
drop policy if exists "scoped hole_scores delete" on public.hole_scores;
create policy "scoped hole_scores read" on public.hole_scores for select to anon, authenticated using (private.tbd_can_view_game_player(game_player_id));
create policy "scoped hole_scores insert" on public.hole_scores for insert to anon, authenticated with check (private.tbd_can_manage_game_player(game_player_id));
create policy "scoped hole_scores update" on public.hole_scores for update to anon, authenticated using (private.tbd_can_manage_game_player(game_player_id)) with check (private.tbd_can_manage_game_player(game_player_id));
create policy "scoped hole_scores delete" on public.hole_scores for delete to anon, authenticated using (private.tbd_can_manage_game_player(game_player_id));

drop function if exists public.tbd_can_manage_game_player(uuid);
drop function if exists public.tbd_can_view_game_player(uuid);
drop function if exists public.tbd_can_manage_game(uuid);
drop function if exists public.tbd_can_view_game(uuid);
drop function if exists public.tbd_can_use_player(uuid);
drop function if exists public.tbd_is_friend_profile(uuid);
drop function if exists public.tbd_my_profile_id();
drop function if exists public.tbd_request_owner_key();
drop function if exists public.tbd_assign_game_owner_profile();
drop function if exists public.tbd_assign_player_owner_profile();

revoke all on function public.handle_new_twoball_user() from public, anon, authenticated;
revoke all on function public.claim_guest_invite(uuid) from public, anon, authenticated;
grant execute on function public.claim_guest_invite(uuid) to authenticated;
revoke all on function public.get_guest_invite(uuid) from public, anon, authenticated;
grant execute on function public.get_guest_invite(uuid) to anon, authenticated;
revoke all on function public.sync_my_owner_key(text) from public, anon, authenticated;
grant execute on function public.sync_my_owner_key(text) to authenticated;
