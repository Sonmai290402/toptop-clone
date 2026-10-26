# Media uploads

## Setup

Run `npx supabase db push` against the linked project, or run the complete contents of `supabase/migrations/20261026000100_media_uploads.sql` in the Supabase SQL Editor once. The existing backend migrations must already be installed. Do not run both methods for the same migration.

The migration creates the public `posts` Storage bucket, the `public.media_posts` table, ownership policies and the `publish_media_post` function. No service-role key is needed. Existing Supabase URL, publishable key and APP_URL environment variables are reused.

Sign in, open `/upload`, choose one file, enter an optional caption and select **Publish post**. Supported formats: MP4/WebM (50 MiB maximum), JPEG/PNG/WebP (10 MiB maximum). The page displays the 20 latest published uploads for the current account.

## API

All endpoints require authentication. Cookie requests that mutate data must send `Origin` equal to APP_URL; bearer requests may omit Origin. JSON responses use `{ "data": ... }`.

1. `POST /api/v1/uploads`, JSON `{ "mimeType": "video/mp4", "size": 123456 }`. Returns HTTP 201 with `{ "data": { "id": "uuid", "signedUrl": "..." } }`.
2. `PUT` the raw file bytes to `signedUrl`, with `Content-Type` matching mimeType and `x-upsert: false`. Do not send application cookies or a service-role key. The signed URL is a short-lived credential, valid for two hours; do not log or share it.
3. `POST /api/v1/uploads/{id}/complete`, JSON `{ "caption": "My first post" }`. Returns `{ "data": { "id": "uuid", "mediaType": "video", "mediaUrl": "https://...", "caption": "My first post", "createdAt": "..." } }`. Completion verifies ownership, stored MIME metadata and exact byte size. Repeating completion returns the original published post without duplicating it.
4. `GET /api/v1/me/posts` returns `{ "data": [ ...posts ], "pagination": { "hasMore": false, "nextOffset": null } }`. Defaults to the 20 newest published posts; see [Posts API](./POSTS-API.md) for pagination and sorting options.

Typical errors: 401 unauthenticated, 403 invalid Origin or ownership, 400 invalid input or incomplete upload, 503 unavailable database/Storage. When completion fails after a successful file upload, **Retry saving** reuses the existing upload.

## Scope and operations

Uploads are stored in `media_posts`. Profile, For You and Following read published videos from this collection through the [Posts API](./POSTS-API.md). The legacy `videos` API remains separate. This page is the upload and preview entry point for both photos and videos. Photo carousels, transcoding, thumbnail generation and adaptive streaming are not implemented.

Files in this public bucket are readable by anyone with the URL, including before completion. The application validates declared formats and Storage metadata, not the actual media codec/content. Interrupted uploads can leave unpublished rows or orphaned files. Administrators should periodically review unpublished rows older than two hours, remove associated files through the Storage API/dashboard, then delete those rows. No automatic cleanup or upload quota is configured in this demo.

Logout clears client query data and redirects to `/`, including other tabs. `/upload`, `/following`, single-segment profile pages such as `/@username`, and `/auth/reset-password` require a session. Anonymous visitors can still browse `/` and read public comments. Public profile-read APIs remain available; the restriction applies to profile pages as requested.

## Verification

- Upload a supported image and video; confirm progress, preview, recent uploads, and the corresponding Storage objects/table rows.
- Try an oversized/unsupported file; it must fail before upload.
- Sign out from `/upload` or `/@username`; verify immediate navigation to `/`.
- Open those URLs directly or use Back while signed out; protected content must not appear.
- Confirm anonymous video browsing and comment reads still work.
