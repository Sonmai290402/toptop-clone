import { z } from "zod";
import { api } from "@/server/shared/http";
import { readJson } from "@/server/shared/validation";
import { authError } from "@/server/modules/auth/auth.service";
import { getConfig } from "@/server/config";

export const POST = api(async (request, { db }) => {
  const { email } = await readJson(request, z.object({ email: z.email().max(254) }).strict());
  const { error } = await db.auth.resend({
    type: "signup", email,
    options: { emailRedirectTo: `${getConfig().origin}/api/v1/auth/callback` },
  });
  if (error) authError(error);
  return { data: { message: "Nếu tài khoản cần xác nhận, liên kết đã được gửi đến email của bạn." } };
}, { auth: "none", cookieOnly: true });
