"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession, signOut } from "@/lib/api/auth.api";
import type { AuthUser } from "@/types/auth.types";
import AuthDialog from "@/components/auth/AuthDialog";

const sessionKey = ["auth", "session"] as const;
export type AuthMode = "sign-in" | "sign-up" | "forgot-password";
type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  openAuth: (mode?: AuthMode, reason?: string) => void;
  requireAuth: (reason?: string) => boolean;
  completeSignIn: (user: AuthUser) => Promise<void>;
  logout: () => void;
  isSigningOut: boolean;
  signOutError: Error | null;
  retrySession: () => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requires AuthProvider");
  return context;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const channel = useRef<BroadcastChannel | null>(null);
  const [dialog, setDialog] = useState<{ mode: AuthMode; reason?: string } | null>(null);
  const session = useQuery({
    queryKey: sessionKey,
    queryFn: ({ signal }) => getSession(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 4 * 60_000,
    retry: 1,
  });
  const user = session.data?.data.user ?? null;

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const connection = new BroadcastChannel("toptop-auth");
    channel.current = connection;
    connection.onmessage = () => {
      void client.cancelQueries().then(() => {
        client.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
        // Hide the previous identity until this tab revalidates the cookies.
        client.setQueryData(sessionKey, { data: { user: null } });
        void client.invalidateQueries({ queryKey: sessionKey });
      });
    };
    return () => { channel.current = null; connection.close(); };
  }, [client]);

  const replaceSession = useCallback(async (nextUser: AuthUser | null) => {
    await client.cancelQueries();
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
    client.setQueryData(sessionKey, { data: { user: nextUser } });
    channel.current?.postMessage("session-changed");
  }, [client]);

  const completeSignIn = useCallback(async (nextUser: AuthUser) => {
    await replaceSession(nextUser);
    setDialog(null);
  }, [replaceSession]);

  const logout = useMutation({
    mutationFn: signOut,
    onSuccess: () => replaceSession(null),
  });

  const openAuth = (mode: AuthMode = "sign-in", reason?: string) => setDialog({ mode, reason });
  return (
    <AuthContext.Provider value={{
      user,
      isLoading: session.isPending || logout.isPending,
      error: session.error,
      openAuth,
      requireAuth: (reason) => {
        if (session.isPending || logout.isPending) return false;
        if (user && !session.error) return true;
        openAuth("sign-in", reason);
        return false;
      },
      completeSignIn,
      logout: () => logout.mutate(),
      isSigningOut: logout.isPending,
      signOutError: logout.error,
      retrySession: () => { void session.refetch(); },
    }}>
      {children}
      <AuthDialog
        key={dialog?.mode ?? "closed"}
        open={dialog !== null}
        mode={dialog?.mode ?? "sign-in"}
        reason={dialog?.reason}
        onClose={() => setDialog(null)}
        onModeChange={(mode) => setDialog({ mode, reason: dialog?.reason })}
      />
    </AuthContext.Provider>
  );
}
