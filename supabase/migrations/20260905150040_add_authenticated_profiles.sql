create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,24}$'),
  constraint profiles_display_name_nonempty check (display_name is null or length(trim(display_name)) > 0)
);

create unique index profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles enable row level security;

create policy "profiles are publicly viewable"
  on public.profiles for select
  using (true);

create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select on table public.profiles to anon, authenticated;
grant insert, update on table public.profiles to authenticated;

create or replace function public.handle_new_twoball_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', '')), '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_twoball on auth.users;
create trigger on_auth_user_created_twoball
  after insert on auth.users
  for each row execute function public.handle_new_twoball_user();

alter table public.players
  add column profile_id uuid references public.profiles(id) on delete set null;

create index players_profile_id_idx
  on public.players(profile_id)
  where profile_id is not null;
