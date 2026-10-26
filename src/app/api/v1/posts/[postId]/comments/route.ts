import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse, readJson } from "@/server/shared/validation";
import { commentInput, interactionPage, listPostComments, createPostComment } from "@/server/modules/posts/interaction.service";
type Context = { params: Promise<{ postId: string }> };

export async function GET(request: NextRequest, context: Context) {
  return api(async (request, { db }) => listPostComments(db, parse(idSchema, (await context.params).postId), parse(interactionPage, Object.fromEntries(request.nextUrl.searchParams))))(request);
}
export async function POST(request: NextRequest, context: Context) {
  return api(async (request, { db, user }) => ({ data: await createPostComment(db, parse(idSchema, (await context.params).postId), user!.id, (await readJson(request, commentInput)).content), status: 201 }), { auth: "required" })(request);
}
