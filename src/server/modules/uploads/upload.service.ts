import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, databaseError } from "@/server/shared/errors";
import type { MediaPost } from "@/lib/uploads";

type PostRow = { id: string; user_id: string; mime_type: string; storage_path: string; caption: string; created_at: string };
export function postDto(db: SupabaseClient, row: PostRow): MediaPost {
  return {
    id: row.id, userId: row.user_id, mediaType: row.mime_type.startsWith("video/") ? "video" : "image",
    mediaUrl: db.storage.from("posts").getPublicUrl(row.storage_path).data.publicUrl,
    caption: row.caption, createdAt: row.created_at,
  };
}
export async function createUpload(db: SupabaseClient, userId: string, input: { mimeType: string; size: number }) {
  const { data, error } = await db.from("media_posts").insert({ user_id: userId, mime_type: input.mimeType, size_bytes: input.size }).select("id,storage_path").single();
  if (error) databaseError(error);
  const result = await db.storage.from("posts").createSignedUploadUrl(data.storage_path, { upsert: false });
  if (result.error) throw new ApiError(503, "UPLOAD_UNAVAILABLE", "Unable to prepare the upload. Check the Storage migration and try again.");
  return { id: data.id, signedUrl: result.data.signedUrl };
}
export async function publishUpload(db: SupabaseClient, id: string, caption: string) {
  const { data, error } = await db.rpc("publish_media_post", { p_id: id, p_caption: caption });
  if (error?.code === "22023") throw new ApiError(400, "UPLOAD_INCOMPLETE", "The uploaded file is missing or does not match. Select the file again and retry.");
  if (error) databaseError(error);
  return postDto(db, data);
}
