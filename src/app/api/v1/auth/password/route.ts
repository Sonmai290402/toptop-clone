import { z } from "zod";
import { api } from "@/server/shared/http";
import { readJson } from "@/server/shared/validation";
import { authError } from "@/server/modules/auth/auth.service";

export const POST = api(async (request, { db }) => {
  const input = await readJson(request, z.object({ password: z.string().min(8).max(128) }).strict());
  const { error } = await db.auth.updateUser(input);
  if (error) authError(error);
  return { data: { message: "Your password has been updated." } };
}, { auth: "required", cookieOnly: true });
