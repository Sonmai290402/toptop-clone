import { NextRequest, NextResponse } from "next/server";
import { createRequestClient } from "@/lib/supabase/server";
import { isAdminPath, isProtectedPath } from "@/lib/auth/protected-paths";
import { getUserRole } from "@/server/modules/auth/authorization";
import { UserRole } from "@/types/role.types";

export async function proxy(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) return NextResponse.next();
  try {
    const client = createRequestClient(request);
    const { data, error } = await client.supabase.auth.getUser();
    const response = error || !data.user || (isAdminPath(request.nextUrl.pathname) && await getUserRole(client.supabase, data.user) !== UserRole.ADMIN)
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
