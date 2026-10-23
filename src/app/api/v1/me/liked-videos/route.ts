import { api } from "@/server/shared/http";
import { parse } from "@/server/shared/validation";
import { videoQuery } from "@/server/modules/videos/video.schema";
import { listVideos } from "@/server/modules/videos/video.service";

export const GET = api(async (request, { db, user }) => {
  const query = parse(videoQuery, Object.fromEntries(request.nextUrl.searchParams));
  return listVideos(db, { ...query, scope: "liked", viewerId: user!.id });
}, { auth: "required" });
