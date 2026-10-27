# Admin sound management

The `/admin` page currently supports adding sounds and viewing/searching the library, including inactive tracks. Edit/delete, role management and other admin sections are not implemented. The route layout is shared by future `/admin/*` pages.

## Setup

1. Apply migrations through `20261027000400_admin_sound_uploads.sql` using `npx supabase db push` on the intended linked project.
2. Choose the account to grant admin access in Supabase **Authentication → Users** and copy its UUID.
3. As the project owner, run the following in Supabase SQL Editor, replacing the placeholder with that account's UUID:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"app_role":"admin"}'::jsonb
where id = 'REPLACE_WITH_USER_UUID';
```

Do not change the Supabase database role (`authenticated`) or put permissions in `user_metadata`. This implementation does not automatically promote any account. To revoke access, use the same SQL with `"app_role":"user"`.

4. Refresh the app or sign out/in. The account menu shows an **Admin** link only for admins. Open `/admin`.
5. Select MP3/M4A/Ogg/WAV up to 20 MiB, enter title and artist, check the detected duration and preview, then press **Add sound**. MP3 is recommended for browser compatibility. Duration must be between 1 second and 60 minutes. The track becomes active and available in Upload → Add sound.

No service-role key needs to be added to Next.js. The app uses the existing authenticated Supabase client. SQL permissions/RPCs enforce the trusted admin role. Duration is read from the file by the admin's browser, range-validated by the server, and stored in milliseconds. This version does not decode audio on the server to verify its duration.

## Access control

- Proxy verifies the authenticated user and trusted `app_metadata.app_role` before serving `/admin` or any nested path. Guests and non-admins redirect to `/`.
- The client layout blocks content while checking the session and redirects after logout or role loss.
- Every admin API verifies authentication (401 for guests) and admin role (403 for regular users) before calling services.
- Database checks read the current `auth.users.raw_app_meta_data` for `auth.uid()`, not a cached JWT role. Revoking the role blocks new uploads and publication even with an older access token.
- Storage uploads are scoped to a pending upload owned by that admin, with an immutable generated path. Direct writes to arbitrary paths or overwriting published tracks are not granted.
- Signed URLs already issued are temporary capabilities: role revocation does not revoke an already-issued Storage upload URL. Completion still requires current admin permission. Do not share signed URLs.
- Public sound reads still exclude inactive tracks. Admin library reads include inactive tracks. Existing public sound files remain public.

## API

All routes require admin authentication. Cookie-based POST requests must include an Origin matching APP_URL; the browser sends it automatically. Bearer authentication follows the existing API convention.

### GET /api/v1/admin/sounds

Query: `q` (title/artist, max 100 characters), `limit` (1–50, default 20), `offset` (0–100000, default 0).
Returns `{ data: [...], pagination: { hasMore, nextOffset } }`. Each sound has the public sound DTO fields plus `isActive` and `createdAt`. Ordered newest first, then by ID. This endpoint includes manually added tracks.

### POST /api/v1/admin/sounds/uploads

```json
{ "mimeType": "audio/mpeg", "size": 123456 }
```

Accepted MIME types: `audio/mpeg`, `audio/mp4`, `audio/ogg`, `audio/wav`, `audio/x-wav`. Size must be 1–20971520 bytes. Additional fields are rejected; ownership/path are never accepted from the client.

Returns HTTP 201:

```json
{ "data": { "id": "UPLOAD_UUID", "signedUrl": "SIGNED_STORAGE_UPLOAD_URL" } }
```

PUT the file bytes directly to `signedUrl` with `Content-Type` matching `mimeType` and `x-upsert: false`. The existing upload helper handles progress and cancellation. No file bytes pass through the Next.js API.

### POST /api/v1/admin/sounds/uploads/:uploadId/complete

```json
{ "title": "Summer walk", "artist": "Demo artist", "durationMs": 45000 }
```

Title/artist are trimmed, required and limited to 160 characters. Duration must be an integer between 1000 and 3600000 ms. The function checks current admin permission, upload ownership and the actual Storage object's declared size/MIME metadata before creating an active sound. The sound row and upload completion marker are committed atomically. Missing/mismatched files return `400 UPLOAD_INCOMPLETE`.

Returns `{ data: { id, title, artist, durationMs, audioUrl, isActive, createdAt } }`. Retrying completion returns the same sound without duplicates or changing its original details. If the file uploaded but saving failed, the UI offers **Retry saving**. Selecting a different file starts a new upload. Leaving the page cancels the client request; it cannot undo a server transaction that already committed.

Pending uploads do not appear in the library. Abandoned pending rows/files may be removed manually later; scheduled cleanup is not included. Sound deletion or deactivation still requires the Supabase Dashboard in this version.
