import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, databaseError } from "@/server/shared/errors";
import type { MediaPost } from "@/lib/uploads";
import type { Sound, SoundSelection } from "@/lib/sounds";
import { getSoundMap } from "../sounds/sound.service";

type PostRow = { id: string; user_id: string; mime_type: string; storage_path: string; caption: string; created_at: string; sound_id?: string | null; sound_start_ms?: number; sound_duration_ms?: number | null; music_volume?: number; original_volume?: number };
export function postDto(db: SupabaseClient, row: PostRow, sound?: Sound): MediaPost {
  return {
    id: row.id, userId: row.user_id, mediaType: row.mime_type.startsWith("video/") ? "video" : "image",
    mediaUrl: db.storage.from("posts").getPublicUrl(row.storage_path).data.publicUrl,
    caption: row.caption, createdAt: row.created_at,
    soundtrack: sound && row.sound_duration_ms ? { sound, soundId: sound.id, startMs: row.sound_start_ms ?? 0, durationMs: row.sound_duration_ms, musicVolume: row.music_volume ?? 1, originalVolume: row.original_volume ?? 1 } : null,
  };
}
export async function postDtos(db: SupabaseClient, rows: PostRow[]) {
  const sounds = await getSoundMap(db, rows.flatMap(row => row.sound_id ? [row.sound_id] : []));
  return rows.map(row => postDto(db, row, sounds.get(row.sound_id ?? "")));
}
export async function createUpload(db: SupabaseClient, userId: string, input: { mimeType: string; size: number }) {
  const { data, error } = await db.from("media_posts").insert({ user_id: userId, mime_type: input.mimeType, size_bytes: input.size }).select("id,storage_path").single();
  if (error) databaseError(error);
  const result = await db.storage.from("posts").createSignedUploadUrl(data.storage_path, { upsert: false });
  if (result.error) throw new ApiError(503, "UPLOAD_UNAVAILABLE", "Unable to prepare the upload. Check the Storage migration and try again.");
  return { id: data.id, signedUrl: result.data.signedUrl };
}
export async function publishUpload(db: SupabaseClient, id: string, caption: string, sound?: SoundSelection | null) {
  const { data, error } = await db.rpc("publish_media_post_with_sound", {
    p_id: id, p_caption: caption, p_sound_id: sound?.soundId ?? null,
    p_start_ms: sound?.startMs ?? 0, p_duration_ms: sound?.durationMs ?? null,
    p_music_volume: sound?.musicVolume ?? 1, p_original_volume: sound?.originalVolume ?? 1,
  });
  if (error?.code === "P0001") throw new ApiError(400, "INVALID_SOUND", "The sound is unavailable or the selected segment is invalid. Choose a sound again.");
  if (error?.code === "22023") throw new ApiError(400, "UPLOAD_INCOMPLETE", "The uploaded file is missing or does not match. Select the file again and retry.");
  if (error) databaseError(error);
  return (await postDtos(db, [data]))[0];
}
