import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { getInteractionState } from "@/server/modules/posts/interaction.service";

export async function GET(request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  return api(async (_request, { db }) => ({ data: await getInteractionState(db, parse(idSchema, (await context.params).postId)) }))(request);
}
