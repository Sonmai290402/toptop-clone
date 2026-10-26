import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { getProfile } from "@/server/modules/users/user.service";

export async function GET(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  return api(async (_request, { db }) => {
    const userId = parse(idSchema, (await context.params).userId);
    return { data: await getProfile(db, userId) };
  })(request);
}
