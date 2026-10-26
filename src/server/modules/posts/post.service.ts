import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, databaseError } from "@/server/shared/errors";
import { postDto } from "../uploads/upload.service";
import { getProfile } from "../users/user.service";

export const postListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  sort: z.enum(["latest", "oldest"]).default("latest"),
  mediaType: z.enum(["video", "image"]).optional(),
}).strict();

const columns = "id,user_id,mime_type,storage_path,caption,created_at";
export async function listPosts(db: SupabaseClient, input: z.infer<typeof postListSchema>, userId?: string) {
  let query = db.from("media_posts").select(columns).not("published_at", "is", null);
  if (userId) query = query.eq("user_id", userId);
  if (input.mediaType) query = query.like("mime_type", `${input.mediaType}/%`);
  const ascending = input.sort === "oldest";
  const { data, error } = await query.order("created_at", { ascending }).order("id", { ascending }).range(input.offset, input.offset + input.limit);
  if (error) databaseError(error);
  const hasMore = data.length > input.limit;
  return { data: data.slice(0, input.limit).map(row => postDto(db, row)), pagination: { hasMore, nextOffset: hasMore ? input.offset + input.limit : null } };
}

export async function getPost(db: SupabaseClient, id: string) {
  const { data, error } = await db.from("media_posts").select(columns).eq("id", id).not("published_at", "is", null).maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError(404, "POST_NOT_FOUND", "Post not found.");
  const profile = await getProfile(db, data.user_id);
  const author = { id: profile.id, username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl };
  return { ...postDto(db, data), author };
}
