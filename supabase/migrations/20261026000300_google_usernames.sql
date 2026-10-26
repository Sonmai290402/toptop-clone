-- Resolve usernames from the authenticated account, never from client input.
create function public.sync_google_username() returns text
language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  account_email text;
  metadata jsonb;
  current_username text;
  base_name text;
  candidate text;
  suffix text;
begin
  if account_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select email, raw_app_meta_data into account_email, metadata from auth.users where id = account_id;
  select username into current_username from public.profiles where id = account_id for update;
  if not found then raise exception 'Profile not found' using errcode = '23503'; end if;
  if not (coalesce(metadata->>'provider' = 'google', false)
    or coalesce(metadata->'providers' ? 'google', false)) then
    return current_username;
  end if;
  -- Preserve usernames already chosen by the user or assigned on an earlier login.
  if current_username <> 'user_' || substr(replace(account_id::text, '-', ''), 1, 24)
    or account_email is null or position('@' in account_email) < 2 then
    return current_username;
  end if;
  base_name := left(regexp_replace(lower(split_part(account_email, '@', 1)), '[^a-z0-9_]', '_', 'g'), 30);
  if char_length(base_name) < 3 then base_name := rpad(base_name, 3, '_'); end if;
  candidate := base_name;
  for attempt in 0..100 loop
    if attempt > 0 then
      suffix := '_' || attempt::text;
      candidate := left(base_name, 30 - char_length(suffix)) || suffix;
    end if;
    begin
      update public.profiles set username = candidate where id = account_id;
      return candidate;
    exception when unique_violation then
      -- Retry under the unique constraint, including concurrent sign-ins.
    end;
  end loop;
  -- Keep the existing unique default if every candidate is already occupied.
  return current_username;
end;
$$;
revoke all on function public.sync_google_username() from public, anon;
grant execute on function public.sync_google_username() to authenticated;
