"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function RequireAuth({ children, message = "Sign in to use this feature." }: { children: ReactNode; message?: string }) {
  const { user, isLoading, error, openAuth, retrySession } = useAuth();
  if (isLoading) return <p role="status" className="p-6 text-muted-foreground">Checking your session...</p>;
  if (error) return <div className="space-y-4 p-6"><p role="alert">Unable to verify your session.</p><Button onClick={retrySession}>Try again</Button></div>;
  if (!user) return <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center"><h1 className="text-2xl font-bold">Join Toptop</h1><p className="text-muted-foreground">{message}</p><Button onClick={() => openAuth("sign-in", message)}>Sign in</Button><Button variant="outline" onClick={() => openAuth("sign-up", message)}>Create account</Button></div>;
  return children;
}
