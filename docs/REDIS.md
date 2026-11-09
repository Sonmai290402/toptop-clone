# Redis caching and rate limiting

Supabase remains the source of truth. Redis caches selected public discovery queries and provides distributed API rate limits. Existing successful API response shapes and client UI are unchanged.

| Query | Cached scope | TTL |
| --- | --- | --- |
| `GET /api/v1/sounds` | Empty search, offset 0, limit 20 | 60 seconds |
| `GET /api/v1/posts/feed` | For You, no cursor, limit 10 | 30 seconds |
| `GET /api/v1/users/search` | Offset 0, limit 20, keyed by a hash of the validated query | 30 seconds |

For You caches validated public database rows, including public author information. Soundtrack availability is resolved from Supabase on every request. This feed is currently identical for all viewers; if personalized recommendations or visibility rules are introduced, this shared cache must be revised before enabling them. Following, later feed pages, post details, profiles, comments, viewer interaction state, sessions and admin roles remain live. Media files are never stored in Redis.

## Configuration

Set these server-only variables in `.env.local`:

```dotenv
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-rest-token
REDIS_KEY_PREFIX=toptop:development
REDIS_CACHE_ENABLED=true
REDIS_RATE_LIMIT_ENABLED=true
```

Use a distinct prefix for every environment and Supabase project. In Vercel, configure the variables separately for Production and Preview, using distinct prefixes, then redeploy. Never use `NEXT_PUBLIC_` for Redis credentials or commit credentials. No database migration is needed.

Run `pnpm check:redis` to test SET, GET and DELETE using a unique diagnostic key with a 30-second expiry. This command reads `.env.local` and does not print credentials. Restart the development server after changing environment variables.

## Behavior

- Cache key: `<REDIS_KEY_PREFIX>:sounds:list:v1:first-page:20`.
- Expiration: 60 seconds after each cache fill; hits do not extend it.
- A cache miss loads Supabase and awaits the Redis write.
- Redis requests have an 800 ms timeout, with retries disabled. Read failures bypass the write and fall back to Supabase; write failures return the successful database result. Database errors are still returned normally.
- Successful admin sound publication deletes this key. Failed invalidation is logged and falls back to expiry. A simultaneous cache fill can race with invalidation, so the list is eventually consistent within the TTL.
- Manual edits in Supabase become visible after expiry. Delete only this cache key in Upstash if an immediate refresh is needed.
- Sound searches, other page sizes/pages, admin lists, sound detail checks and post sound validation always query Supabase.
- Discovery keys use `<prefix>:discovery:v1:<generation>:<query>`. Post publication and profile updates (including avatar updates) rotate the generation. An old in-flight query can only populate the old generation, so it cannot overwrite the new one. Old entries expire automatically; no wildcard key scans or database flushes are used.
- Discovery cache reads require a generation lookup plus a cache lookup. Compare latency and Upstash command usage before broadening cache coverage. Query text is hashed rather than stored in keys.
- New signups and manual Supabase changes appear in discovery after the 30-second server TTL. TanStack Query can keep an already displayed result longer according to its own stale/refetch settings.
- Cache entries are schema-validated and failed database requests are never cached. Cache invalidation failure does not undo a successful database mutation.

Missing configuration or `REDIS_CACHE_ENABLED=false` disables application caching. The diagnostic command can still test connectivity when application caching is disabled.

## Rate limits

The API wrapper applies fixed-window limits atomically through a Redis Lua script. Counters are shared across Vercel instances and expire automatically.

| Action group | Limit | Identity |
| --- | --- | --- |
| Email sign-in and sign-up combined | 15 / 15 minutes | IP |
| Password reset and confirmation resend combined | 5 / 15 minutes | IP |
| User search | 60 / minute | Verified user, otherwise IP |
| Post/video comments and replies | 15 / minute | Verified user |
| Like, save, follow and undo actions combined | 120 / minute | Verified user |
| Upload preparation/completion and avatar changes combined | 30 / 10 minutes | Verified user |
| Other non-auth mutations | 60 / minute | Verified user |

Counters are per action group, not per target, so switching post IDs does not bypass them. Upload preparation and completion each count as a request. Failed attempts count too. A fixed window allows bursts near adjacent window boundaries; this is a basic application abuse control, not DDoS protection or a replacement for Supabase Auth limits/CAPTCHA.

Vercel's overwritten `x-forwarded-for` header is used only when `VERCEL=1`. Outside Vercel, unverified callers share an `ip:unknown` bucket; arbitrary proxy headers are not trusted. Local auth testing therefore shares a counter. If moving to another host, implement its trusted proxy contract before relying on IP limits. User IDs and IP addresses are HMAC-hashed in Redis keys. Prefixes must differ between local, preview and production environments.

Sign-out, OAuth callbacks, session reads and normal feed reads are not throttled here. Invalid origins and protected requests without a valid session are rejected before normal mutation counters are consumed. Public email-auth limits run before Supabase Auth requests.

On excess requests the API returns:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45
Content-Type: application/json

{"error":{"code":"RATE_LIMITED","message":"Too many requests. Please try again later."}}
```

On Redis failure, sign-in/sign-up, email actions and uploads return `503 RATE_LIMIT_UNAVAILABLE`. Other rate-limited operations continue to Supabase. Missing Redis configuration or explicit `REDIS_RATE_LIMIT_ENABLED=false` disables these limits; cache and rate-limit switches are independent. Both switches default to enabled when configuration is present. The existing query client does not retry 429 responses, and mutations do not automatically retry.

References: [Vercel request headers](https://vercel.com/docs/headers/request-headers), [Upstash EVAL](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval).

## Verification

1. Run `pnpm check:redis`.
2. Start the app and request `GET /api/v1/sounds?limit=20&offset=0`.
3. Inspect the namespaced key in Upstash: it should contain the response with a TTL of at most 60 seconds.
4. Repeat the request within the TTL; Redis should serve it without another sound-list database query.
5. Publish a sound through the admin UI; the cache key should be removed and recreated on the next request.
6. Disable caching and restart to compare API latency under the same workload. Redis saves database reads; it does not improve video encoding, media delivery or frontend rendering.

Backend tests cover cache hits, malformed entries, fallback, invalidation and database error propagation. Live connection diagnostics alone do not verify the full browser upload flow.

Additional checks:

- Repeat the default For You/search request and inspect the discovery keys in Upstash. Change the query to verify key separation; Following must not create shared feed entries.
- Publish a post or update a profile through the API and verify that the discovery generation changes. Existing displayed client data still follows TanStack Query invalidation/refetch behavior.
- In development, exceed a limit and verify status 429 and `Retry-After`. Wait for expiry, or delete only the relevant namespaced development counter to reset it. Never flush the shared Redis database.
- Run `pnpm test:backend` for cache-generation race tests, identity/policy isolation, limit boundaries and Redis failure behavior.
