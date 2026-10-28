create type public.user_role as enum ('admin', 'user');
alter table public.profiles add column role public.user_role not null default 'user';

-- Preserve previously assigned admins once, then remove the legacy metadata role.
update public.profiles p set role = 'admin'
from auth.users u where u.id = p.id and u.raw_app_meta_data->>'app_role' = 'admin';
drop trigger if exists on_auth_user_default_role on auth.users;
drop function if exists public.set_default_app_role();
update auth.users set raw_app_meta_data = raw_app_meta_data - 'app_role'
where raw_app_meta_data ? 'app_role';

-- Table Editor/service-role writes remain available; client profile edits cannot set role.
revoke insert, update on public.profiles from anon, authenticated;
revoke insert(role), update(role) on public.profiles from anon, authenticated;

-- Rename the helper in place to preserve existing policy dependencies.
alter function public.is_app_admin() rename to is_admin;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.user_role);
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.publish_admin_sound(p_id uuid, p_title text, p_artist text, p_duration_ms integer)
returns public.sounds language plpgsql security definer set search_path = '' as $$
declare upload public.sound_uploads; track public.sounds; object_metadata jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
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
