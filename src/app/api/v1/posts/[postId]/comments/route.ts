import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse, readJson } from "@/server/shared/validation";
import { commentInput, commentPageInput, listPostComments, createPostComment } from "@/server/modules/posts/interaction.service";
type Context = { params: Promise<{ postId: string }> };

export async function GET(request: NextRequest, context: Context) {
  return api(async (request, { db }) => listPostComments(db, parse(idSchema, (await context.params).postId), parse(commentPageInput, Object.fromEntries(request.nextUrl.searchParams))))(request);
}
export async function POST(request: NextRequest, context: Context) {
  return api(async (request, { db, user }) => { const input = await readJson(request, commentInput); return ({ data: await createPostComment(db, parse(idSchema, (await context.params).postId), user!.id, input.content, input.replyToId), status: 201 }); }, { auth: "required" })(request);
}
