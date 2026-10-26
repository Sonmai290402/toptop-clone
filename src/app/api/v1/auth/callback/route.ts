import { z } from "zod";
import { api } from "@/server/shared/http";
import { parse } from "@/server/shared/validation";
import { authError, authPayload } from "@/server/modules/auth/auth.service";
import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/server/config";
import { ApiError } from "@/server/shared/errors";
import { isGoogleOAuth, OAUTH_FLOW_COOKIE } from "@/server/modules/auth/oauth";

const exchange = api(async (request, { db }) => {
  const params = request.nextUrl.searchParams;
  if (params.has("error") || params.has("error_code")) {
    const cancelled = params.get("error") === "access_denied" && !params.has("error_code");
    throw new ApiError(400, cancelled ? "OAUTH_CANCELLED" : "OAUTH_FAILED", "Không thể hoàn tất đăng nhập. Vui lòng thử lại.");
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
  if (!data.user || !data.session) throw new ApiError(400, "INVALID_SESSION", "Không thể tạo phiên đăng nhập. Vui lòng thử lại.");
  return { data: await authPayload(db, data.user, data.session, isGoogleOAuth(request)) };
}, { auth: "none", cookieOnly: true });

export async function GET(request: NextRequest) {
  const response = await exchange(request);
  const google = isGoogleOAuth(request);
  if (google) response.cookies.set(OAUTH_FLOW_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
  if (!request.headers.get("accept")?.includes("text/html")) return response;
  const recovery = request.nextUrl.searchParams.get("flow") === "recovery"
    || request.nextUrl.searchParams.get("type") === "recovery";
  const failure = !response.ok && google ? await response.clone().json() : null;
  const reason = failure?.error?.code === "OAUTH_CANCELLED" ? "cancelled"
    : failure?.error?.code === "GOOGLE_PROFILE_SETUP_REQUIRED" ? "profile-setup" : "failed";
  const path = response.ok
    ? recovery ? "/auth/reset-password" : google ? "/auth/signed-in" : "/auth/confirmed"
    : google ? `/auth/oauth-error?reason=${reason}` : "/auth/confirmed?error=1";
  // Fixed destinations only: never redirect to a URL supplied by the caller.
  let origin: string;
  try { origin = getConfig().origin; } catch { return response; }
  const redirect = NextResponse.redirect(new URL(path, origin), 303);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  redirect.headers.set("Cache-Control", "private, no-store");
  redirect.headers.set("Referrer-Policy", "no-referrer");
  return redirect;
}
