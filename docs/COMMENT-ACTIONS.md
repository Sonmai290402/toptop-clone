# Comment actions

Apply `20261110000200_delete_own_comments.sql` with `npx supabase db push`.

## Likes

The existing PUT/DELETE `/api/v1/post-comments/:commentId/like` endpoints are unchanged. The client uses TanStack Query pending mutation variables to immediately overlay `isLiked` and `likeCount` in every mounted copy of that comment. The underlying paginated cache remains authoritative. When a request fails, the pending overlay disappears and an error is shown. The list is refreshed after either outcome to reconcile requests that reached the server despite a network failure.

Pending mutations are scoped by post, viewer and comment. Another comment's request cannot overwrite the optimistic state. The same comment's like button is disabled while pending. Logout/account switching does not apply old callbacks to the new viewer's cache.

## Deletion

`DELETE /api/v1/post-comments/:commentId` requires authentication and, for cookie requests, a valid Origin. Returns 204 when deleted or already absent, 403 for a visible comment owned by someone else, 400 for an invalid UUID and 401 for unauthenticated requests. RLS separately permits deletion only by the author. The existing general write rate limit also applies.

Only the author sees Delete. The UI asks for confirmation and waits for success before refreshing the list, reply counts and post comment count. A deleted reply target is cleared from the composer. Deletion is permanent: deleting a root comment cascades to all child replies and their likes; deleting a reply preserves its sibling replies. The confirmation explicitly describes root-thread deletion. No soft-delete behavior is introduced.

Reply lists use distinct query keys and send `parentId` to the API. Comment submission forwards `replyToId` when present.
