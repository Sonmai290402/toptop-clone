# Media post reads and profile grid

## For You and Following

Apply `20261026000400_media_video_feed.sql` before using the real feeds.
`GET /api/v1/posts/feed?feed=for-you&limit=10&offset=0` returns published videos from all creators, newest first. For You currently uses chronological ordering, not personalized recommendations.
Use `feed=following` for published videos by accounts the current user follows. Following requires a valid session (401 otherwise); its database function also enforces authentication. Images and pending uploads are excluded before pagination. `limit` is 1–50, `offset` is 0–100000.

The response uses `{ data: [...], pagination: { hasMore, nextOffset } }`. Each post includes `author: { id, username, displayName, avatarUrl }`. `GET /api/v1/posts/:postId` also includes this author information.

Both feed pages use real uploaded videos, author profiles, captions and dates, auto-play the visible video and load more on scroll. Shared volume and the existing player layout are preserved. Comments, likes, saves and follows now use real post/user relationships; see [Post interactions](./POST-INTERACTIONS.md). The legacy `/videos` API remains separate.

Apply `supabase/migrations/20261026000200_public_posts.sql` after the upload migration, using `npx supabase db push` for a linked project or the SQL Editor. This adds read access for published posts and indexes; existing posts are preserved. Unpublished uploads remain visible only to their owner at the database level and are excluded from every endpoint below, including `/me/posts`.

| Method | Endpoint | Purpose | Authentication |
| --- | --- | --- | --- |
| GET | `/api/v1/posts` | All published media posts | Optional |
| GET | `/api/v1/posts/:postId` | One published post; 404 for missing/unpublished IDs | Optional |
| GET | `/api/v1/users/:userId/posts` | Published posts by the specified profile UUID | Optional |
| GET | `/api/v1/me/posts` | Published posts by the current authenticated user | Required |

All list endpoints accept `limit` (1–50, default 20), `offset` (0–100000, default 0), and `sort` (`latest` or `oldest`, default `latest`). Unknown query parameters and invalid IDs return 400. A user without posts (including an unknown valid user UUID) returns an empty list. `/me/posts` resolves the user from the session and does not accept a caller-supplied user ID.

Example: `GET /api/v1/users/00000000-0000-4000-8000-000000000001/posts?limit=20&offset=0&sort=latest`

```json
{
  "data": [{
    "id": "10000000-0000-4000-8000-000000000001",
    "userId": "00000000-0000-4000-8000-000000000001",
    "mediaType": "image",
    "mediaUrl": "https://PROJECT.supabase.co/storage/v1/object/public/posts/USER/POST.jpg",
    "caption": "My photo",
    "createdAt": "2026-10-26T10:00:00Z"
  }],
  "pagination": { "hasMore": false, "nextOffset": null }
}
```

The detail endpoint returns `{ "data": { ...post } }`. Lists use creation time plus ID for deterministic ordering. Offset pagination can shift if posts are inserted/deleted between requests; refresh to obtain the latest sequence. This is not a snapshot feed.

List endpoints also accept optional `mediaType=video` or `mediaType=image`; filtering happens before pagination.

Profile resolves the route username to a profile UUID, then loads that profile's videos with `mediaType=video` through TanStack Query. It reuses the original VideoGrid/VideoCard layout with muted hover previews and click-to-play, without native controls or visible captions. Latest/oldest ordering and load-more remain available. Saved/Liked tabs now load private video collections on the current user's own Profile. Popular sorting, pin badges and view counts remain commented out. Upload completion invalidates post queries. Profile pages still require login; published post read APIs are public.
