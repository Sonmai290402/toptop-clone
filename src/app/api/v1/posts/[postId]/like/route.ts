import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { setPostInteraction } from "@/server/modules/posts/interaction.service";
type Context = { params: Promise<{ postId: string }> };
function handle(request: NextRequest, context: Context, active: boolean) {
  return api(async (_request, { db, user }) => ({ data: await setPostInteraction(db, parse(idSchema, (await context.params).postId), user!.id, "like", active) }), { auth: "required" })(request);
}
export function PUT(request: NextRequest, context: Context) { return handle(request, context, true); }
export function DELETE(request: NextRequest, context: Context) { return handle(request, context, false); }
