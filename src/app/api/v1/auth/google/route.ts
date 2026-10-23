import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { ApiError } from "@/server/shared/errors";
import { authError } from "@/server/modules/auth/auth.service";
import { OAUTH_FLOW_COOKIE, OAUTH_FLOW_MAX_AGE } from "@/server/modules/auth/oauth";
import { getConfig } from "@/server/config";

const startGoogle = api(async (_request, { db }) => {
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getConfig().origin}/api/v1/auth/callback`,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) authError(error);
  if (!data.url) throw new ApiError(503, "OAUTH_UNAVAILABLE", "Google sign-in is currently unavailable.");
  return { data: { url: data.url } };
}, { auth: "none", cookieOnly: true });

export async function POST(request: NextRequest) {
  // The API wrapper attaches the PKCE verifier cookie before returning the URL.
  const response = await startGoogle(request);
  if (response.ok) {
    response.cookies.set(OAUTH_FLOW_COOKIE, "google", {
      httpOnly: true, sameSite: "lax", secure: getConfig().origin.startsWith("https:"),
      path: "/", maxAge: OAUTH_FLOW_MAX_AGE,
    });
  }
  return response;
}
