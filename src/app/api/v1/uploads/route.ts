import { api } from "@/server/shared/http";
import { readJson } from "@/server/shared/validation";
import { uploadSchema } from "@/lib/uploads";
import { createUpload } from "@/server/modules/uploads/upload.service";

export const POST = api(async (request, { db, user }) => ({
  data: await createUpload(db, user!.id, await readJson(request, uploadSchema)), status: 201,
}), { auth: "required" });
