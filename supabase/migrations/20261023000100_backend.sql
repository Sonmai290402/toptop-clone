-- Basic backend. All application requests use the caller's JWT, never a service key.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 160),
  created_at timestamptz not null default now()
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  video_url text not null,
  poster_url text,
  description text not null default '' check (char_length(description) <= 2200),
  is_pinned boolean not null default false,
  is_published boolean not null default true,
  view_count integer not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.video_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table public.video_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index videos_feed_idx on public.videos(created_at desc, id desc) where is_published;
create index videos_author_idx on public.videos(author_id, is_pinned desc, created_at desc, id desc) where is_published;
create index videos_popular_idx on public.videos(author_id, is_pinned desc, view_count desc, id desc) where is_published;
create index comments_video_idx on public.comments(video_id, created_at desc, id desc);
create index comments_author_idx on public.comments(author_id);
create index video_likes_video_idx on public.video_likes(video_id);
create index video_saves_video_idx on public.video_saves(video_id);
create index follows_target_idx on public.follows(following_id);

-- Auth owns credentials; profiles contains public information only.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  requested_username text := lower(btrim(new.raw_user_meta_data ->> 'username'));
begin
  -- Supports users created by Dashboard/OAuth without a username.
  if requested_username is null then
    requested_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 24);
  end if;
  insert into public.profiles(id, username, display_name)
  values (new.id, requested_username,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), requested_username));
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.comments enable row level security;
alter table public.video_likes enable row level security;
alter table public.video_saves enable row level security;
alter table public.follows enable row level security;

-- Explicit grants: clients cannot set IDs, timestamps, counters or upload records.
revoke all on public.profiles, public.videos, public.comments, public.video_likes, public.video_saves, public.follows from anon, authenticated;
grant select on public.profiles, public.videos, public.comments to anon, authenticated;
grant update(display_name, avatar_url, bio) on public.profiles to authenticated;
grant insert(video_id, author_id, content), delete on public.comments to authenticated;
grant select, delete on public.video_likes, public.video_saves, public.follows to authenticated;
grant insert(user_id, video_id) on public.video_likes, public.video_saves to authenticated;
grant insert(follower_id, following_id) on public.follows to authenticated;
grant all on public.profiles, public.videos, public.comments, public.video_likes, public.video_saves, public.follows to service_role;

create policy profiles_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy videos_read on public.videos for select to anon, authenticated using (is_published);
create policy comments_read on public.comments for select to anon, authenticated
using (exists(select 1 from public.videos v where v.id = video_id and v.is_published));
create policy comments_insert on public.comments for insert to authenticated
with check (author_id = (select auth.uid()) and exists(select 1 from public.videos v where v.id = video_id and v.is_published));
create policy comments_delete on public.comments for delete to authenticated using (author_id = (select auth.uid()));
create policy likes_read on public.video_likes for select to authenticated using (user_id = (select auth.uid()));
create policy likes_insert on public.video_likes for insert to authenticated
with check (user_id = (select auth.uid()) and exists(select 1 from public.videos v where v.id = video_id and v.is_published));
create policy likes_delete on public.video_likes for delete to authenticated using (user_id = (select auth.uid()));
create policy saves_read on public.video_saves for select to authenticated using (user_id = (select auth.uid()));
create policy saves_insert on public.video_saves for insert to authenticated
with check (user_id = (select auth.uid()) and exists(select 1 from public.videos v where v.id = video_id and v.is_published));
create policy saves_delete on public.video_saves for delete to authenticated using (user_id = (select auth.uid()));
create policy follows_read on public.follows for select to authenticated using (follower_id = (select auth.uid()));
create policy follows_insert on public.follows for insert to authenticated
with check (follower_id = (select auth.uid()) and follower_id <> following_id);
create policy follows_delete on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

-- Read RPCs use fixed search_path and explicit visibility filters. Definer access
-- exposes aggregate counts without exposing other people's private likes/saves.
create function public.api_profile(p_user_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'displayName', p.display_name,
    'avatarUrl', p.avatar_url, 'bio', p.bio, 'createdAt', p.created_at,
    'followerCount', (select count(*) from public.follows f where f.following_id = p.id),
    'followingCount', (select count(*) from public.follows f where f.follower_id = p.id),
    'likeCount', (select count(*) from public.video_likes l join public.videos v on v.id = l.video_id where v.author_id = p.id and v.is_published),
    'isFollowing', exists(select 1 from public.follows f where f.following_id = p.id and f.follower_id = auth.uid())
  ) from public.profiles p where p.id = p_user_id;
$$;

create function public.api_video(p_video_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', v.id, 'videoUrl', v.video_url, 'posterUrl', v.poster_url,
    'description', v.description, 'createdAt', v.created_at,
    'isPinned', v.is_pinned, 'viewCount', v.view_count,
    'author', jsonb_build_object('id', p.id, 'username', p.username, 'displayName', p.display_name, 'avatarUrl', p.avatar_url),
    'likeCount', (select count(*) from public.video_likes l where l.video_id = v.id),
    'commentCount', (select count(*) from public.comments c where c.video_id = v.id),
    'isLiked', exists(select 1 from public.video_likes l where l.video_id = v.id and l.user_id = auth.uid()),
    'isSaved', exists(select 1 from public.video_saves s where s.video_id = v.id and s.user_id = auth.uid()),
    'isFollowing', exists(select 1 from public.follows f where f.following_id = v.author_id and f.follower_id = auth.uid())
  ) from public.videos v join public.profiles p on p.id = v.author_id
  where v.id = p_video_id and v.is_published;
$$;

create function public.api_video_page(
  p_scope text default 'all', p_author_id uuid default null,
  p_sort text default 'latest', p_limit integer default 11, p_cursor jsonb default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_scope not in ('all', 'following', 'author', 'liked', 'saved') or p_scope is null
    or p_sort not in ('latest', 'oldest', 'popular') or p_sort is null
    or p_limit is null or p_limit < 1 or p_limit > 51
    or (p_scope = 'author' and p_author_id is null) then
    raise exception 'Invalid page parameters' using errcode = '22023';
  end if;
  if p_scope in ('following', 'liked', 'saved') and auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  with ranked as (
    select v.id,
      case when p_scope = 'author' and v.is_pinned then 1 else 0 end as pin,
      case p_sort when 'popular' then v.view_count::numeric
        when 'oldest' then -extract(epoch from v.created_at)
        else extract(epoch from v.created_at) end as sort_value
    from public.videos v where v.is_published and (
      p_scope = 'all'
      or (p_scope = 'author' and v.author_id = p_author_id)
      or (p_scope = 'following' and exists(select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = v.author_id))
      or (p_scope = 'liked' and exists(select 1 from public.video_likes l where l.user_id = auth.uid() and l.video_id = v.id))
      or (p_scope = 'saved' and exists(select 1 from public.video_saves s where s.user_id = auth.uid() and s.video_id = v.id))
    )
  ), page as (
    select * from ranked r
    where p_cursor is null or (r.pin, r.sort_value, r.id) <
      ((p_cursor->>'pin')::integer, (p_cursor->>'value')::numeric, (p_cursor->>'id')::uuid)
    order by r.pin desc, r.sort_value desc, r.id desc limit p_limit
  )
  select coalesce(jsonb_agg(public.api_video(page.id) || jsonb_build_object(
    'cursorKey', jsonb_build_object('pin', page.pin, 'value', page.sort_value::text, 'id', page.id)
  ) order by page.pin desc, page.sort_value desc, page.id desc), '[]'::jsonb)
  into result from page;
  return result;
end;
$$;

create function public.api_comment(p_comment_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'videoId', c.video_id, 'content', c.content,
    'createdAt', c.created_at, 'isOwner', coalesce(c.author_id = auth.uid(), false),
    'author', jsonb_build_object('id', p.id, 'username', p.username, 'displayName', p.display_name, 'avatarUrl', p.avatar_url))
  from public.comments c join public.profiles p on p.id = c.author_id
  join public.videos v on v.id = c.video_id and v.is_published
  where c.id = p_comment_id;
$$;

create function public.api_comment_page(p_video_id uuid, p_limit integer default 11, p_cursor jsonb default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 51 then
    raise exception 'Invalid limit' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(public.api_comment(c.id) || jsonb_build_object(
    'cursorKey', jsonb_build_object('createdAt', c.created_at, 'id', c.id)
  ) order by c.created_at desc, c.id desc), '[]'::jsonb) into result
  from (
    select c.id, c.created_at from public.comments c
    join public.videos v on v.id = c.video_id and v.is_published
    where c.video_id = p_video_id and (p_cursor is null or (c.created_at, c.id) <
      ((p_cursor->>'createdAt')::timestamptz, (p_cursor->>'id')::uuid))
    order by c.created_at desc, c.id desc limit p_limit
  ) c;
  return result;
end;
$$;

revoke all on function public.api_profile(uuid), public.api_video(uuid), public.api_video_page(text, uuid, text, integer, jsonb), public.api_comment(uuid), public.api_comment_page(uuid, integer, jsonb) from public;
grant execute on function public.api_profile(uuid), public.api_video(uuid), public.api_video_page(text, uuid, text, integer, jsonb), public.api_comment(uuid), public.api_comment_page(uuid, integer, jsonb) to anon, authenticated, service_role;

-- Prepare public media buckets. User uploads are deliberately disabled until
-- the upload/ownership/finalization workflow is implemented in a later phase.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('videos', 'videos', true, 52428800, array['video/mp4', 'video/webm']),
  ('thumbnails', 'thumbnails', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
