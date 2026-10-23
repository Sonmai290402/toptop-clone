export type UserRole = "user" | "admin";

export type AuthUser = {
  id: string;
  email?: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
};

export type AuthResult = {
  user: AuthUser | null;
  session: { accessToken: string; tokenType: string; expiresAt?: number } | null;
  requiresEmailConfirmation?: boolean;
};

export type SignInInput = { email: string; password: string };
export type SignUpInput = SignInInput & { username: string; displayName: string };
