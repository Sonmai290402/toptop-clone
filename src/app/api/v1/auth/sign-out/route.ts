import { api } from "@/server/shared/http";
import { authError } from "@/server/modules/auth/auth.service";

export const POST = api(async (_request, { db }) => {
  const { error } = await db.auth.signOut({ scope: "local" });
  if (error) authError(error);
  return { status: 204 };
}, { auth: "none", cookieOnly: true });
