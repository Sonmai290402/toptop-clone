-- Restore editable profile fields after revoking table-wide write privileges.
-- Role changes remain restricted to trusted database administrators.
grant update(display_name, avatar_url, bio) on public.profiles to authenticated;
