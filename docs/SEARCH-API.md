# User search

Apply `20261105000100_user_search.sql` with `npx supabase db push` before using this feature.

`GET /api/v1/users/search?q=alice&limit=20&offset=0` is public. `q` is required, trimmed, at most 100 characters; one leading `@` is removed. `limit` is 1–50 (default 20); `offset` is 0–10000 (default 0). Invalid parameters return 400.

Matching uses a case-insensitive literal substring of username or display name, preserving accents. Percent signs and underscores are literal characters, not wildcards. Exact usernames rank first, then username and ID provide deterministic order. This initial implementation scans names; consider trigram indexes for larger datasets.

Response: `{ data: [{ id, username, displayName, avatarUrl, bio }], pagination: { hasMore, nextOffset } }`. No email or role is returned. Empty results return an empty data array and null nextOffset. Offset pages may shift if profiles change between requests.

The sidebar submits on Enter or the search icon. `/search?q=...` supports direct links and browser history, uses TanStack Query with cancellation, and loads 20 results per page. Selecting a result opens `/@username`. Existing profile-route authentication rules still apply. Search strings and result UI support English and Vietnamese; user-generated names and bios are not translated.
