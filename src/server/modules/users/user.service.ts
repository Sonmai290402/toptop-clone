import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { ApiError, databaseError } from "../../shared/errors";
import { profileDto } from "../contracts";
import type { updateProfileSchema } from "./user.schema";

export async function getProfile(db: SupabaseClient, id: string) {
  const { data, error } = await db.rpc("api_profile", { p_user_id: id });
  if (error) databaseError(error);
  if (!data) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  return profileDto.parse(data);
}

export async function getProfileByUsername(db: SupabaseClient, username: string) {
  const { data, error } = await db.from("profiles").select("id").eq("username", username).maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  return getProfile(db, data.id);
}

export async function updateProfile(db: SupabaseClient, id: string, input: z.infer<typeof updateProfileSchema>) {
  const updates: Record<string, string | null> = {};
  if (input.displayName !== undefined) updates.display_name = input.displayName;
  if (input.avatarUrl !== undefined) updates.avatar_url = input.avatarUrl;
  if (input.bio !== undefined) updates.bio = input.bio;
  const { data, error } = await db.from("profiles").update(updates).eq("id", id).select("id").maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  return getProfile(db, id);
}
