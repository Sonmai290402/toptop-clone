# Post soundtracks

Apply migrations through `20261027000300_post_sounds.sql` with `npx supabase db push` on the intended linked project. This creates the `sounds` table, public `sounds` Storage bucket and validated publication RPC. Existing posts retain their original playback and have `soundtrack: null`. No sample tracks are inserted automatically.

## Add a track manually in Supabase

Admins can now use `/admin` to upload a file, enter its title/artist and detect duration automatically. See [Admin setup and API](./ADMIN.md). Manual Dashboard entry remains available.

1. Open **Storage → sounds → Upload files**. Upload audio you have permission to use. MP3 is recommended for browser compatibility; MP4 audio, Ogg and WAV are also accepted. The bucket limit is 20 MiB per file. This is a public bucket.
2. Copy the object's path **inside the bucket**, such as `demo/summer.mp3`. Do not paste the public URL, a local file path or the `sounds/` bucket prefix.
3. Open **Table Editor → public → sounds → Insert row** and fill in:

| Column | Example | Notes |
| --- | --- | --- |
| `title` | `Summer walk` | Required; 1–160 characters |
| `artist` | `Demo artist` | Required; defaults to Unknown artist |
| `storage_path` | `demo/summer.mp3` | Exact, case-sensitive object path |
| `duration_ms` | `45000` | Actual duration in milliseconds: 45 seconds × 1000 |
| `is_active` | `true` | Makes the sound available for selection and playback |
| `id` / `created_at` | Leave default | Automatically generated |
| `search_text` | Leave empty | Generated from title and artist |

4. Save, then open Upload → select media → **Add sound**. Search by title or artist. **Preview** reveals an audio player; press its Play button to listen. **Use** selects the track. Adjust Start, Duration and volumes, then press Play in the media preview to hear the mix.
5. Publish and check the post in For You. Audio is muted by default in the feed; use **Enable sound**.

Track duration is entered manually and must match the real file. The backend validates segment bounds against this value and checks that the Storage object exists. It does not decode audio to measure duration. The player reports a file that is shorter than the configured segment. Do not overwrite a referenced file with different audio or shorten its duration; add a new row/path instead so existing posts keep their chosen segments.

Set `is_active=false` to hide the track from the library and omit its soundtrack from subsequent post API responses. Cached pages must refetch to see this change. This does not revoke an already known public Storage URL. Referenced sound rows cannot be deleted while posts use them. Normal authenticated users have read-only access. Admins can add sounds through the validated admin upload flow after applying `20261027000400_admin_sound_uploads.sql`; they still cannot directly insert/update/delete sound rows through the public Data API. Dashboard edits use its privileged database access.

## API

### GET /api/v1/sounds

Public. Query: `q` (title or artist, max 100 characters), `limit` (1–50, default 20), `offset` (0–100000, default 0). Active tracks only, ordered by title and ID.

```json
{
  "data": [{
    "id": "00000000-0000-4000-8000-000000000010",
    "title": "Summer walk",
    "artist": "Demo artist",
    "durationMs": 45000,
    "audioUrl": "https://PROJECT.supabase.co/storage/v1/object/public/sounds/demo/summer.mp3"
  }],
  "pagination": { "hasMore": false, "nextOffset": null }
}
```

### GET /api/v1/sounds/:soundId

Public. Returns `{ "data": { ...sound } }`. Invalid UUID: 400. Missing/inactive sound: 404.

### POST /api/v1/uploads/:uploadId/complete

Authenticated, with the existing Origin requirement. The file upload flow is unchanged. Include an optional sound selection when completing the upload:

```json
{
  "caption": "An afternoon walk",
  "sound": {
    "soundId": "00000000-0000-4000-8000-000000000010",
    "startMs": 5000,
    "durationMs": 15000,
    "musicVolume": 0.7,
    "originalVolume": 0.2
  }
}
```

Omit `sound` or send null for original media only. Start must be nonnegative; duration must be 1000–3600000 ms for videos or 1000–30000 ms for photos; start + duration cannot exceed the track's duration. Volumes must be 0–1. Only sound IDs are accepted, never caller-provided audio URLs or metadata. The selected track must be active and its file must exist. The upload must belong to the authenticated user. Invalid selection returns `400 INVALID_SOUND`; an invalid JSON shape returns `400 INVALID_INPUT`. A missing/mismatched uploaded media file returns `400 UPLOAD_INCOMPLETE`.

Publishing and saving sound settings occur in one transaction. Retrying a published upload returns its existing caption and selection, without overwriting them. There is no soundtrack editing endpoint in this version.

Post detail, feed, user posts, recent uploads and liked/saved APIs now return `soundtrack: null` or:

```json
{
  "soundId": "00000000-0000-4000-8000-000000000010",
  "startMs": 5000,
  "durationMs": 15000,
  "musicVolume": 0.7,
  "originalVolume": 0.2,
  "sound": {
    "id": "00000000-0000-4000-8000-000000000010",
    "title": "Summer walk",
    "artist": "Demo artist",
    "durationMs": 45000,
    "audioUrl": "https://PROJECT.supabase.co/storage/v1/object/public/sounds/demo/summer.mp3"
  }
}
```

Sound metadata is fetched once per response page, not once per post.

## Playback behavior and limits

- This version plays separate media and audio files; it does not generate a mixed downloadable video.
- Video time is the master clock. Music starts at the selected offset when video time is zero, follows seek/pause/playback rate, pauses during buffering and resynchronizes during playback. When the selected segment ends, music stops while any remaining video continues. Looping the video restarts the music segment.
- Photo posts loop the selected segment. The Upload UI allows up to 30 seconds for photos. Videos default to the shorter of the video length and the track length, with no one-minute cap. The backend enforces the 30-second photo limit and the track boundaries (tracks support up to one hour); it does not decode uploaded videos to validate their duration. Playback stops with the video.
- Viewer volume multiplies both creator volume settings; mute affects both tracks. Music posts use shared playback controls because native video controls only govern the video element.
- Leaving the active feed item, scrolling a preview out of view, starting another player or hiding the page stops playback. Browser autoplay restrictions can require pressing Play/Enable sound. Broken audio leaves original media viewable with an error message.
- Profile grid thumbnails remain silent video previews/static images. Full soundtrack playback is in Feed and Upload previews/recent uploads.
- HTML media element volume behavior depends on the browser/device; some mobile browsers use system volume. Separate-track playback is best-effort synchronization, not sample-accurate mixing. A future processing worker can produce a single mixed file for consistent playback/export.

Main components: `SoundPicker` handles selection and mix settings; `MediaPlayback` coordinates media elements; `VideoPlayer` composes feed metadata and interactions around it.

