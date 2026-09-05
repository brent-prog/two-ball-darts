create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  addressee_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_profile_id <> addressee_profile_id)
);

create unique index friendships_unique_pair
  on public.friendships (
    least(requester_profile_id, addressee_profile_id),
    greatest(requester_profile_id, addressee_profile_id)
  );

alter table public.friendships enable row level security;

grant select, insert, update, delete on table public.friendships to authenticated;

create policy "participants can view friendships"
  on public.friendships
  for select
  to authenticated
  using (
    requester_profile_id in (select id from public.profiles where user_id = auth.uid())
    or addressee_profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "users can send friend requests"
  on public.friendships
  for insert
  to authenticated
  with check (
    requester_profile_id in (select id from public.profiles where user_id = auth.uid())
    and requester_profile_id <> addressee_profile_id
  );

create policy "participants can update friendships"
  on public.friendships
  for update
  to authenticated
  using (
    requester_profile_id in (select id from public.profiles where user_id = auth.uid())
    or addressee_profile_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    requester_profile_id in (select id from public.profiles where user_id = auth.uid())
    or addressee_profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "participants can delete friendships"
  on public.friendships
  for delete
  to authenticated
  using (
    requester_profile_id in (select id from public.profiles where user_id = auth.uid())
    or addressee_profile_id in (select id from public.profiles where user_id = auth.uid())
  );
