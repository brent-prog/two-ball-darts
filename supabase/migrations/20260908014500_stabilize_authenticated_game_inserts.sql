drop policy if exists "scoped games insert" on public.games;
create policy "scoped games insert"
on public.games
for insert
to anon, authenticated
with check (
  (
    auth.uid() is null
    and owner_profile_id is null
    and private.tbd_request_owner_key() is not null
    and owner_key = private.tbd_request_owner_key()
  )
  or
  auth.uid() is not null
);
