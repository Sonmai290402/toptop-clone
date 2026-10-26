export function isProtectedPath(pathname: string) {
  let path = pathname;
  try { path = decodeURIComponent(pathname); } catch { return false; }
  const segments = path.split("/").filter(Boolean);
  if (["upload", "following"].includes(segments[0] ?? "")) return true;
  if (path === "/auth/reset-password") return true;
  return segments.length === 1 && !["explore", "auth"].includes(segments[0]) && !segments[0].includes(".");
}
