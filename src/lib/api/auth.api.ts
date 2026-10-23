import type { AuthResult, AuthUser, SignInInput, SignUpInput } from "@/types/auth.types";
import type { ApiResponse } from "@/types/api.types";
import { apiFetch, ApiClientError } from "./client";

export async function getSession(signal?: AbortSignal) {
  try {
    return await apiFetch<ApiResponse<{ user: AuthUser | null }>>("/auth/session", { signal });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return { data: { user: null } };
    throw error;
  }
}

const post = <T>(path: string, body?: unknown) => apiFetch<ApiResponse<T>>(path, {
  method: "POST", ...(body ? { body: JSON.stringify(body) } : {}),
});
export const signIn = (input: SignInInput) => post<AuthResult>("/auth/sign-in", input);
export const signUp = (input: SignUpInput) => post<AuthResult>("/auth/sign-up", input);
export const startGoogleSignIn = () => post<{ url: string }>("/auth/google");
export const signOut = () => apiFetch<void>("/auth/sign-out", { method: "POST" });
export const resendConfirmation = (email: string) => post<{ message: string }>("/auth/resend", { email });
export const forgotPassword = (email: string) => post<{ message: string }>("/auth/forgot-password", { email });
export const updatePassword = (password: string) => post<{ message: string }>("/auth/password", { password });
