import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sound } from "@/lib/sounds";
import { ApiError, databaseError } from "@/server/shared/errors";

export const soundListSchema = z.object({
  q: z.string().trim().max(100).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
}).strict();
const columns = "id,title,artist,storage_path,duration_ms";
type SoundRow = { id: string; title: string; artist: string; storage_path: string; duration_ms: number };
export function soundDto(db: SupabaseClient, row: SoundRow): Sound {
  return { id: row.id, title: row.title, artist: row.artist, durationMs: row.duration_ms, audioUrl: db.storage.from("sounds").getPublicUrl(row.storage_path).data.publicUrl };
}
export async function listSounds(db: SupabaseClient, input: z.infer<typeof soundListSchema>) {
  let query = db.from("sounds").select(columns).eq("is_active", true);
  // Search one generated column, keeping user input out of PostgREST filter syntax.
  if (input.q) query = query.ilike("search_text", `%${input.q.replace(/[\\%_]/g, "\\$&")}%`);
  const { data, error } = await query.order("title").order("id").range(input.offset, input.offset + input.limit);
  if (error) databaseError(error);
  const hasMore = data.length > input.limit;
  return { data: data.slice(0, input.limit).map(row => soundDto(db, row)), pagination: { hasMore, nextOffset: hasMore ? input.offset + input.limit : null } };
}
export async function getSound(db: SupabaseClient, id: string) {
  const { data, error } = await db.from("sounds").select(columns).eq("id", id).eq("is_active", true).maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError(404, "SOUND_NOT_FOUND", "Sound not found or unavailable.");
  return soundDto(db, data);
}
export async function getSoundMap(db: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, Sound>();
  const { data, error } = await db.from("sounds").select(columns).in("id", [...new Set(ids)]).eq("is_active", true);
  if (error) databaseError(error);
  return new Map(data.map(row => [row.id, soundDto(db, row)]));
}
