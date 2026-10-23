import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { setVideoInteraction } from "@/server/modules/interactions/interaction.service";

type Context = { params: Promise<{ videoId: string }> };

function handle(request: NextRequest, context: Context, active: boolean) {
  return api(async (_request, { db, user }) => {
    const id = parse(idSchema, (await context.params).videoId);
    return { data: await setVideoInteraction(db, "save", user!.id, id, active) };
  }, { auth: "required" })(request);
}
export function PUT(request: NextRequest, context: Context) { return handle(request, context, true); }
export function DELETE(request: NextRequest, context: Context) { return handle(request, context, false); }
