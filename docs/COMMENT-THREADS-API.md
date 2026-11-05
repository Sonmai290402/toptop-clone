# Comment replies and likes

Apply `20261105000200_comment_threads.sql` before deploying these API changes. Existing comments become root comments without losing content.

- `GET /api/v1/posts/:postId/comments?limit=20&offset=0` returns only root comments.
- Add `parentId=<rootCommentId>` to fetch a page of replies. Lists are ordered oldest first by timestamp and ID. Pagination uses `{ hasMore, nextOffset }`.
- `POST /api/v1/posts/:postId/comments` accepts `{ content, replyToId? }`. Authentication is required. Content must contain 1–1000 trimmed characters. The server derives the root parent and tagged user from the target comment. Replies to replies remain children of the root. Cross-post targets are rejected.
- `PUT /api/v1/post-comments/:commentId/like` likes a comment; `DELETE` removes the caller's like. Both require authentication and return `{ data: { isLiked } }`. Repeated requests are idempotent.

List items include `parentId`, `replyCount`, `likeCount`, `isLiked` and `replyTo: { id, username, displayName } | null`, in addition to their existing content and author fields. The POST response retains the basic created-comment DTO; clients refetch list data after success.

Only published posts are readable. Guests can read replies and like counts but must sign in to reply or like. Names are structured links, never injected HTML or caller-supplied identity. Root deletion cascades to its replies; deleted reply targets clear the tag reference. Existing post comment counts include roots and replies.

The UI shows one indented level, paginated expand/collapse controls, and a cancellable reply tag beside the composer. Clicking Reply focuses the input. English and Vietnamese messages are in `commentThread`.
