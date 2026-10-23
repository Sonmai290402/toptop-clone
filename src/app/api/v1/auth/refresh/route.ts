import { api } from "@/server/shared/http";
import { authError, authPayload } from "@/server/modules/auth/auth.service";

export const POST = api(async (_request, { db }) => {
  const { data, error } = await db.auth.refreshSession();
  if (error) authError(error);
  return { data: await authPayload(db, data.user, data.session) };
}, { auth: "none", cookieOnly: true });
