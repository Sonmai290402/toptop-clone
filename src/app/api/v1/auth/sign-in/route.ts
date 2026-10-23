import { api } from "@/server/shared/http";
import { readJson } from "@/server/shared/validation";
import { signInSchema } from "@/server/modules/auth/auth.schema";
import { signIn } from "@/server/modules/auth/auth.service";

export const POST = api(async (request, { db }) => ({
  data: await signIn(db, await readJson(request, signInSchema)),
}), { auth: "none", cookieOnly: true });
