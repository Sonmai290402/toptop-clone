"use client";
import { useTranslations as useUiTranslations } from "next-intl";

import type { ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function RequireAuth({ children, message = "Sign in to use this feature." }: { children: ReactNode; message?: string }) {
  const ui = useUiTranslations("ui");
  const { user, isLoading, error, openAuth, retrySession } = useAuth();
  if (isLoading) return <p role="status" className="p-6 text-muted-foreground">{ui('checking_your_session')}</p>;
  if (error) return <div className="space-y-4 p-6"><p role="alert">{ui('unable_to_verify_your_session')}</p><Button onClick={retrySession}>{ui('try_again')}</Button></div>;
  if (!user) return <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center"><h1 className="text-2xl font-bold">{ui('join_toptop')}</h1><p className="text-muted-foreground">{message}</p><Button onClick={() => openAuth("sign-in", message)}>{ui('sign_in')}</Button><Button variant="outline" onClick={() => openAuth("sign-up", message)}>{ui('create_account')}</Button></div>;
  return children;
}
