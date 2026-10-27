import { z } from "zod";
import { api } from "@/server/shared/http";
import { readJson } from "@/server/shared/validation";
import { authError } from "@/server/modules/auth/auth.service";
import { getConfig } from "@/server/config";

export const POST = api(async (request, { db }) => {
  const { email } = await readJson(request, z.object({ email: z.email().max(254) }).strict());
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: `${getConfig().origin}/api/v1/auth/callback?flow=recovery`,
  });
  if (error) authError(error);
  return { data: { message: "If an account exists for this email, you will receive a password reset link." } };
}, { auth: "none", cookieOnly: true });
