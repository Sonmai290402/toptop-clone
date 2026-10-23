import { z } from "zod";
import { api } from "@/server/shared/http";
import { parse } from "@/server/shared/validation";
import { authError, authPayload } from "@/server/modules/auth/auth.service";

export const GET = api(async (request, { db }) => {
  const code = parse(z.string().min(1).max(2048), request.nextUrl.searchParams.get("code"));
  const { data, error } = await db.auth.exchangeCodeForSession(code);
  if (error) authError(error);
  return { data: authPayload(data.user, data.session) };
}, { auth: "none", cookieOnly: true });
