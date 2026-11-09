-- Include linked provider emails even when they differ from the primary email.
create or replace function public.is_email_registered(p_email text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare normalized text := lower(btrim(p_email));
begin
  if normalized is null or length(normalized) not between 3 and 254 then
    raise exception 'Invalid email' using errcode = '22023';
  end if;
  return exists (
    select 1 from auth.users u where u.deleted_at is null and (
      lower(btrim(u.email)) = normalized or exists (
        select 1 from auth.identities i where i.user_id = u.id
          and lower(btrim(i.identity_data->>'email')) = normalized
      )
    )
  );
end;
$$;
revoke all on function public.is_email_registered(text) from public;
grant execute on function public.is_email_registered(text) to anon, authenticated;
