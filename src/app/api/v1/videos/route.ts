import { api } from "@/server/shared/http";
import { ApiError } from "@/server/shared/errors";
import { parse } from "@/server/shared/validation";
import { feedQuery } from "@/server/modules/videos/video.schema";
import { listVideos } from "@/server/modules/videos/video.service";

export const GET = api(async (request, { db, user }) => {
  const query = parse(feedQuery, Object.fromEntries(request.nextUrl.searchParams));
  if (query.feed === "following" && !user) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in.");
  return listVideos(db, { ...query, sort: "latest", scope: query.feed === "following" ? "following" : "all", viewerId: user?.id });
});
