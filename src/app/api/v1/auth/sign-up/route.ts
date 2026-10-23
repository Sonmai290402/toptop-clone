import { api } from "@/server/shared/http";
import { readJson } from "@/server/shared/validation";
import { signUpSchema } from "@/server/modules/auth/auth.schema";
import { signUp } from "@/server/modules/auth/auth.service";

export const POST = api(async (request, { db }) => ({
  data: await signUp(db, await readJson(request, signUpSchema)), status: 201,
}), { auth: "none", cookieOnly: true });
