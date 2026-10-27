import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { soundUploadSchema, type SoundDetails } from "@/lib/admin-sounds";
import { ApiError, databaseError } from "@/server/shared/errors";
import { soundDto, soundListSchema } from "./sound.service";

export async function listAdminSounds(db: SupabaseClient, input: z.infer<typeof soundListSchema>) {
  // Check the database role too, so a revoked admin's cached token cannot grant access.
  const permission = await db.rpc("is_app_admin");
  if (permission.error) databaseError(permission.error);
  if (!permission.data) throw new ApiError(403, "FORBIDDEN", "Admin access is required.");
  let query = db.from("sounds").select("id,title,artist,storage_path,duration_ms,is_active,created_at");
  if (input.q) query = query.ilike("search_text", `%${input.q.replace(/[\\%_]/g, "\\$&")}%`);
  const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(input.offset, input.offset + input.limit);
  if (error) databaseError(error);
  const hasMore = data.length > input.limit;
  return { data: data.slice(0, input.limit).map(row => ({ ...soundDto(db, row), isActive: row.is_active, createdAt: row.created_at })), pagination: { hasMore, nextOffset: hasMore ? input.offset + input.limit : null } };
}

export async function createSoundUpload(db: SupabaseClient, userId: string, input: z.infer<typeof soundUploadSchema>) {
  const { data, error } = await db.from("sound_uploads").insert({ user_id: userId, mime_type: input.mimeType, size_bytes: input.size }).select("id,storage_path").single();
  if (error) databaseError(error);
  const signed = await db.storage.from("sounds").createSignedUploadUrl(data.storage_path, { upsert: false });
  if (signed.error) throw new ApiError(503, "UPLOAD_UNAVAILABLE", "Unable to prepare the sound upload. Check your admin access and try again.");
  return { id: data.id, signedUrl: signed.data.signedUrl };
}

export async function completeSoundUpload(db: SupabaseClient, id: string, input: SoundDetails) {
  const { data, error } = await db.rpc("publish_admin_sound", { p_id: id, p_title: input.title, p_artist: input.artist, p_duration_ms: input.durationMs });
  if (error?.code === "22023") throw new ApiError(400, "UPLOAD_INCOMPLETE", "The sound file or its details are invalid. Select the file again and retry.");
  if (error) databaseError(error);
  return { ...soundDto(db, data), isActive: data.is_active, createdAt: data.created_at };
}
