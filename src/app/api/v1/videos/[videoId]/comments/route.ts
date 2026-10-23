import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, paginationSchema, parse, readJson } from "@/server/shared/validation";
import { createCommentSchema } from "@/server/modules/comments/comment.schema";
import { createComment, listComments } from "@/server/modules/comments/comment.service";

type Context = { params: Promise<{ videoId: string }> };

export async function GET(request: NextRequest, context: Context) {
  return api(async (request, { db }) => {
    const id = parse(idSchema, (await context.params).videoId);
    const query = parse(paginationSchema.strict(), Object.fromEntries(request.nextUrl.searchParams));
    return listComments(db, id, query);
  })(request);
}

export async function POST(request: NextRequest, context: Context) {
  return api(async (request, { db, user }) => {
    const id = parse(idSchema, (await context.params).videoId);
    const input = await readJson(request, createCommentSchema);
    return { data: await createComment(db, id, user!.id, input.content), status: 201 };
  }, { auth: "required" })(request);
}
