import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { getSound } from "@/server/modules/sounds/sound.service";

export async function GET(request: NextRequest, context: { params: Promise<{ soundId: string }> }) {
  return api(async (_, { db }) => ({ data: await getSound(db, parse(idSchema, (await context.params).soundId)) }), { auth: "none" })(request);
}
