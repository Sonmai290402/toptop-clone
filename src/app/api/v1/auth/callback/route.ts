import { z } from "zod";
import { api } from "@/server/shared/http";
import { parse } from "@/server/shared/validation";
import { authError, authPayload } from "@/server/modules/auth/auth.service";
import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/server/config";
import { ApiError } from "@/server/shared/errors";
import { OAUTH_FLOW_COOKIE } from "@/server/modules/auth/oauth";

const exchange = api(async (request, { db }) => {
  const params = request.nextUrl.searchParams;
  if (params.has("error")) {
    throw new ApiError(400, "OAUTH_CANCELLED", "Sign-in was cancelled or could not be completed. Please try again.");
  }
  const tokenHash = params.get("token_hash");
  const result = tokenHash
    ? await db.auth.verifyOtp({
        token_hash: parse(z.string().min(1).max(2048), tokenHash),
        type: parse(z.enum(["email", "signup", "recovery"]), params.get("type")),
      })
    : await db.auth.exchangeCodeForSession(parse(z.string().min(1).max(2048), params.get("code")));
  const { data, error } = result;
  if (error) authError(error);
  return { data: await authPayload(db, data.user, data.session, true) };
}, { auth: "none", cookieOnly: true });

export async function GET(request: NextRequest) {
  const response = await exchange(request);
  const google = request.cookies.get(OAUTH_FLOW_COOKIE)?.value === "google";
  if (google) response.cookies.set(OAUTH_FLOW_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
  if (!request.headers.get("accept")?.includes("text/html")) return response;
  const recovery = request.nextUrl.searchParams.get("flow") === "recovery"
    || request.nextUrl.searchParams.get("type") === "recovery";
  const path = response.ok
    ? recovery ? "/auth/reset-password" : google ? "/auth/signed-in" : "/auth/confirmed"
    : google ? "/auth/oauth-error" : "/auth/confirmed?error=1";
  // Fixed destinations only: never redirect to a URL supplied by the caller.
  let origin: string;
  try { origin = getConfig().origin; } catch { return response; }
  const redirect = NextResponse.redirect(new URL(path, origin), 303);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  redirect.headers.set("Cache-Control", "private, no-store");
  redirect.headers.set("Referrer-Policy", "no-referrer");
  return redirect;
}
