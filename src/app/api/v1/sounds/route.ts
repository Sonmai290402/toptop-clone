import { api } from "@/server/shared/http";
import { parse } from "@/server/shared/validation";
import { listSounds, soundListSchema } from "@/server/modules/sounds/sound.service";

export const GET = api(async (request, { db }) => listSounds(db, parse(soundListSchema, Object.fromEntries(request.nextUrl.searchParams))), { auth: "none" });
