create or replace function public.save_two_ball_round_guest(browser_owner_key text, guest_display_name text)
returns table(id uuid, display_name text, profile_id uuid, owner_profile_id uuid)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_profile_id uuid;
  v_guest public.players%rowtype;
  v_name text;
begin
  v_name := nullif(trim(guest_display_name), '');
  if v_name is null then
    raise exception 'Guest name is required.';
  end if;

  if browser_owner_key is null or length(trim(browser_owner_key)) < 8 then
    raise exception 'A valid owner key is required.';
  end if;

  if auth.uid() is not null then
    select p.id into v_profile_id
    from public.profiles p
    where p.user_id = auth.uid()
    limit 1;
  end if;

  select p.* into v_guest
  from public.players p
  where p.owner_key = browser_owner_key
    and lower(p.display_name) = lower(v_name)
    and p.profile_id is null
  order by p.created_at asc
  limit 1;

  if v_guest.id is null then
    insert into public.players (
      owner_key,
      display_name,
      is_profile,
      profile_id,
      owner_profile_id
    ) values (
      browser_owner_key,
      v_name,
      false,
      null,
      v_profile_id
    )
    returning * into v_guest;
  else
    update public.players as p
    set display_name = v_name,
        owner_profile_id = coalesce(v_profile_id, p.owner_profile_id)
    where p.id = v_guest.id
    returning p.* into v_guest;
  end if;

  return query
  select v_guest.id, v_guest.display_name, v_guest.profile_id, v_guest.owner_profile_id;
end;
$function$;
