drop policy if exists "participants can update friendships" on public.friendships;

revoke update on table public.friendships from authenticated;
grant update (status, updated_at) on table public.friendships to authenticated;

create policy "addressee can answer pending friend requests"
on public.friendships
for update
to authenticated
using (
  status = 'pending'
  and addressee_profile_id in (
    select id from public.profiles where user_id = (select auth.uid())
  )
)
with check (
  status in ('accepted', 'declined')
  and addressee_profile_id in (
    select id from public.profiles where user_id = (select auth.uid())
  )
);
