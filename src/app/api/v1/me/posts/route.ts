import { api } from "@/server/shared/http";
import { listPosts, postListSchema } from "@/server/modules/posts/post.service";
import { parse } from "@/server/shared/validation";

export const GET = api(async (request, { db, user }) => listPosts(db, parse(postListSchema, Object.fromEntries(request.nextUrl.searchParams)), user!.id), { auth: "required" });
