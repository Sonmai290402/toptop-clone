create function public.media_video_feed(p_feed text default 'for-you', p_limit integer default 11, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_feed is null or p_feed not in ('for-you', 'following') or p_limit is null or p_limit < 1 or p_limit > 51 or p_offset is null or p_offset < 0 or p_offset > 100000 then
    raise exception 'Invalid feed parameters' using errcode = '22023';
  end if;
  if p_feed = 'following' and auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(item order by created_at desc, id desc), '[]'::jsonb) into result from (
    select p.created_at, p.id, jsonb_build_object(
      'id', p.id, 'user_id', p.user_id, 'mime_type', p.mime_type,
      'storage_path', p.storage_path, 'caption', p.caption, 'created_at', p.created_at,
      'author', jsonb_build_object('id', a.id, 'username', a.username, 'displayName', a.display_name, 'avatarUrl', a.avatar_url)
    ) as item
    from public.media_posts p join public.profiles a on a.id = p.user_id
    where p.published_at is not null and p.mime_type like 'video/%'
      and (p_feed = 'for-you' or exists (
        select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id
      ))
    order by p.created_at desc, p.id desc limit p_limit offset p_offset
  ) page;
  return result;
end;
$$;
revoke all on function public.media_video_feed(text, integer, integer) from public;
grant execute on function public.media_video_feed(text, integer, integer) to anon, authenticated;
