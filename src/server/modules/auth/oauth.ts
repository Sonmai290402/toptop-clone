import "server-only";
import type { NextRequest } from "next/server";

export const OAUTH_FLOW_COOKIE = "toptop-oauth-flow";
export const OAUTH_FLOW_MAX_AGE = 10 * 60;

export function isGoogleOAuth(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  // Explicit email/recovery callbacks take precedence over an abandoned OAuth cookie.
  if (params.has("token_hash") || params.get("flow") === "recovery") return false;
  return params.get("flow") === "google"
    || (!params.has("flow") && request.cookies.get(OAUTH_FLOW_COOKIE)?.value === "google");
}
