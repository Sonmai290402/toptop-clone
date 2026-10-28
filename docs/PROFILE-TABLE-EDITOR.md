# Editing demo user profiles in Supabase

## Existing table

The application already defines `public.profiles` in
`supabase/migrations/20261023000100_backend.sql`. Do not create a second `users`
table: profile APIs and authentication UI read `profiles`.

- `auth.users`: authentication accounts, credentials and application role metadata.
- `public.profiles`: editable public profile information.
- `profiles.id`: the matching `auth.users.id`, not a separate generated ID.

## Find the table

1. Open the same Supabase project referenced by `NEXT_PUBLIC_SUPABASE_URL`.
2. Open Table Editor and select the `public` schema.
3. Clear any table search filter and select `profiles`.
4. Filter by `username` or by the UUID from Authentication > Users.

If the table is missing, run this read-only check in SQL Editor:

```sql
select to_regclass('public.profiles') as profile_table;
```

A null result means the table is absent in that database. For a fresh project,
apply the backend migrations in order, following `docs/API.md`. For a linked
project managed through the CLI, use:

```bash
pnpm exec supabase migration list
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

Do not rerun the initial SQL manually if tables already exist. If the CLI marks
the initial migration as applied but `profiles` is missing, investigate schema
drift before changing migration history or rebuilding tables.

## Editable demo fields

| Column | Example | Constraint |
| --- | --- | --- |
| `username` | `demo_alice` | Unique; 3-30 lowercase letters, digits or underscores; no `@` |
| `display_name` | `Alice Demo` | 1-80 characters; not blank |
| `avatar_url` | `https://example.com/avatar.jpg` | Use an accessible HTTPS image URL, or NULL |
| `bio` | `Creating short videos.` | Up to 160 characters |
| `created_at` | Existing timestamp | Normally leave unchanged |
| `id` | Existing account UUID | Leave unchanged |

Open the row in Table Editor, edit the desired fields and save. If you change
`username`, use the new `/@username` URL in the app. Reload the page to refresh
the in-memory query cache. Reloading also refreshes the sidebar session profile.
Database edits are not streamed to an already open page in this demo.

Equivalent SQL for a specific existing demo account:

```sql
update public.profiles
set display_name = 'Alice Demo',
    bio = 'Creating short videos.',
    avatar_url = null
where username = 'demo_linhchi'
returning id, username, display_name, avatar_url, bio;
```

The statement changes no rows if that username does not exist. Choose the target
account explicitly before running an update.

## Empty table or missing account

The database trigger creates a profile when a new Auth account is created.
Creating only a profile row does not create login credentials. Create demo accounts
through sign-up, Google sign-in, Authentication > Users, or the existing seed script.

For accounts created before the trigger was installed, inspect missing profiles:

```sql
select u.id, u.created_at
from auth.users as u
left join public.profiles as p on p.id = u.id
where p.id is null;
```

If this returns a known demo account, insert its profile in Table Editor using
that exact UUID, a unique username and a display name. Leave existing profiles
unchanged. Do not use a random UUID: the foreign key requires an Auth account.

## Other user data

- Email/password/accounts: manage through Supabase Auth, not a new public table.
- User role: `public.profiles.role` (`admin` or `user`, default `user`) after migration
  `20261028000100_profile_roles.sql`. Edit it in Table Editor as the project owner;
  regular clients cannot change this column. See [Admin setup](./ADMIN.md).
- Following/follower counts: computed from `public.follows`.
- Received likes: computed from `public.video_likes` on published videos.

There are no editable count columns on `profiles`. Add or remove actual demo
relationships if you need different counts, keeping the existing foreign keys.
Keep RLS enabled; dashboard administration does not require granting public write access.

Reference: https://supabase.com/docs/guides/auth/managing-user-data
