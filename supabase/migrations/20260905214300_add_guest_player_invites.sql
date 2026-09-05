create table if not exists public.guest_player_invites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  guest_player_id uuid not null references public.players(id) on delete cascade,
  inviter_profile_id uuid not null references public.profiles(id) on delete cascade,
  claimed_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','claimed','revoked')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create unique index if not exists guest_player_invites_one_pending_per_guest
  on public.guest_player_invites(guest_player_id)
  where status = 'pending';

alter table public.guest_player_invites enable row level security;

create policy "owners can view guest invites"
on public.guest_player_invites for select to authenticated
using (inviter_profile_id in (select id from public.profiles where user_id = (select auth.uid())));

create policy "owners can create guest invites"
on public.guest_player_invites for insert to authenticated
with check (
  inviter_profile_id in (select id from public.profiles where user_id = (select auth.uid()))
  and guest_player_id in (
    select p.id from public.players p
    where p.owner_profile_id = inviter_profile_id
      and p.profile_id is null
      and p.is_profile = true
  )
);

create policy "owners can revoke guest invites"
on public.guest_player_invites for update to authenticated
using (inviter_profile_id in (select id from public.profiles where user_id = (select auth.uid())))
with check (inviter_profile_id in (select id from public.profiles where user_id = (select auth.uid())));

create or replace function public.get_guest_invite(invite_token uuid)
returns table(invite_status text, guest_name text, inviter_name text)
language sql
security definer
set search_path = ''
as $$
  select i.status, p.display_name, coalesce(pr.display_name, pr.username, 'A TwoBall player')
  from public.guest_player_invites i
  join public.players p on p.id = i.guest_player_id
  join public.profiles pr on pr.id = i.inviter_profile_id
  where i.token = invite_token
  limit 1;
$$;

revoke all on function public.get_guest_invite(uuid) from public;
grant execute on function public.get_guest_invite(uuid) to anon, authenticated;

create or replace function public.claim_guest_invite(invite_token uuid)
returns table(player_id uuid, guest_name text, inviter_profile_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_invite public.guest_player_invites%rowtype;
  v_guest public.players%rowtype;
  v_existing public.players%rowtype;
  v_overlap boolean;
begin
  if v_user_id is null then
    raise exception 'Sign in before claiming this guest profile.';
  end if;

  select * into v_profile from public.profiles where user_id = v_user_id;
  if v_profile.id is null then
    raise exception 'Your TwoBall profile is not ready yet.';
  end if;

  select * into v_invite
  from public.guest_player_invites
  where token = invite_token
  for update;

  if v_invite.id is null or v_invite.status <> 'pending' then
    raise exception 'This invite is no longer available.';
  end if;

  if v_invite.inviter_profile_id = v_profile.id then
    raise exception 'You cannot claim your own guest invite.';
  end if;

  select * into v_guest from public.players where id = v_invite.guest_player_id for update;
  if v_guest.id is null or v_guest.profile_id is not null then
    raise exception 'This guest profile has already been claimed.';
  end if;

  select * into v_existing
  from public.players
  where profile_id = v_profile.id
  order by created_at asc
  limit 1
  for update;

  if v_existing.id is not null and v_existing.id <> v_guest.id then
    select exists (
      select 1
      from public.game_players gp_guest
      join public.game_players gp_existing
        on gp_existing.game_id = gp_guest.game_id
       and gp_existing.player_id = v_existing.id
      where gp_guest.player_id = v_guest.id
    ) into v_overlap;

    if v_overlap then
      raise exception 'These player histories overlap in the same round and cannot be merged automatically.';
    end if;

    update public.game_players
    set player_id = v_guest.id
    where player_id = v_existing.id;

    delete from public.players where id = v_existing.id;
  end if;

  update public.players
  set profile_id = v_profile.id,
      owner_profile_id = null,
      owner_key = coalesce(v_profile.owner_key, v_guest.owner_key),
      display_name = coalesce(nullif(trim(v_profile.display_name), ''), v_guest.display_name),
      is_profile = true
  where id = v_guest.id;

  update public.guest_player_invites
  set status = 'claimed', claimed_profile_id = v_profile.id, claimed_at = now()
  where id = v_invite.id;

  insert into public.friendships(requester_profile_id, addressee_profile_id, status)
  values (v_invite.inviter_profile_id, v_profile.id, 'accepted')
  on conflict do nothing;

  return query select v_guest.id, v_guest.display_name, v_invite.inviter_profile_id;
end;
$$;

revoke all on function public.claim_guest_invite(uuid) from public;
grant execute on function public.claim_guest_invite(uuid) to authenticated;
