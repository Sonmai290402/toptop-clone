# User profile API

## Avatar upload

Apply migrations through `20261104000300_avatar_size_limit.sql` before uploading avatars. JPEG, PNG and WebP files up to 10 MB are accepted without resizing or compression.

`POST /api/v1/me/avatar` accepts JSON { mimeType, size } and returns { data: { path, signedUrl } }. Upload the file directly to signedUrl with PUT and its Content-Type. Then call `PATCH /api/v1/me/avatar` with JSON { path } to validate the stored file and update the profile. Both API endpoints require authentication; the completion endpoint only accepts paths owned by the current user. It returns { data: ProfileDto }. File content bypasses the Next.js request body. Failed or abandoned uploads may remain in Storage; previous avatars are retained.

The avatar dialog uses a local object URL for preview. Selecting a file or cancelling sends no upload/update request. Save sends the file and refreshes profile, session and post queries after success. Other users' avatars are view-only. Editing name/bio does not send an avatar URL.

## Endpoints

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/users/:userId` | Optional | Public profile by UUID |
| GET | `/api/v1/users/by-username/:username` | Optional | Public profile by username, optionally prefixed with `@` |
| GET | `/api/v1/me` | Required | Current user's profile |

The ID endpoint is new. The username and current-user endpoints reuse the existing backend.
No migration is required. These endpoints return profile data, not the user's videos.

```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000000001",
    "username": "alice",
    "displayName": "Alice",
    "avatarUrl": null,
    "bio": "Hello!",
    "createdAt": "2026-10-23T00:00:00Z",
    "followerCount": 12,
    "followingCount": 5,
    "likeCount": 40,
    "isFollowing": false
  }
}
```

Counts remain numbers. `isFollowing` describes the current viewer's relationship to
the requested user, and is false for guests. Email, role and authentication tokens
are excluded. Invalid input returns 400; missing users return 404 `USER_NOT_FOUND`;
`/me` without authentication returns 401. Responses use `private, no-store` HTTP caching.

## Client functions

`src/lib/api/users.api.ts` exports `getUserById`, `getUserByUsername`, and
`getMyProfile`. Each accepts an optional AbortSignal. Username inputs are trimmed,
lowercased and stripped of one leading `@` before URL encoding.

## React hooks

`src/hooks/queries/useProfile.ts` exports:

- `useProfile(username)`: for a profile route such as `/@alice`.
- `useUser(userId)`: for places that already have a UUID, such as a comment author.
- `useMyProfile()`: enabled only after the current session is authenticated.

```tsx
"use client";

import { useProfile } from "@/hooks/queries/useProfile";

export function ProfileSummary({ username }: { username: string }) {
  const { data: profile, isPending, error } = useProfile(username);

  if (isPending) return <p>Loading profile...</p>;
  if (error) return <p role="alert">{error.message}</p>;
  if (!profile) return null;

  return <h1>{profile.displayName} (@{profile.username})</h1>;
}
```

Hooks require the existing QueryProvider and AuthProvider. Query keys include the
viewer ID to isolate personalized `isFollowing` values. Undefined/empty identifiers
disable the request; a disabled query may still have `isPending: true`.
For `useMyProfile`, handle the guest state with `useAuth` before showing a loader.
When integrating follow mutations later, invalidate the affected `users` queries.

The existing Profile page still uses mock data. These helpers do not fetch anything
until a component uses them. Use `ProfileDto` directly instead of casting to the
older UI `UserData` type, whose field names differ.
