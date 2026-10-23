import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";
import type { AuthUser, UserRole } from "@/types/auth.types";
import { ApiError, databaseError } from "@/server/shared/errors";

export function getUserRole(user: User): UserRole {
  // app_metadata can only be changed by trusted admin/service-role operations.
  // Never read authorization from user_metadata or the JWT's database role.
  return user.app_metadata?.app_role === "admin" ? "admin" : "user";
}

export function requireRole(user: User | null, role: UserRole) {
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in.");
  if (getUserRole(user) !== role) throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action.");
}

export function toAuthUser(user: User): AuthUser {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email,
    username: typeof metadata.username === "string" ? metadata.username : `user_${user.id.replaceAll("-", "").slice(0, 24)}`,
    displayName: [metadata.display_name, metadata.full_name, metadata.name].find(value => typeof value === "string" && value.trim())?.trim().slice(0, 80) ?? "User",
    avatarUrl: [metadata.avatar_url, metadata.picture].find(value => typeof value === "string" && value.startsWith("https://")) ?? null,
    role: getUserRole(user),
  };
}

const authProfile = z.object({ username: z.string(), display_name: z.string(), avatar_url: z.string().nullable() });

export async function getAuthUser(db: SupabaseClient, user: User, syncGoogleProfile = false): Promise<AuthUser> {
  const result = await db.from("profiles").select("username, display_name, avatar_url").eq("id", user.id).maybeSingle();
  if (result.error) databaseError(result.error);
  if (!result.data) throw new ApiError(409, "PROFILE_NOT_READY", "Your profile is not ready. Please try signing in again.");
  const profile = authProfile.parse(result.data);
  const identity = toAuthUser(user);
  const hasGoogleIdentity = user.app_metadata.provider === "google"
    || user.identities?.some(item => item.provider === "google");

  if (syncGoogleProfile && hasGoogleIdentity) {
    // Fill generated defaults only; retain usernames and customized profile data.
    const updates: { display_name?: string; avatar_url?: string } = {};
    if (profile.username.startsWith("user_") && profile.display_name === profile.username && identity.displayName !== "User") {
      updates.display_name = identity.displayName;
    }
    if (!profile.avatar_url && identity.avatarUrl) updates.avatar_url = identity.avatarUrl;
    if (Object.keys(updates).length) {
      const update = await db.from("profiles").update(updates).eq("id", user.id);
      if (update.error) databaseError(update.error);
      Object.assign(profile, updates);
    }
  }

  return { ...identity, username: profile.username, displayName: profile.display_name, avatarUrl: profile.avatar_url };
}
