# Media post reads and profile grid

## For You and Following

Apply migrations through `20261027000100_mixed_media_feed.sql` before using the mixed feeds (`npx supabase db push` for a linked project). This adds `media_post_feed`; the previous video-only RPC remains available for compatibility.
`GET /api/v1/posts/feed?feed=for-you&limit=10&offset=0` returns published videos and images from `media_posts`, newest first. For You currently uses chronological ordering, not personalized recommendations.
Use `feed=following` for published posts by accounts the current user follows. Following requires a valid session (401 otherwise); its database function also enforces authentication. Pending uploads are excluded before pagination. `limit` is 1–50, `offset` is 0–100000.

The response uses `{ data: [...], pagination: { hasMore, nextOffset } }`. Each post includes `author: { id, username, displayName, avatarUrl }`. `GET /api/v1/posts/:postId` also includes this author information.

Both feed pages use `mediaType` (`video` or `image`) to render each post, with author profiles, captions and dates. Images fit their natural aspect ratio without video controls; only the visible video auto-plays. Both types support comments, likes, saves and follows; see [Post interactions](./POST-INTERACTIONS.md). Shared volume, scrolling and the existing player layout are preserved. The legacy `/videos` API remains separate.

`ExpandableCaption` in `src/components/common/ExpandableCaption.tsx` is shared by Upload cards and the feed player. Pass `text` and optionally `lines` (default 2). The component shows See all/See less only when the caption exceeds the collapsed height, preserves line breaks and wraps long words. Expanded content scrolls within a bounded height; `expandedClassName` customizes this limit. Short captions have no toggle. Upload's editing textarea is unchanged.

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

Profile resolves the route username to a profile UUID, then loads that profile's published images and videos without a mediaType filter through TanStack Query. The Posts tab retains the original 3:4 grid cards, without native controls or visible captions. Images use static thumbnails; videos keep muted hover previews and click-to-play. Latest/oldest ordering and load-more apply to both types. Saved/Liked tabs load private mixed-media collections on the current user's own Profile after applying `20261027000200_mixed_profile_collections.sql`. Popular sorting, pin badges and view counts remain commented out. Upload completion invalidates post queries. Profile pages still require login; published post read APIs are public.
