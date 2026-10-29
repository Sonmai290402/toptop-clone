export function isProtectedPath(pathname: string) {
  let path = pathname;
  try { path = decodeURIComponent(pathname); } catch { return false; }
  const segments = path.split("/").filter(Boolean);
  if (["upload", "following", "admin"].includes(segments[0] ?? "")) return true;
  if (path === "/auth/reset-password") return true;
  return segments.length === 1 && isProfileSegment(segments[0]);
}

export function isAdminPath(pathname: string) {
  try {
    const path = decodeURIComponent(pathname);
    return path === "/admin" || path.startsWith("/admin/");
  } catch { return false; }
}
export function isProfileSegment(segment: string) {
  return getProfileUsername(segment) !== null;
}

export function getProfileUsername(segment: string): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(segment); } catch { return null; }
  if (!decoded.startsWith("@") || decoded.length <= 1 || decoded.includes("/")) return null;
  return decoded.slice(1);
}
