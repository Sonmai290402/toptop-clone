import { NextRequest, NextResponse } from "next/server";
import { createRequestClient } from "@/lib/supabase/server";
import { isProtectedPath } from "@/lib/auth/protected-paths";

export async function proxy(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) return NextResponse.next();
  try {
    const client = createRequestClient(request);
    const { data, error } = await client.supabase.auth.getUser();
    const response = error || !data.user
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next({ request });
    response.headers.set("Cache-Control", "private, no-store");
    return client.applyCookies(response);
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|images|demo-videos).*)"],
};
