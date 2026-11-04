import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { databaseError } from "@/server/shared/errors";
import { postDtos } from "../uploads/upload.service";
import { postSoundFields } from "@/lib/sounds";
import { decodeCursor, encodeCursor } from "@/server/shared/pagination";

export const feedSchema = z.object({
  feed: z.enum(["for-you", "following"]).default("for-you"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.string().max(2048).optional(),
}).strict();
const feedRow = z.object({
  ...postSoundFields,
  id: z.uuid(), user_id: z.uuid(), mime_type: z.string(), storage_path: z.string(), caption: z.string(), created_at: z.string(),
  author: z.object({ id: z.uuid(), username: z.string(), displayName: z.string(), avatarUrl: z.string().nullable() }),
});
export async function listVideoFeed(db: SupabaseClient, input: z.infer<typeof feedSchema>) {
  const context = `media-feed:${input.feed}`;
  const cursor = decodeCursor(input.cursor, context, z.object({ createdAt: z.iso.datetime({ offset: true }), id: z.uuid() }).strict());
  const { data, error } = await db.rpc("media_post_feed", {
    p_feed: input.feed, p_limit: input.limit + 1,
    p_before_created_at: cursor?.createdAt ?? null, p_before_id: cursor?.id ?? null,
  });
  if (error) databaseError(error);
  const rows = z.array(feedRow).parse(data);
  const hasMore = rows.length > input.limit;
  const page = rows.slice(0, input.limit);
  const posts = await postDtos(db, page);
  return {
    data: posts.map((post, index) => ({ ...post, author: page[index].author })),
    pagination: { hasMore, nextCursor: hasMore ? encodeCursor(context, { createdAt: page[page.length - 1].created_at, id: page[page.length - 1].id }) : null },
  };
}
