import "server-only";
import type { AuthError, Session, SupabaseClient, User } from "@supabase/supabase-js";
import type { z } from "zod";
import { getConfig } from "../../config";
import { ApiError, databaseError } from "../../shared/errors";
import type { signInSchema, signUpSchema } from "./auth.schema";

export function authError(error: AuthError): never {
  if (error.status === 429) throw new ApiError(429, "RATE_LIMITED", "Thử lại sau; dịch vụ xác thực đang giới hạn yêu cầu.");
  if (error.status && error.status >= 500) throw new ApiError(503, "AUTH_UNAVAILABLE", "Dịch vụ xác thực chưa sẵn sàng. Kiểm tra cấu hình và migration.");
  if (error.code === "invalid_credentials") throw new ApiError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
  if (error.code === "email_not_confirmed") throw new ApiError(403, "EMAIL_NOT_CONFIRMED", "Xác nhận email trước khi đăng nhập.");
  throw new ApiError(400, "AUTH_ERROR", "Không thể hoàn tất xác thực. Kiểm tra thông tin hoặc yêu cầu liên kết mới.");
}

export function authPayload(user: User | null, session: Session | null) {
  return {
    user: user ? { id: user.id, email: user.email } : null,
    // Refresh token remains in the Supabase cookie jar; do not store it in UI state.
    session: session ? { accessToken: session.access_token, tokenType: session.token_type, expiresAt: session.expires_at } : null,
  };
}

export async function signUp(db: SupabaseClient, input: z.infer<typeof signUpSchema>) {
  const exists = await db.from("profiles").select("id").eq("username", input.username).maybeSingle();
  if (exists.error) databaseError(exists.error);
  if (exists.data) throw new ApiError(409, "USERNAME_TAKEN", "Username đã được sử dụng.");
  const { data, error } = await db.auth.signUp({
    email: input.email, password: input.password,
    options: {
      data: { username: input.username, display_name: input.displayName },
      emailRedirectTo: `${getConfig().origin}/api/v1/auth/callback`,
    },
  });
  if (error) authError(error);
  return { ...authPayload(data.user, data.session), requiresEmailConfirmation: !data.session };
}

export async function signIn(db: SupabaseClient, input: z.infer<typeof signInSchema>) {
  const { data, error } = await db.auth.signInWithPassword(input);
  if (error) authError(error);
  return authPayload(data.user, data.session);
}
