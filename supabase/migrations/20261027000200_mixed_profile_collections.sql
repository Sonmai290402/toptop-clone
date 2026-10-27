create or replace function public.my_interacted_posts(p_kind text, p_limit integer default 21, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('liked', 'saved') or p_limit is null or p_limit < 1 or p_limit > 51 or p_offset is null or p_offset < 0 or p_offset > 100000 then
    raise exception 'Invalid list parameters' using errcode = '22023';
  end if;
  return (select coalesce(jsonb_agg(row_data order by created_at desc, id desc), '[]'::jsonb) from (
    select p.created_at, p.id, to_jsonb(p) as row_data from public.media_posts p
    where p.published_at is not null and (
      (p_kind = 'liked' and exists(select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid())) or
      (p_kind = 'saved' and exists(select 1 from public.post_saves s where s.post_id = p.id and s.user_id = auth.uid()))
    ) order by p.created_at desc, p.id desc limit p_limit offset p_offset
  ) page);
end;
$$;
revoke all on function public.my_interacted_posts(text, integer, integer) from public, anon;
grant execute on function public.my_interacted_posts(text, integer, integer) to authenticated;
