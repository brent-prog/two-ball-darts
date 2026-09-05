alter table public.profiles
  add column owner_key text;

create unique index profiles_owner_key_unique
  on public.profiles(owner_key)
  where owner_key is not null;
