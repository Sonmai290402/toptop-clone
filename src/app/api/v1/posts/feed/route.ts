import { api } from "@/server/shared/http";
import { ApiError } from "@/server/shared/errors";
import { parse } from "@/server/shared/validation";
import { feedSchema, listVideoFeed } from "@/server/modules/posts/feed.service";

export const GET = api(async (request, { db, user }) => {
  const input = parse(feedSchema, Object.fromEntries(request.nextUrl.searchParams));
  if (input.feed === "following" && !user) throw new ApiError(401, "UNAUTHENTICATED", "Sign in to view your following feed.");
  return listVideoFeed(db, input);
});
