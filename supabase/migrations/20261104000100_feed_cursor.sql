-- Keep the offset overload available for older deployments during rollout.
create function public.media_post_feed(
  p_feed text, p_limit integer, p_before_created_at timestamptz, p_before_id uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_feed is null or p_feed not in ('for-you', 'following')
    or p_limit is null or p_limit < 1 or p_limit > 51
    or (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Invalid feed parameters' using errcode = '22023';
  end if;
  if p_feed = 'following' and auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(item order by created_at desc, id desc), '[]'::jsonb) into result from (
    select p.created_at, p.id, to_jsonb(p) || jsonb_build_object(
      'author', jsonb_build_object('id', a.id, 'username', a.username, 'displayName', a.display_name, 'avatarUrl', a.avatar_url)
    ) as item
    from public.media_posts p join public.profiles a on a.id = p.user_id
    where p.published_at is not null
      and (p_before_created_at is null or (p.created_at, p.id) < (p_before_created_at, p_before_id))
      and (p_feed = 'for-you' or exists (
        select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id
      ))
    order by p.created_at desc, p.id desc limit p_limit
  ) page;
  return result;
end;
$$;

revoke all on function public.media_post_feed(text, integer, timestamptz, uuid) from public;
grant execute on function public.media_post_feed(text, integer, timestamptz, uuid) to anon, authenticated;
