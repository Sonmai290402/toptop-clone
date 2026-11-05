create function public.search_users(p_query text, p_limit integer default 21, p_offset integer default 0)
returns table(id uuid, username text, "displayName" text, "avatarUrl" text, bio text)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_query is null or length(btrim(p_query)) not between 1 and 100
    or p_limit is null or p_limit not between 1 and 51
    or p_offset is null or p_offset not between 0 and 10000 then
    raise exception 'Invalid search parameters' using errcode = '22023';
  end if;
  return query select p.id, p.username, p.display_name, p.avatar_url, p.bio
  from public.profiles p
  where strpos(lower(p.username), lower(btrim(p_query))) > 0
     or strpos(lower(p.display_name), lower(btrim(p_query))) > 0
  order by (lower(p.username) = lower(btrim(p_query))) desc, p.username, p.id
  limit p_limit offset p_offset;
end;
$$;
revoke all on function public.search_users(text, integer, integer) from public;
grant execute on function public.search_users(text, integer, integer) to anon, authenticated;
