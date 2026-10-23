import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ApiError, databaseError } from "../../shared/errors";
import { decodeCursor, paginate } from "../../shared/pagination";
import { videoDto } from "../contracts";
import { videoCursor } from "./video.schema";

export async function getVideo(db: SupabaseClient, id: string) {
  const { data, error } = await db.rpc("api_video", { p_video_id: id });
  if (error) databaseError(error);
  if (!data) throw new ApiError(404, "VIDEO_NOT_FOUND", "Video không tồn tại.");
  return videoDto.parse(data);
}

export async function listVideos(db: SupabaseClient, options: {
  scope: "all" | "following" | "author" | "liked" | "saved";
  authorId?: string; viewerId?: string;
  sort: "latest" | "oldest" | "popular"; limit: number; cursor?: string;
}) {
  const context = `videos:${options.scope}:${options.authorId ?? ""}:${options.sort}:${options.viewerId ?? "guest"}`;
  const cursor = decodeCursor(options.cursor, context, videoCursor);
  const { data, error } = await db.rpc("api_video_page", {
    p_scope: options.scope, p_author_id: options.authorId ?? null,
    p_sort: options.sort, p_limit: options.limit + 1, p_cursor: cursor,
  });
  if (error) databaseError(error);
  return paginate(z.array(videoDto.extend({ cursorKey: videoCursor })).parse(data), options.limit, context);
}
