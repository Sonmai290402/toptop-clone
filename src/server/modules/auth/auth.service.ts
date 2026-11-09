import "server-only";
import type { AuthError, Session, SupabaseClient, User } from "@supabase/supabase-js";
import type { z } from "zod";
import { getConfig } from "../../config";
import { ApiError, databaseError } from "../../shared/errors";
import type { signInSchema, signUpSchema } from "./auth.schema";
import { getAuthUser, toAuthUser } from "./authorization";

export function authError(error: AuthError): never {
  if (error.code === "user_already_exists" || error.code === "email_exists") throw new ApiError(409, "EMAIL_ALREADY_REGISTERED", "This email is already registered. Please sign in instead.");
  if (error.status === 429) throw new ApiError(429, "RATE_LIMITED", "Too many authentication requests. Please try again later.");
  if (error.status && error.status >= 500) throw new ApiError(503, "AUTH_UNAVAILABLE", "Authentication is currently unavailable. Please try again later.");
  if (error.code === "invalid_credentials") throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  if (error.code === "email_not_confirmed") throw new ApiError(403, "EMAIL_NOT_CONFIRMED", "Please confirm your email before signing in.");
  throw new ApiError(400, "AUTH_ERROR", "Authentication could not be completed. Check your details or request a new link.");
}

export async function authPayload(db: SupabaseClient, user: User | null, session: Session | null, syncGoogleProfile = false) {
  return {
    user: user ? session ? await getAuthUser(db, user, syncGoogleProfile) : toAuthUser(user) : null,
    // Refresh token remains in the Supabase cookie jar; do not store it in UI state.
    session: session ? { accessToken: session.access_token, tokenType: session.token_type, expiresAt: session.expires_at } : null,
  };
}

export async function signUp(db: SupabaseClient, input: z.infer<typeof signUpSchema>) {
  const email = input.email.trim().toLowerCase();
  const registered = await db.rpc("is_email_registered", { p_email: email });
  if (registered.error) databaseError(registered.error);
  if (typeof registered.data !== "boolean") throw new ApiError(503, "EMAIL_CHECK_UNAVAILABLE", "Unable to verify this email. Please try again.");
  if (registered.data) throw new ApiError(409, "EMAIL_ALREADY_REGISTERED", "This email is already registered. Please sign in instead.");
  const exists = await db.from("profiles").select("id").eq("username", input.username).maybeSingle();
  if (exists.error) databaseError(exists.error);
  if (exists.data) throw new ApiError(409, "USERNAME_TAKEN", "This username is already taken.");
  const { data, error } = await db.auth.signUp({
    email, password: input.password,
    options: {
      data: { username: input.username, display_name: input.displayName },
      emailRedirectTo: `${getConfig().origin}/api/v1/auth/callback`,
    },
  });
  if (error) authError(error);
  if (data.user?.identities?.length === 0 && !data.session) throw new ApiError(409, "EMAIL_ALREADY_REGISTERED", "This email is already registered. Please sign in instead.");
  if (!data.user) throw new ApiError(503, "SIGNUP_UNAVAILABLE", "Registration could not be confirmed. Please try again.");
  return { ...await authPayload(db, data.user, data.session), requiresEmailConfirmation: !data.session };
}

export async function signIn(db: SupabaseClient, input: z.infer<typeof signInSchema>) {
  const { data, error } = await db.auth.signInWithPassword(input);
  if (error) authError(error);
  return authPayload(db, data.user, data.session);
}
