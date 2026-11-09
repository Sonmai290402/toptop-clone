# Edit and delete published posts

Apply `supabase/migrations/20261110000100_edit_delete_posts.sql` using `npx supabase db push` before using these endpoints. No service-role key is needed. Restart the app after updating the code.

Both endpoints require a valid session or bearer token. Cookie mutations require the application's Origin header. Only the owner may change a published post; admin status does not grant additional editing rights.

## Edit caption

`PATCH /api/v1/posts/:postId`

```json
{"caption":"Updated caption","expectedCaption":"Original caption"}
```

Both strings are required and limited to 2,200 characters. Empty captions are allowed; extra fields are rejected. `expectedCaption` is the caption when the editor opened. A locked database operation compares it to the current caption and returns `409 POST_CHANGED` if it differs. This prevents overwriting a different caption from another tab (it does not detect an intervening edit that restores the same text).

The response is `{ "data": <post detail DTO> }`. Only caption and database `updated_at` change. Media, sound, creation time and interactions remain unchanged. Other errors include 400 invalid input, 401 missing session, 403 not owner and 404 missing/unpublished post.

## Delete post

`DELETE /api/v1/posts/:postId`

Response: `{ "data": { "cleanupPending": false } }`.

The database atomically records a Storage cleanup job and deletes the post. Foreign-key cascades remove post comments, likes and saves. The server then removes the associated object from the `posts` bucket and clears the cleanup job. Shared sound files are never removed.

If Storage cleanup fails, the post is still deleted and the response contains `cleanupPending: true`. The durable `post_file_cleanup` table retains the path and owner. Repeating DELETE as the same owner retries cleanup. There is no scheduled cleanup worker yet: operators should monitor this table, retry the endpoint or remove the recorded object through Storage before deleting its queue row. Do not delete queue rows before file cleanup. Storage/CDN caches may briefly retain previously public media URLs.

DELETE is idempotent for absent posts. Other users cannot read cleanup jobs or delete existing posts they do not own.

## Client and caching

`PostActionsMenu` is shared by Profile cards and VideoWatch. Its menu is outside the card link. The edit form uses React Hook Form and Zod; changes are saved only on Save. Closing a dirty form asks to discard it. Delete requires confirmation. VideoWatch returns to the author's profile after deletion.

Successful mutations update existing post-list caches without replacing pagination and invalidate related queries. Redis discovery generations are invalidated after database success. File cleanup failure does not restore the deleted post. Both endpoints use the existing general write rate limit (60 requests per minute).
