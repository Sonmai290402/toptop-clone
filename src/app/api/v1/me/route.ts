import { api } from "@/server/shared/http";
import { readJson } from "@/server/shared/validation";
import { updateProfileSchema } from "@/server/modules/users/user.schema";
import { getProfile, updateProfile } from "@/server/modules/users/user.service";

export const GET = api(async (_request, { db, user }) => ({ data: await getProfile(db, user!.id) }), { auth: "required" });
export const PATCH = api(async (request, { db, user }) => ({
  data: await updateProfile(db, user!.id, await readJson(request, updateProfileSchema)),
}), { auth: "required" });
