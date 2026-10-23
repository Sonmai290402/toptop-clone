import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { parse, usernameSchema } from "@/server/shared/validation";
import { getProfileByUsername } from "@/server/modules/users/user.service";

export async function GET(request: NextRequest, context: { params: Promise<{ username: string }> }) {
  return api(async (_request, { db }) => {
    const username = parse(usernameSchema, (await context.params).username.replace(/^@/, ""));
    return { data: await getProfileByUsername(db, username) };
  })(request);
}
