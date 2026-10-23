import { api } from "@/server/shared/http";
export const GET = api(async (_request, { user }) => ({
  data: { user: user ? { id: user.id, email: user.email } : null },
}));
