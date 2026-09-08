create or replace function private.tbd_attach_game_owner_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  if auth.uid() is null or new.owner_profile_id is not null then
    return new;
  end if;

  v_profile_id := private.tbd_my_profile_id();
  if v_profile_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.owner_profile_id := v_profile_id;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.owner_profile_id is null
     and private.tbd_request_owner_key() is not null
     and old.owner_key = private.tbd_request_owner_key() then
    new.owner_profile_id := v_profile_id;
  end if;

  return new;
end;
$$;

revoke all on function private.tbd_attach_game_owner_profile() from public;

drop trigger if exists tbd_attach_game_owner_profile on public.games;
create trigger tbd_attach_game_owner_profile
before insert or update on public.games
for each row
execute function private.tbd_attach_game_owner_profile();
