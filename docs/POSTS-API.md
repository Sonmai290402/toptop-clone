# Media post reads and profile grid

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

Profile resolves the route username to a profile UUID, then loads that profile's videos with `mediaType=video` through TanStack Query. It reuses the original VideoGrid/VideoCard layout with muted hover previews and click-to-play, without native controls or visible captions. Latest/oldest ordering and load-more remain available. Saved/Liked tabs, Popular sorting, pin badges and view counts are commented out until their data is available. Upload completion invalidates post queries. Profile pages still require login; published post read APIs are public.
