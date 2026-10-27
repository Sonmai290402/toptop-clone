-- Read the trusted application role from Auth, not editable user metadata or a stale JWT.
create function public.is_app_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id = auth.uid() and raw_app_meta_data->>'app_role' = 'admin');
$$;
revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

create policy sounds_read_admin on public.sounds for select to authenticated using ((select public.is_app_admin()));

create table public.sound_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mime_type text not null check (mime_type in ('audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/x-wav')),
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  storage_path text generated always as (
    'admin/' || user_id::text || '/' || id::text || case mime_type
      when 'audio/mpeg' then '.mp3' when 'audio/mp4' then '.m4a'
      when 'audio/ogg' then '.ogg' else '.wav' end
  ) stored,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index sound_uploads_owner on public.sound_uploads(user_id, created_at desc);
alter table public.sound_uploads enable row level security;
revoke all on public.sound_uploads from anon, authenticated;
grant select on public.sound_uploads to authenticated;
grant insert(user_id,mime_type,size_bytes) on public.sound_uploads to authenticated;
create policy sound_uploads_read_admin on public.sound_uploads for select to authenticated using (
  user_id = (select auth.uid()) and (select public.is_app_admin())
);
create policy sound_uploads_create_admin on public.sound_uploads for insert to authenticated with check (
  user_id = (select auth.uid()) and (select public.is_app_admin())
);

-- A signed upload is scoped to an immutable, random path belonging to this admin.
create policy sounds_insert_pending_admin on storage.objects for insert to authenticated with check (
  bucket_id = 'sounds' and (select public.is_app_admin()) and exists (
    select 1 from public.sound_uploads u where u.storage_path = name and u.user_id = (select auth.uid())
    and u.completed_at is null and u.created_at > now() - interval '2 hours'
  )
);

create function public.publish_admin_sound(p_id uuid, p_title text, p_artist text, p_duration_ms integer)
returns public.sounds language plpgsql security definer set search_path = '' as $$
declare upload public.sound_uploads; track public.sounds; object_metadata jsonb;
begin
  if not public.is_app_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select * into upload from public.sound_uploads where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Upload not found' using errcode = '42501'; end if;
  if upload.completed_at is not null then
    select * into track from public.sounds where id = upload.id;
    if not found then raise exception 'Sound no longer exists' using errcode = '22023'; end if;
    return track;
  end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 160
    or p_artist is null or char_length(trim(p_artist)) not between 1 and 160
    or p_duration_ms is null or p_duration_ms not between 1000 and 3600000 then
    raise exception 'Invalid sound details' using errcode = '22023';
  end if;
  select metadata into object_metadata from storage.objects where bucket_id = 'sounds' and name = upload.storage_path;
  if object_metadata is null or (object_metadata->>'size')::bigint is distinct from upload.size_bytes
    or object_metadata->>'mimetype' is distinct from upload.mime_type then
    raise exception 'Sound file is missing or does not match' using errcode = '22023';
  end if;
  insert into public.sounds(id,title,artist,storage_path,duration_ms,is_active)
    values (upload.id,trim(p_title),trim(p_artist),upload.storage_path,p_duration_ms,true) returning * into track;
  update public.sound_uploads set completed_at = now() where id = upload.id;
  return track;
end;
$$;
revoke all on function public.publish_admin_sound(uuid,text,text,integer) from public, anon;
grant execute on function public.publish_admin_sound(uuid,text,text,integer) to authenticated;
