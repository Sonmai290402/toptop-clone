import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, databaseError } from "@/server/shared/errors";
import { postDto } from "../uploads/upload.service";

export const commentInput = z.object({ content: z.string().trim().min(1).max(1000) }).strict();
export const interactionPage = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20), offset: z.coerce.number().int().min(0).max(100000).default(0) }).strict();
const stateSchema = z.object({ likeCount: z.number(), commentCount: z.number(), isLiked: z.boolean(), isSaved: z.boolean(), isFollowing: z.boolean() });
const commentRow = z.object({ id: z.uuid(), post_id: z.uuid(), content: z.string(), created_at: z.string(), author: z.object({ id: z.uuid(), username: z.string(), display_name: z.string(), avatar_url: z.string().nullable() }) });
const commentColumns = "id,post_id,content,created_at,author:profiles!post_comments_author_id_fkey(id,username,display_name,avatar_url)";
function commentDto(row: z.infer<typeof commentRow>) {
  return { id: row.id, postId: row.post_id, content: row.content, createdAt: row.created_at, author: { id: row.author.id, username: row.author.username, displayName: row.author.display_name, avatarUrl: row.author.avatar_url } };
}
export async function getInteractionState(db: SupabaseClient, postId: string) {
  const { data, error } = await db.rpc("post_interaction_state", { p_post_id: postId });
  if (error) databaseError(error);
  if (!data) throw new ApiError(404, "POST_NOT_FOUND", "Post not found.");
  return stateSchema.parse(data);
}
export async function setPostInteraction(db: SupabaseClient, postId: string, userId: string, kind: "like" | "save", active: boolean) {
  await getInteractionState(db, postId);
  const table = kind === "like" ? "post_likes" : "post_saves";
  const result = active ? await db.from(table).insert({ user_id: userId, post_id: postId }) : await db.from(table).delete().eq("user_id", userId).eq("post_id", postId);
  if (result.error && !(active && result.error.code === "23505")) databaseError(result.error);
  return getInteractionState(db, postId);
}
export async function listPostComments(db: SupabaseClient, postId: string, input: z.infer<typeof interactionPage>) {
  await getInteractionState(db, postId);
  const { data, error } = await db.from("post_comments").select(commentColumns).eq("post_id", postId).order("created_at", { ascending: false }).order("id", { ascending: false }).range(input.offset, input.offset + input.limit);
  if (error) databaseError(error);
  const rows = z.array(commentRow).parse(data);
  return { data: rows.slice(0, input.limit).map(commentDto), pagination: { hasMore: rows.length > input.limit, nextOffset: rows.length > input.limit ? input.offset + input.limit : null } };
}
export async function createPostComment(db: SupabaseClient, postId: string, userId: string, content: string) {
  await getInteractionState(db, postId);
  const { data, error } = await db.from("post_comments").insert({ post_id: postId, author_id: userId, content }).select(commentColumns).single();
  if (error) databaseError(error);
  return commentDto(commentRow.parse(data));
}
export async function listInteractedPosts(db: SupabaseClient, kind: "liked" | "saved", input: z.infer<typeof interactionPage>) {
  const { data, error } = await db.rpc("my_interacted_posts", { p_kind: kind, p_limit: input.limit + 1, p_offset: input.offset });
  if (error) databaseError(error);
  const rows = z.array(z.object({ id: z.uuid(), user_id: z.uuid(), mime_type: z.string(), storage_path: z.string(), caption: z.string(), created_at: z.string() })).parse(data);
  return { data: rows.slice(0, input.limit).map(row => postDto(db, row)), pagination: { hasMore: rows.length > input.limit, nextOffset: rows.length > input.limit ? input.offset + input.limit : null } };
}
