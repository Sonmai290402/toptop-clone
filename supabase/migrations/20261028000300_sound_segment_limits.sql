-- Expand video sound segments and enforce the photo limit at the database boundary.
alter table public.media_posts drop constraint media_posts_sound_duration_ms_check;
alter table public.media_posts add constraint media_posts_sound_duration_ms_check
  check (sound_duration_ms between 1000 and 3600000);
-- Normalize existing photo segments before enforcing the new limit.
update public.media_posts set sound_duration_ms = 30000
where mime_type like 'image/%' and sound_duration_ms > 30000;
alter table public.media_posts add constraint media_posts_image_sound_duration_check
  check (mime_type not like 'image/%' or sound_duration_ms <= 30000);

create or replace function public.publish_media_post_with_sound(
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
    if not found or p_duration_ms is null or p_duration_ms < 1000 or p_duration_ms > 3600000
      or (post.mime_type like 'image/%' and p_duration_ms > 30000)
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



