alter table public.post_comments
  add column parent_id uuid references public.post_comments(id) on delete cascade,
  add column reply_to_id uuid references public.post_comments(id) on delete set null;
create index post_comments_parent on public.post_comments(parent_id, created_at, id);
grant insert(reply_to_id) on public.post_comments to authenticated;

create function public.normalize_comment_reply() returns trigger language plpgsql set search_path = '' as $$
declare target public.post_comments;
begin
  if new.reply_to_id is not null then
    select * into target from public.post_comments where id = new.reply_to_id;
    if not found or target.post_id <> new.post_id then
      raise exception 'Invalid reply target' using errcode = '22023';
    end if;
    new.parent_id := coalesce(target.parent_id, target.id);
  else new.parent_id := null;
  end if;
  return new;
end;
$$;
create trigger normalize_comment_reply before insert on public.post_comments
for each row execute function public.normalize_comment_reply();

create table public.post_comment_likes (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(comment_id, user_id)
);
alter table public.post_comment_likes enable row level security;
grant select, insert, delete on public.post_comment_likes to authenticated;
create policy comment_likes_read on public.post_comment_likes for select to authenticated using (user_id = (select auth.uid()));
create policy comment_likes_insert on public.post_comment_likes for insert to authenticated with check (
  user_id = (select auth.uid()) and exists(select 1 from public.post_comments c join public.media_posts p on p.id=c.post_id where c.id=comment_id and p.published_at is not null)
);
create policy comment_likes_delete on public.post_comment_likes for delete to authenticated using (user_id = (select auth.uid()));

create function public.post_comment_page(p_post_id uuid, p_parent_id uuid default null, p_limit integer default 21, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_limit is null or p_limit not between 1 and 51 or p_offset is null or p_offset not between 0 and 100000 then
    raise exception 'Invalid pagination' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(item order by created_at, id), '[]'::jsonb) into result from (
    select c.created_at, c.id, jsonb_build_object(
      'id',c.id,'postId',c.post_id,'content',c.content,'createdAt',c.created_at,'parentId',c.parent_id,
      'author',jsonb_build_object('id',a.id,'username',a.username,'displayName',a.display_name,'avatarUrl',a.avatar_url),
      'replyTo',case when target.id is null then null else jsonb_build_object('id',target.id,'username',target.username,'displayName',target.display_name) end,
      'replyCount',(select count(*) from public.post_comments r where r.parent_id=c.id),
      'likeCount',(select count(*) from public.post_comment_likes l where l.comment_id=c.id),
      'isLiked',exists(select 1 from public.post_comment_likes l where l.comment_id=c.id and l.user_id=auth.uid())
    ) item
    from public.post_comments c join public.media_posts p on p.id=c.post_id
    join public.profiles a on a.id=c.author_id
    left join public.post_comments replied on replied.id=c.reply_to_id
    left join public.profiles target on target.id=replied.author_id
    where c.post_id=p_post_id and p.published_at is not null and c.parent_id is not distinct from p_parent_id
    order by c.created_at, c.id limit p_limit offset p_offset
  ) page;
  return result;
end;
$$;
revoke all on function public.post_comment_page(uuid, uuid, integer, integer) from public;
grant execute on function public.post_comment_page(uuid, uuid, integer, integer) to anon, authenticated;
