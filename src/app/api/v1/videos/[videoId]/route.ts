import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { getVideo } from "@/server/modules/videos/video.service";

export async function GET(request: NextRequest, context: { params: Promise<{ videoId: string }> }) {
  return api(async (_request, { db }) => {
    const id = parse(idSchema, (await context.params).videoId);
    return { data: await getVideo(db, id) };
  })(request);
}
