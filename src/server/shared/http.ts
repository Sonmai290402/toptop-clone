import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { createRequestClient } from "@/lib/supabase/server";
import { getConfig } from "../config";
import { ApiError } from "./errors";

export type ApiContext = { db: SupabaseClient; user: User | null; token?: string };
type Result = { data?: unknown; pagination?: unknown; status?: number };
type Options = { auth?: "required" | "optional" | "none"; cookieOnly?: boolean };

export function assertOrigin(request: Request, expectedOrigin: string, bearer: boolean) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if ((origin && origin !== expectedOrigin) || (!bearer && origin !== expectedOrigin)) {
    throw new ApiError(403, "INVALID_ORIGIN", "Origin không hợp lệ. Gửi Origin trùng với APP_URL.");
  }
}

export function api(
  handler: (request: NextRequest, context: ApiContext) => Promise<Result>,
  options: Options = {},
) {
  return async (request: NextRequest) => {
    // Read request state before config/error handling so Next never prerenders
    // a configuration error (or a personalized response) as a static GET.
    const authorization = request.headers.get("authorization");
    let client: ReturnType<typeof createRequestClient> | undefined;
    let response: NextResponse;
    try {
      const config = getConfig();
      // Auth endpoints use cookies. A bearer token must not silently override them.
      if (options.cookieOnly && authorization !== null) {
        throw new ApiError(400, "COOKIE_AUTH_REQUIRED", "Endpoint này dùng cookie; không gửi Authorization.");
      }
      assertOrigin(request, config.origin, authorization !== null && !options.cookieOnly);
      client = createRequestClient(request);
      let db = client.supabase;
      let user: User | null = null;
      if (options.auth !== "none") {
        const { data, error } = await client.supabase.auth.getUser(client.token);
        if (error && error.name !== "AuthSessionMissingError") {
          if (error.status && error.status >= 500) throw new ApiError(503, "AUTH_UNAVAILABLE", "Không thể kết nối dịch vụ xác thực.");
          if (options.auth === "required" || client.token) {
            throw new ApiError(401, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
          }
          // Expired cookies must not block public browsing. Anonymous reads use
          // a fresh client without the stale token, while protected APIs stay 401.
          db = createClient(config.url, config.key, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          });
        }
        user = error ? null : data.user;
        if ((options.auth === "required" || client.token) && !user) {
          throw new ApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
        }
      }
      const result = await handler(request, { db, user, token: client.token });
      const { status = 200, ...body } = result;
      response = status === 204 ? new NextResponse(null, { status }) : NextResponse.json(body, { status });
    } catch (error) {
      const failure = error instanceof ApiError
        ? error
        : new ApiError(500, "INTERNAL_ERROR", "Đã xảy ra lỗi máy chủ.");
      if (!(error instanceof ApiError)) console.error("API failed", error instanceof Error ? error.name : "UnknownError");
      response = NextResponse.json({ error: { code: failure.code, message: failure.message, ...(failure.details ? { details: failure.details } : {}) } }, { status: failure.status });
    }
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Cookie, Authorization");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "no-referrer");
    return client ? client.applyCookies(response) : response;
  };
}
