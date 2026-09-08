create or replace function private.tbd_my_owner_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select owner_key
  from public.profiles
  where user_id = auth.uid()
  limit 1;
$$;

revoke all on function private.tbd_my_owner_key() from public;

drop policy if exists "scoped games insert" on public.games;
create policy "scoped games insert"
on public.games
for insert
with check (
  (
    auth.uid() is null
    and owner_profile_id is null
    and private.tbd_request_owner_key() is not null
    and owner_key = private.tbd_request_owner_key()
  )
  or
  (
    auth.uid() is not null
    and (
      owner_profile_id = private.tbd_my_profile_id()
      or (
        owner_profile_id is null
        and private.tbd_my_owner_key() is not null
        and owner_key = private.tbd_my_owner_key()
      )
    )
  )
);

drop policy if exists "scoped games update" on public.games;
create policy "scoped games update"
on public.games
for update
using (private.tbd_can_manage_game(id))
with check (
  (
    auth.uid() is null
    and owner_profile_id is null
    and private.tbd_request_owner_key() is not null
    and owner_key = private.tbd_request_owner_key()
  )
  or
  (
    auth.uid() is not null
    and (
      owner_profile_id = private.tbd_my_profile_id()
      or (
        owner_profile_id is null
        and private.tbd_my_owner_key() is not null
        and owner_key = private.tbd_my_owner_key()
      )
    )
  )
);
