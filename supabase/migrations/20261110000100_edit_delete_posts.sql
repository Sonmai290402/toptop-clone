alter table public.media_posts add column if not exists updated_at timestamptz;

create table public.post_file_cleanup (
  post_id uuid primary key,
  user_id uuid not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
alter table public.post_file_cleanup enable row level security;
revoke all on public.post_file_cleanup from anon, authenticated;
grant select, delete on public.post_file_cleanup to authenticated;
create policy cleanup_owner_read on public.post_file_cleanup for select to authenticated using (user_id = auth.uid());
create policy cleanup_owner_delete on public.post_file_cleanup for delete to authenticated using (user_id = auth.uid());
create policy posts_cleanup_read on storage.objects for select to authenticated using (
  bucket_id = 'posts' and exists (select 1 from public.post_file_cleanup q where q.storage_path = name and q.user_id = auth.uid())
);
create policy posts_cleanup_delete on storage.objects for delete to authenticated using (
  bucket_id = 'posts' and exists (select 1 from public.post_file_cleanup q where q.storage_path = name and q.user_id = auth.uid())
);

create function public.edit_post_caption(p_id uuid, p_caption text, p_expected_caption text)
returns void language plpgsql security definer set search_path = '' as $$
declare post public.media_posts;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_caption is null or char_length(p_caption) > 2200 or p_expected_caption is null then
    raise exception 'Invalid caption' using errcode = '22023';
  end if;
  select * into post from public.media_posts where id = p_id for update;
  if not found or post.published_at is null then raise exception 'Post not found' using errcode = 'P0002'; end if;
  if post.user_id <> auth.uid() then raise exception 'Forbidden' using errcode = '42501'; end if;
  if post.caption <> p_expected_caption then raise exception 'Post changed' using errcode = '40001'; end if;
  update public.media_posts set caption = p_caption, updated_at = now() where id = p_id;
end;
$$;

create function public.delete_owned_post(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare post public.media_posts; pending_path text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into post from public.media_posts where id = p_id for update;
  if not found then
    select storage_path into pending_path from public.post_file_cleanup where post_id = p_id and user_id = auth.uid();
    return pending_path;
  end if;
  if post.user_id <> auth.uid() then raise exception 'Forbidden' using errcode = '42501'; end if;
  if post.published_at is null then raise exception 'Post not published' using errcode = 'P0002'; end if;
  insert into public.post_file_cleanup(post_id, user_id, storage_path) values(post.id, post.user_id, post.storage_path);
  delete from public.media_posts where id = p_id;
  return post.storage_path;
end;
$$;
revoke all on function public.edit_post_caption(uuid,text,text), public.delete_owned_post(uuid) from public;
grant execute on function public.edit_post_caption(uuid,text,text), public.delete_owned_post(uuid) to authenticated;
