import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ApiError, databaseError } from "../../shared/errors";
import { decodeCursor, paginate } from "../../shared/pagination";
import { commentDto } from "../contracts";
import { getVideo } from "../videos/video.service";
import { commentCursor } from "./comment.schema";

export async function listComments(db: SupabaseClient, videoId: string, query: { limit: number; cursor?: string }) {
  await getVideo(db, videoId);
  const context = `comments:${videoId}`;
  const cursor = decodeCursor(query.cursor, context, commentCursor);
  const { data, error } = await db.rpc("api_comment_page", { p_video_id: videoId, p_limit: query.limit + 1, p_cursor: cursor });
  if (error) databaseError(error);
  return paginate(z.array(commentDto.extend({ cursorKey: commentCursor })).parse(data), query.limit, context);
}

export async function createComment(db: SupabaseClient, videoId: string, userId: string, content: string) {
  await getVideo(db, videoId);
  const { data, error } = await db.from("comments").insert({ video_id: videoId, author_id: userId, content }).select("id").single();
  if (error) databaseError(error);
  const result = await db.rpc("api_comment", { p_comment_id: data.id });
  if (result.error) databaseError(result.error);
  return commentDto.parse(result.data);
}

export async function deleteComment(db: SupabaseClient, id: string, userId: string) {
  const { data, error } = await db.from("comments").select("author_id").eq("id", id).maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError(404, "COMMENT_NOT_FOUND", "Bình luận không tồn tại.");
  if (data.author_id !== userId) throw new ApiError(403, "FORBIDDEN", "Chỉ được xóa bình luận của chính mình.");
  const result = await db.from("comments").delete().eq("id", id).eq("author_id", userId);
  if (result.error) databaseError(result.error);
}
