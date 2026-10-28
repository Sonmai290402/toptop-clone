import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";
import type { AuthUser } from "@/types/auth.types";
import { UserRole } from "@/types/role.types";
import { ApiError, databaseError } from "@/server/shared/errors";

export async function getUserRole(db: SupabaseClient, user: User): Promise<UserRole> {
  const { data, error } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError(403, "FORBIDDEN", "A user profile is required.");
  return z.enum(UserRole).parse(data.role);
}

export async function requireRole(db: SupabaseClient, user: User | null, role: UserRole) {
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in.");
  if (await getUserRole(db, user) !== role) throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action.");
}

export function toAuthUser(user: User): AuthUser {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email,
    username: typeof metadata.username === "string" ? metadata.username : `user_${user.id.replaceAll("-", "").slice(0, 24)}`,
    displayName: [metadata.display_name, metadata.full_name, metadata.name].find(value => typeof value === "string" && value.trim())?.trim().slice(0, 80) ?? "User",
    avatarUrl: [metadata.avatar_url, metadata.picture].find(value => typeof value === "string" && value.startsWith("https://")) ?? null,
    role: UserRole.USER,
  };
}

const authProfile = z.object({ username: z.string(), display_name: z.string(), avatar_url: z.string().nullable(), role: z.enum(UserRole) });

export async function getAuthUser(db: SupabaseClient, user: User, syncGoogleProfile = false): Promise<AuthUser> {
  const result = await db.from("profiles").select("username, display_name, avatar_url, role").eq("id", user.id).maybeSingle();
  if (result.error) databaseError(result.error);
  if (!result.data) throw new ApiError(409, "PROFILE_NOT_READY", "Your profile is not ready. Please try signing in again.");
  const profile = authProfile.parse(result.data);
  const identity = toAuthUser(user);
  const hasGoogleIdentity = user.app_metadata.provider === "google"
    || user.identities?.some(item => item.provider === "google");

  if (syncGoogleProfile && hasGoogleIdentity) {
    // Fill generated defaults only; preserve customized profile data.
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
    const username = await db.rpc("sync_google_username");
    if (username.error?.code === "PGRST202") {
      throw new ApiError(503, "GOOGLE_PROFILE_SETUP_REQUIRED", "Google authentication succeeded, but username setup is unavailable. Apply the Google usernames database migration and sign in again.");
    }
    if (username.error) databaseError(username.error);
    profile.username = z.string().parse(username.data);
  }

  return { ...identity, username: profile.username, displayName: profile.display_name, avatarUrl: profile.avatar_url, role: profile.role };
}
