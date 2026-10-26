grant select on public.media_posts to anon;
create policy media_posts_read_published on public.media_posts
  for select to anon, authenticated using (published_at is not null);
create index media_posts_published_date on public.media_posts(created_at desc, id desc)
  where published_at is not null;
create index media_posts_author_published_date on public.media_posts(user_id, created_at desc, id desc)
  where published_at is not null;
