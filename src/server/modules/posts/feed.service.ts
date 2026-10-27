import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { databaseError } from "@/server/shared/errors";
import { postDtos } from "../uploads/upload.service";
import { postSoundFields } from "@/lib/sounds";

export const feedSchema = z.object({
  feed: z.enum(["for-you", "following"]).default("for-you"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
}).strict();
const feedRow = z.object({
  ...postSoundFields,
  id: z.uuid(), user_id: z.uuid(), mime_type: z.string(), storage_path: z.string(), caption: z.string(), created_at: z.string(),
  author: z.object({ id: z.uuid(), username: z.string(), displayName: z.string(), avatarUrl: z.string().nullable() }),
});
export async function listVideoFeed(db: SupabaseClient, input: z.infer<typeof feedSchema>) {
  const { data, error } = await db.rpc("media_post_feed", { p_feed: input.feed, p_limit: input.limit + 1, p_offset: input.offset });
  if (error) databaseError(error);
  const rows = z.array(feedRow).parse(data);
  const hasMore = rows.length > input.limit;
  const page = rows.slice(0, input.limit);
  const posts = await postDtos(db, page);
  return {
    data: posts.map((post, index) => ({ ...post, author: page[index].author })),
    pagination: { hasMore, nextOffset: hasMore ? input.offset + input.limit : null },
  };
}
