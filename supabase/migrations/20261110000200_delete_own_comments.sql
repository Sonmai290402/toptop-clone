grant delete on public.post_comments to authenticated;
create policy post_comments_delete_own on public.post_comments
for delete to authenticated using (author_id = (select auth.uid()));
