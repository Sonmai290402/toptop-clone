create table public.sounds (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  artist text not null default 'Unknown artist' check (char_length(trim(artist)) between 1 and 160),
  storage_path text not null unique check (char_length(storage_path) between 1 and 512 and storage_path !~ '(^/|\.\.|://)'),
  duration_ms integer not null check (duration_ms between 1000 and 3600000),
  is_active boolean not null default true,
  search_text text generated always as (title || ' ' || artist) stored,
  created_at timestamptz not null default now()
);
alter table public.sounds enable row level security;
revoke all on public.sounds from anon, authenticated;
grant select on public.sounds to anon, authenticated;
create policy sounds_read_active on public.sounds for select to anon, authenticated using (is_active);
create index sounds_title_id on public.sounds(title, id) where is_active;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('sounds', 'sounds', true, 20971520, array['audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/x-wav'])
on conflict (id) do nothing;
-- Only trusted dashboard/service-role operations can write sounds or their files.

alter table public.media_posts
  add column sound_id uuid references public.sounds(id) on delete restrict,
  add column sound_start_ms integer not null default 0 check (sound_start_ms >= 0),
  add column sound_duration_ms integer check (sound_duration_ms between 1000 and 60000),
  add column music_volume double precision not null default 1 check (music_volume between 0 and 1),
  add column original_volume double precision not null default 1 check (original_volume between 0 and 1),
  add constraint post_sound_segment check (
    (sound_id is null and sound_start_ms = 0 and sound_duration_ms is null) or
    (sound_id is not null and sound_duration_ms is not null)
  );
create index media_posts_sound on public.media_posts(sound_id) where sound_id is not null;

create function public.publish_media_post_with_sound(
  p_id uuid, p_caption text, p_sound_id uuid default null,
  p_start_ms integer default 0, p_duration_ms integer default null,
  p_music_volume double precision default 1, p_original_volume double precision default 1
) returns public.media_posts language plpgsql security definer set search_path = '' as $$
declare post public.media_posts; track public.sounds;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into post from public.media_posts where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Upload not found' using errcode = '42501'; end if;
  -- Retrying an already published upload never changes its caption or soundtrack.
  if post.published_at is not null then return post; end if;
  if p_start_ms is null or p_start_ms < 0 or p_music_volume is null or p_original_volume is null
    or not (p_music_volume between 0 and 1) or not (p_original_volume between 0 and 1) then
    raise exception 'Invalid sound settings';
  end if;
  if p_sound_id is not null then
    select * into track from public.sounds where id = p_sound_id and is_active for share;
    if not found or p_duration_ms is null or p_duration_ms < 1000 or p_duration_ms > 60000
      or p_start_ms::bigint + p_duration_ms > track.duration_ms then
      raise exception 'Sound unavailable or invalid segment';
    end if;
    if not exists(select 1 from storage.objects where bucket_id = 'sounds' and name = track.storage_path) then
      raise exception 'Sound file not found';
    end if;
  elsif p_start_ms <> 0 or p_duration_ms is not null then
    raise exception 'Sound settings require a sound';
  end if;
  -- The existing function verifies the actual uploaded object's size and MIME type.
  perform public.publish_media_post(p_id, p_caption);
  update public.media_posts set sound_id = p_sound_id, sound_start_ms = p_start_ms,
    sound_duration_ms = p_duration_ms, music_volume = p_music_volume, original_volume = p_original_volume
    where id = p_id returning * into post;
  return post;
end;
$$;
revoke all on function public.publish_media_post_with_sound(uuid,text,uuid,integer,integer,double precision,double precision) from public, anon;
grant execute on function public.publish_media_post_with_sound(uuid,text,uuid,integer,integer,double precision,double precision) to authenticated;

create or replace function public.media_post_feed(p_feed text default 'for-you', p_limit integer default 11, p_offset integer default 0)
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
    select p.created_at, p.id, to_jsonb(p) || jsonb_build_object(
      'author', jsonb_build_object('id', a.id, 'username', a.username, 'displayName', a.display_name, 'avatarUrl', a.avatar_url)
    ) as item
    from public.media_posts p join public.profiles a on a.id = p.user_id
    where p.published_at is not null
      and (p_feed = 'for-you' or exists (
        select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id
      ))
    order by p.created_at desc, p.id desc limit p_limit offset p_offset
  ) page;
  return result;
end;
$$;
