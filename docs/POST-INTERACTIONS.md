# Post comments, likes, saves and follows

Apply `20261026000500_media_interactions.sql` after the media feed migrations. The new `post_comments`, `post_likes` and `post_saves` tables reference `media_posts`. Legacy `comments`, `video_likes` and `video_saves` are unchanged. No demo comments are copied into real posts. Follow uses the existing `follows` table.

All responses use `{ "data": ... }`. Mutations require authentication. Cookie-based mutations require an Origin matching APP_URL; browser fetch sends it automatically. Like/save and follow operations use PUT to enable and DELETE to disable, never a non-idempotent toggle endpoint.

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/api/v1/posts/:postId/interactions` | Public counts plus the current viewer's like/save/follow state |
| GET | `/api/v1/posts/:postId/comments?limit=20&offset=0` | Published post comments, newest first |
| POST | `/api/v1/posts/:postId/comments` | Create comment, HTTP 201; JSON `{ "content": "Hello!" }` |
| PUT / DELETE | `/api/v1/posts/:postId/like` | Like/unlike and return updated interaction state |
| PUT / DELETE | `/api/v1/posts/:postId/save` | Save/unsave and return updated interaction state |
| PUT / DELETE | `/api/v1/users/:userId/follow` | Follow/unfollow; returns `isFollowing`, `followerCount` |
| GET | `/api/v1/me/liked-posts?limit=20&offset=0` | Current user's liked images and videos |
| GET | `/api/v1/me/saved-posts?limit=20&offset=0` | Current user's saved images and videos |

Interaction state is `{ "likeCount": 0, "commentCount": 0, "isLiked": false, "isSaved": false, "isFollowing": false }`. Anonymous reads return false for viewer-specific fields. A missing or unpublished post returns 404.

Comment DTO: `{ "id": "uuid", "postId": "uuid", "content": "Hello!", "createdAt": "ISO timestamp", "author": { "id": "uuid", "username": "name", "displayName": "Name", "avatarUrl": null } }`.

Comments are trimmed, must contain 1–1000 characters, and are rendered as plain text. The server derives author ID from authentication; extra input fields are rejected. POST is not retried automatically. Like/save uniqueness is enforced by `(user_id, post_id)`. RLS prevents spoofing authors, writing to pending posts, inspecting another user's saved list or deleting another user's interactions. Self-follow is rejected by the existing follow service.

List endpoints accept `limit` 1–50 and `offset` 0–100000. Lists return `pagination: { hasMore, nextOffset }`; a null nextOffset ends pagination. Apply `20261027000200_mixed_profile_collections.sql` to include both published images and videos in liked/saved collections, sorted by post creation time. Pending posts and other users' collections remain excluded. Offset pagination may shift when content changes; the client resets comment pages after posting and deduplicates IDs.

The feed loads comments and interaction state for the visible post. Guests can read and are prompted to sign in when interacting. Submitting a comment refreshes that post's comments/count only; text is retained after errors. Enter submits, Shift+Enter adds a new line. Like/save buttons show persisted state and disable while sending; errors are visible. Follow state refreshes across feed/Profile and Following reloads after a follow change. The user's own Profile exposes Saved/Liked tabs using the existing video grid. Private lists are never exposed on another user's Profile.

Comment replies, comment likes, comment editing/deletion and realtime updates are outside this implementation. Profile's legacy aggregate likeCount still refers to the separate videos table; post like counts are available through the post interaction endpoint.
