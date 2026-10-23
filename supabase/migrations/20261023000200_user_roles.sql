-- Application role is separate from Supabase's database role "authenticated".
-- Clients cannot edit raw_app_meta_data through the Auth user API.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"app_role":"user"}'::jsonb
where raw_app_meta_data ->> 'app_role' is null;

create function public.set_default_app_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data ->> 'app_role' is null then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"app_role":"user"}'::jsonb;
  end if;
  return new;
end;
$$;
revoke all on function public.set_default_app_role() from public, anon, authenticated;
create trigger on_auth_user_default_role before insert on auth.users
for each row execute function public.set_default_app_role();
