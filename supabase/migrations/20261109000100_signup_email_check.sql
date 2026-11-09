-- Return only email availability, never account details or provider metadata.
create function public.is_email_registered(p_email text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_email is null or length(btrim(p_email)) not between 3 and 254 then
    raise exception 'Invalid email' using errcode = '22023';
  end if;
  return exists (
    select 1 from auth.users u
    where lower(u.email) = lower(btrim(p_email)) and u.deleted_at is null
  );
end;
$$;
revoke all on function public.is_email_registered(text) from public;
grant execute on function public.is_email_registered(text) to anon, authenticated;
