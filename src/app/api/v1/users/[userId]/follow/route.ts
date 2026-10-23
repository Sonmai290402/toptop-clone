import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { setFollow } from "@/server/modules/interactions/interaction.service";

type Context = { params: Promise<{ userId: string }> };

function handle(request: NextRequest, context: Context, active: boolean) {
  return api(async (_request, { db, user }) => {
    const id = parse(idSchema, (await context.params).userId);
    return { data: await setFollow(db, user!.id, id, active) };
  }, { auth: "required" })(request);
}
export function PUT(request: NextRequest, context: Context) { return handle(request, context, true); }
export function DELETE(request: NextRequest, context: Context) { return handle(request, context, false); }
