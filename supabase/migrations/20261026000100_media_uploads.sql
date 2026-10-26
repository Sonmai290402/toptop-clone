create table public.media_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mime_type text not null check (mime_type in ('video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0),
  storage_path text generated always as (
    user_id::text || '/' || id::text || case mime_type
      when 'video/mp4' then '.mp4' when 'video/webm' then '.webm'
      when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.webp' end
  ) stored,
  caption text not null default '' check (char_length(caption) <= 2200),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  check (size_bytes <= case when mime_type like 'video/%' then 52428800 else 10485760 end)
);
create index media_posts_owner_date on public.media_posts(user_id, created_at desc);
alter table public.media_posts enable row level security;
revoke all on public.media_posts from anon, authenticated;
grant select on public.media_posts to authenticated;
grant insert (user_id, mime_type, size_bytes) on public.media_posts to authenticated;
create policy media_posts_read_own on public.media_posts for select to authenticated using (user_id = (select auth.uid()));
create policy media_posts_create_own on public.media_posts for insert to authenticated with check (user_id = (select auth.uid()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 52428800, array['video/mp4','video/webm','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy posts_insert_pending on storage.objects for insert to authenticated with check (
  bucket_id = 'posts' and exists (
    select 1 from public.media_posts p where p.storage_path = name and p.user_id = (select auth.uid())
    and p.published_at is null and p.created_at > now() - interval '2 hours'
  )
);

create function public.publish_media_post(p_id uuid, p_caption text)
returns public.media_posts language plpgsql security definer set search_path = '' as $$
declare
  post public.media_posts;
  object_metadata jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into post from public.media_posts where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Upload not found' using errcode = '42501'; end if;
  if post.published_at is not null then return post; end if;
  if p_caption is null or char_length(trim(p_caption)) > 2200 then
    raise exception 'Invalid caption' using errcode = '22023';
  end if;
  select metadata into object_metadata from storage.objects where bucket_id = 'posts' and name = post.storage_path;
  if object_metadata is null or (object_metadata->>'size')::bigint is distinct from post.size_bytes
    or object_metadata->>'mimetype' is distinct from post.mime_type then
    raise exception 'Upload is missing or does not match the declared file' using errcode = '22023';
  end if;
  update public.media_posts set caption = trim(p_caption), published_at = now() where id = post.id returning * into post;
  return post;
end;
$$;
revoke all on function public.publish_media_post(uuid, text) from public;
grant execute on function public.publish_media_post(uuid, text) to authenticated;
