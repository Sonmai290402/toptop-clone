create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.media_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index post_comments_page on public.post_comments(post_id, created_at desc, id desc);
create table public.post_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.media_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, post_id)
);
create table public.post_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.media_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, post_id)
);
create index post_likes_post on public.post_likes(post_id);
create index post_saves_post on public.post_saves(post_id);
alter table public.post_comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
revoke all on public.post_comments, public.post_likes, public.post_saves from anon, authenticated;
grant select on public.post_comments to anon, authenticated;
grant insert(post_id, author_id, content) on public.post_comments to authenticated;
grant select, delete on public.post_likes, public.post_saves to authenticated;
grant insert(user_id, post_id) on public.post_likes, public.post_saves to authenticated;
create policy post_comments_read on public.post_comments for select to anon, authenticated using (
  exists (select 1 from public.media_posts p where p.id = post_id and p.published_at is not null)
);
create policy post_comments_insert on public.post_comments for insert to authenticated with check (
  author_id = (select auth.uid()) and exists (select 1 from public.media_posts p where p.id = post_id and p.published_at is not null)
);
create policy post_likes_read on public.post_likes for select to authenticated using (user_id = (select auth.uid()));
create policy post_likes_insert on public.post_likes for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.media_posts p where p.id = post_id and p.published_at is not null)
);
create policy post_likes_delete on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));
create policy post_saves_read on public.post_saves for select to authenticated using (user_id = (select auth.uid()));
create policy post_saves_insert on public.post_saves for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.media_posts p where p.id = post_id and p.published_at is not null)
);
create policy post_saves_delete on public.post_saves for delete to authenticated using (user_id = (select auth.uid()));

create function public.post_interaction_state(p_post_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'likeCount', (select count(*) from public.post_likes l where l.post_id = p.id),
    'commentCount', (select count(*) from public.post_comments c where c.post_id = p.id),
    'isLiked', exists(select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
    'isSaved', exists(select 1 from public.post_saves s where s.post_id = p.id and s.user_id = auth.uid()),
    'isFollowing', exists(select 1 from public.follows f where f.following_id = p.user_id and f.follower_id = auth.uid())
  ) from public.media_posts p where p.id = p_post_id and p.published_at is not null;
$$;
revoke all on function public.post_interaction_state(uuid) from public;
grant execute on function public.post_interaction_state(uuid) to anon, authenticated;

create function public.my_interacted_posts(p_kind text, p_limit integer default 21, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('liked', 'saved') or p_limit is null or p_limit < 1 or p_limit > 51 or p_offset is null or p_offset < 0 or p_offset > 100000 then
    raise exception 'Invalid list parameters' using errcode = '22023';
  end if;
  return (select coalesce(jsonb_agg(row_data order by created_at desc, id desc), '[]'::jsonb) from (
    select p.created_at, p.id, to_jsonb(p) as row_data from public.media_posts p
    where p.published_at is not null and p.mime_type like 'video/%' and (
      (p_kind = 'liked' and exists(select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid())) or
      (p_kind = 'saved' and exists(select 1 from public.post_saves s where s.post_id = p.id and s.user_id = auth.uid()))
    ) order by p.created_at desc, p.id desc limit p_limit offset p_offset
  ) page);
end;
$$;
revoke all on function public.my_interacted_posts(text, integer, integer) from public, anon;
grant execute on function public.my_interacted_posts(text, integer, integer) to authenticated;
