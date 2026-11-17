alter table public.media_posts add column pinned_at timestamptz;
alter table public.media_posts add column thumbnail_path text;
create index media_posts_profile_pins on public.media_posts(user_id, pinned_at desc, created_at desc, id desc) where published_at is not null;

create function public.set_post_pin(p_id uuid, p_active boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare post public.media_posts;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_active is null then raise exception 'Invalid pin state' using errcode = '22023'; end if;
  -- Serialize all pin changes for this owner, including requests for different posts.
  perform 1 from public.profiles where id = auth.uid() for update;
  select * into post from public.media_posts where id = p_id for update;
  if not found or post.published_at is null then raise exception 'Post not found' using errcode = 'P0002'; end if;
  if post.user_id <> auth.uid() then raise exception 'Forbidden' using errcode = '42501'; end if;
  if p_active and post.pinned_at is null and (select count(*) from public.media_posts where user_id = auth.uid() and pinned_at is not null and published_at is not null) >= 3 then
    raise exception 'Pin limit reached' using errcode = 'P0001';
  end if;
  update public.media_posts set pinned_at = case when p_active then coalesce(pinned_at, now()) else null end where id = p_id;
  return p_active;
end;
$$;
revoke all on function public.set_post_pin(uuid,boolean) from public;
grant execute on function public.set_post_pin(uuid,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('thumbnails','thumbnails',true,3145728,array['image/jpeg'])
on conflict(id) do nothing;

create function public.can_upload_thumbnail(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.media_posts p where p.user_id = auth.uid() and p.published_at is null
    and p.mime_type like 'video/%' and p_path = p.user_id::text || '/' || p.id::text || '.jpg');
$$;
revoke all on function public.can_upload_thumbnail(text) from public;
grant execute on function public.can_upload_thumbnail(text) to authenticated;
create policy thumbnail_insert on storage.objects for insert to authenticated with check (bucket_id='thumbnails' and public.can_upload_thumbnail(name));
create policy thumbnail_update on storage.objects for update to authenticated using (bucket_id='thumbnails' and public.can_upload_thumbnail(name)) with check (bucket_id='thumbnails' and public.can_upload_thumbnail(name));
create policy thumbnail_read_owner on storage.objects for select to authenticated using (bucket_id='thumbnails' and (public.can_upload_thumbnail(name) or exists(select 1 from public.post_file_cleanup q where name=q.user_id::text || '/' || q.post_id::text || '.jpg' and q.user_id=auth.uid())));
create policy thumbnail_cleanup on storage.objects for delete to authenticated using (bucket_id='thumbnails' and exists(select 1 from public.post_file_cleanup q where name=q.user_id::text || '/' || q.post_id::text || '.jpg' and q.user_id=auth.uid()));

create function public.attach_post_thumbnail(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare post public.media_posts; path text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into post from public.media_posts where id=p_id for update;
  if not found or post.user_id <> auth.uid() then raise exception 'Forbidden' using errcode='42501'; end if;
  if post.published_at is not null or post.mime_type not like 'video/%' then raise exception 'Invalid upload' using errcode='22023'; end if;
  path := post.user_id::text || '/' || post.id::text || '.jpg';
  if not exists(select 1 from storage.objects where bucket_id='thumbnails' and name=path
    and metadata->>'mimetype'='image/jpeg' and (metadata->>'size')::bigint between 1 and 3145728) then
    raise exception 'Thumbnail missing or invalid' using errcode='22023';
  end if;
  update public.media_posts set thumbnail_path=path where id=p_id;
end;
$$;
revoke all on function public.attach_post_thumbnail(uuid) from public;
grant execute on function public.attach_post_thumbnail(uuid) to authenticated;
