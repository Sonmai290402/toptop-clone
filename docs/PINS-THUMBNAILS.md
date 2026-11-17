# Profile pins and video covers

Run `npx supabase db push` to apply `20261117000100_post_pins_thumbnails.sql` before using the new code. The migration adds `pinned_at`, `thumbnail_path`, a public `thumbnails` bucket, Storage policies and owner-checked RPCs. No service-role key is needed.

## Profile pins

- The owner can choose Pin to profile / Unpin from the existing post menu in Profile or VideoWatch.
- Up to three published posts per owner may be pinned, including photo posts. Repeating Pin on an already pinned post is idempotent.
- The database locks the owner's profile row before checking the limit, serializing concurrent pin changes across different posts.
- Profile lists sort pinned posts first (most recently pinned first), then unpinned posts by the selected latest/oldest order. For You and Following retain chronological ordering.
- Pinning refreshes the client post collections and invalidates Redis discovery caches.

`PUT /api/v1/posts/:postId/pin` pins; `DELETE` unpins. Both require authentication and a matching Origin for cookie requests. Response: `{ "data": { "isPinned": true } }` (false for unpin). Errors: 401 unauthenticated, 403 not owner, 404 missing/unpublished post, 409 `PIN_LIMIT` when already at three. Existing write rate limits apply.

## Video covers

Choose a cover on Upload before publishing a video:

1. Select a video.
2. Upload a JPG/PNG/WebP image up to 10 MB, or pause/scrub the cover preview video and click Use this frame.
3. Review the selected cover, then publish normally.

The browser converts the cover to JPEG, limits its longest edge to 1920 pixels and checks a 3 MB output limit. Video frames are extracted locally from the selected file. Image posts use their own image; a separate cover is optional for video posts. Existing videos without covers retain the previous preview behavior. This version does not change covers after publication.

Upload sends the media first, then the cover, then publishes. The cover selection is locked once the media upload ticket has completed so retries reuse the same cover. To change it after a failed publish attempt, reselect the main file. Failed/pending uploads are not automatically purged by this feature.

`POST /api/v1/uploads/:uploadId/thumbnail` takes raw `image/jpeg` bytes (not JSON or multipart), at most 3 MB. It requires an authenticated owner and an unpublished video. The server bounds the streamed request, checks the JPEG signature, uploads to `<ownerId>/<postId>.jpg`, and attaches the path only after database validation of Storage metadata. This signature check is not a full image decode; the normal UI decodes and re-encodes selected images before upload.

Response: `{ "data": { "uploaded": true } }`. Errors include 400 invalid upload/image, 403 wrong owner, 413 too large and 503 Storage failure. The existing upload rate limit applies. Covers cannot be overwritten through the authenticated Storage policies once published.

Post DTOs expose `isPinned` and `thumbnailUrl`. Profile video cards display the thumbnail when available, avoiding video metadata loading for those cards. Thumbnails are public, consistent with the existing public posts bucket.

Deleting a post attempts to remove both media and its thumbnail. The existing cleanup job is retained if either removal fails; repeat the owner DELETE endpoint to retry. No scheduled cleanup worker is added.

## Verification

- Pin three posts, attempt a fourth, then unpin and pin another. Verify guests see the same pinned order but no owner menu.
- Choose an image cover and a video-frame cover on separate uploads; verify Profile thumbnails after reload.
- Test failed uploads/retries and ensure no post publishes before the chosen cover has been attached.
- Run `pnpm test:backend` for owner/limit and thumbnail Storage policy tests.
