import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { videoQuery } from "@/server/modules/videos/video.schema";
import { listVideos } from "@/server/modules/videos/video.service";
import { getProfile } from "@/server/modules/users/user.service";

export async function GET(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  return api(async (request, { db, user }) => {
    const id = parse(idSchema, (await context.params).userId);
    const query = parse(videoQuery, Object.fromEntries(request.nextUrl.searchParams));
    await getProfile(db, id);
    return listVideos(db, { ...query, scope: "author", authorId: id, viewerId: user?.id });
  })(request);
}
