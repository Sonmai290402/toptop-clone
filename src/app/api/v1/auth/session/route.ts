import { api } from "@/server/shared/http";
import { getAuthUser } from "@/server/modules/auth/authorization";
export const GET = api(async (_request, { db, user }) => ({
  data: { user: user ? await getAuthUser(db, user) : null },
}));
