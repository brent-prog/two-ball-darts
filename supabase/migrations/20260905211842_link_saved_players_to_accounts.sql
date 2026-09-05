alter table public.players
  add column if not exists owner_profile_id uuid references public.profiles(id) on delete cascade;

create index if not exists players_owner_profile_id_idx
  on public.players(owner_profile_id)
  where owner_profile_id is not null;

update public.players p
set owner_profile_id = pr.id
from public.profiles pr
where p.owner_profile_id is null
  and p.profile_id is null
  and p.is_profile = true
  and pr.owner_key is not null
  and pr.owner_key = p.owner_key;
