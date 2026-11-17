import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { ApiError, databaseError } from "@/server/shared/errors";
import { invalidateDiscovery } from "@/server/cache/discovery";

function handler(active: boolean) {
  return async (request: NextRequest, context: { params: Promise<{ postId: string }> }) => api(async (_req, { db }) => {
    const id = parse(idSchema, (await context.params).postId);
    const { error } = await db.rpc("set_post_pin", { p_id: id, p_active: active });
    if (error?.code === "P0001") throw new ApiError(409, "PIN_LIMIT", "You can pin up to three posts.");
    if (error?.code === "P0002") throw new ApiError(404, "POST_NOT_FOUND", "Post not found.");
    if (error) databaseError(error);
    await invalidateDiscovery();
    return { data: { isPinned: active } };
  }, { auth: "required" })(request);
}
export const PUT = handler(true);
export const DELETE = handler(false);
