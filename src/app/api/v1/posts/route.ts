import { api } from "@/server/shared/http";
import { parse } from "@/server/shared/validation";
import { listPosts, postListSchema } from "@/server/modules/posts/post.service";

export const GET = api(async (request, { db }) => listPosts(db, parse(postListSchema, Object.fromEntries(request.nextUrl.searchParams))));
