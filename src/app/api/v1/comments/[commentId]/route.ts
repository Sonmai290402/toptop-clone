import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { deleteComment } from "@/server/modules/comments/comment.service";

export async function DELETE(request: NextRequest, context: { params: Promise<{ commentId: string }> }) {
  return api(async (_request, { db, user }) => {
    const id = parse(idSchema, (await context.params).commentId);
    await deleteComment(db, id, user!.id);
    return { status: 204 };
  }, { auth: "required" })(request);
}
