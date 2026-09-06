create or replace function public.sync_my_owner_key(browser_owner_key text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_key text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if browser_owner_key is null or length(trim(browser_owner_key)) < 8 then
    raise exception 'A valid browser owner key is required.';
  end if;

  update public.profiles
  set owner_key = browser_owner_key,
      updated_at = now()
  where user_id = v_user_id
    and owner_key is null
  returning owner_key into v_owner_key;

  if v_owner_key is null then
    select owner_key into v_owner_key
    from public.profiles
    where user_id = v_user_id
    limit 1;
  end if;

  if v_owner_key is null then
    raise exception 'TwoBall profile not found.';
  end if;

  return v_owner_key;
end;
$$;

revoke all on function public.sync_my_owner_key(text) from public;
grant execute on function public.sync_my_owner_key(text) to authenticated;
