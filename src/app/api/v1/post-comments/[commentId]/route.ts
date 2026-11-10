import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { ApiError, databaseError } from "@/server/shared/errors";
import { idSchema, parse } from "@/server/shared/validation";

export async function DELETE(request: NextRequest, context: { params: Promise<{ commentId: string }> }) {
  return api(async (_request, { db, user }) => {
    const id = parse(idSchema, (await context.params).commentId);
    const target = await db.from("post_comments").select("author_id").eq("id", id).maybeSingle();
    if (target.error) databaseError(target.error);
    if (!target.data) return { status: 204 };
    if (target.data.author_id !== user!.id) throw new ApiError(403, "FORBIDDEN", "You can only delete your own comments.");
    const result = await db.from("post_comments").delete().eq("id", id).eq("author_id", user!.id);
    if (result.error) databaseError(result.error);
    return { status: 204 };
  }, { auth: "required" })(request);
}
