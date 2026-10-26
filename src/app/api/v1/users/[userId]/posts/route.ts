import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { listPosts, postListSchema } from "@/server/modules/posts/post.service";

export async function GET(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  return api(async (request, { db }) => listPosts(db,
    parse(postListSchema, Object.fromEntries(request.nextUrl.searchParams)),
    parse(idSchema, (await context.params).userId),
  ))(request);
}
