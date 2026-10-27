import { api } from "@/server/shared/http";
import { requireRole } from "@/server/modules/auth/authorization";
import { parse } from "@/server/shared/validation";
import { soundListSchema } from "@/server/modules/sounds/sound.service";
import { listAdminSounds } from "@/server/modules/sounds/admin.service";

export const GET = api(async (request, { db, user }) => {
  requireRole(user, "admin");
  return listAdminSounds(db, parse(soundListSchema, Object.fromEntries(request.nextUrl.searchParams)));
}, { auth: "required" });
