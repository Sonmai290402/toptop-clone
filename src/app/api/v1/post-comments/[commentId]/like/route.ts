import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { ApiError, databaseError } from "@/server/shared/errors";
import { idSchema, parse } from "@/server/shared/validation";
type Context = { params: Promise<{ commentId: string }> };
function handler(active: boolean) {
  return async (request: NextRequest, context: Context) => api(async (_request, { db, user }) => {
    const id = parse(idSchema, (await context.params).commentId);
    const target = await db.from("post_comments").select("id").eq("id", id).maybeSingle();
    if (target.error) databaseError(target.error);
    if (!target.data) throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found.");
    const result = active ? await db.from("post_comment_likes").insert({ comment_id: id, user_id: user!.id })
      : await db.from("post_comment_likes").delete().eq("comment_id", id).eq("user_id", user!.id);
    if (result.error && !(active && result.error.code === "23505")) databaseError(result.error);
    return { data: { isLiked: active } };
  }, { auth: "required" })(request);
}
export const PUT = handler(true);
export const DELETE = handler(false);
