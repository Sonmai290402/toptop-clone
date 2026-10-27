import { api } from "@/server/shared/http";
import { requireRole } from "@/server/modules/auth/authorization";
import { readJson } from "@/server/shared/validation";
import { soundUploadSchema } from "@/lib/admin-sounds";
import { createSoundUpload } from "@/server/modules/sounds/admin.service";

export const POST = api(async (request, { db, user }) => {
  requireRole(user, "admin");
  const input = await readJson(request, soundUploadSchema);
  return { data: await createSoundUpload(db, user!.id, input), status: 201 };
}, { auth: "required" });
