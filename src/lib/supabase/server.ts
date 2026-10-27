import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/server/config";
import { ApiError } from "@/server/shared/errors";

export function createRequestClient(request: NextRequest) {
  const config = getConfig();
  const pending: { name: string; value: string; options: CookieOptions }[] = [];
  const authorization = request.headers.get("authorization");
  let token: string | undefined;
  if (authorization !== null) {
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) throw new ApiError(401, "INVALID_TOKEN", "Authorization must use the format Bearer <access_token>.");
    token = match[1];
  }
  const supabase = token
    ? createClient(config.url, config.key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : createServerClient(config.url, config.key, {
        cookieOptions: {
          path: "/", sameSite: "lax", secure: new URL(config.origin).protocol === "https:",
        },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookies) => {
            for (const cookie of cookies) {
              request.cookies.set(cookie.name, cookie.value);
              pending.push(cookie);
            }
          },
        },
      });
  return {
    supabase, token,
    applyCookies(response: NextResponse) {
      for (const { name, value, options } of pending) response.cookies.set(name, value, options);
      return response;
    },
  };
}
