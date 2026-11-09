import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { getPost } from "@/server/modules/posts/post.service";
import { editPost, deletePost } from "@/server/modules/posts/post.service";
import { readJson } from "@/server/shared/validation";
import { editPostSchema } from "@/lib/post-edit";

type Context = { params: Promise<{ postId: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  return api(async (req, { db }) => ({ data: await editPost(db,
    parse(idSchema, (await context.params).postId), await readJson(req, editPostSchema)) }), { auth: "required" })(request);
}
export async function DELETE(request: NextRequest, context: Context) {
  return api(async (_req, { db }) => ({ data: await deletePost(db,
    parse(idSchema, (await context.params).postId)) }), { auth: "required" })(request);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  return api(async (_request, { db }) => ({
    data: await getPost(db, parse(idSchema, (await context.params).postId)),
  }))(request);
}
