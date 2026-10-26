import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { getPost } from "@/server/modules/posts/post.service";

export async function GET(request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  return api(async (_request, { db }) => ({ data: await getPost(db, parse(idSchema, (await context.params).postId)) }))(request);
}
