"use client";
import { useTranslations as useUiTranslations } from "next-intl";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function ProtectedPage({ children }: { children: ReactNode }) {
  const ui = useUiTranslations("ui");
  const { user, isLoading, error, retrySession } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !user && !error) router.replace("/");
  }, [user, isLoading, error, router]);
  if (isLoading) return <p role="status" className="p-6">{ui('checking_your_session')}</p>;
  if (error) return <div className="space-y-3 p-6"><p role="alert">{ui('unable_to_verify_your_session')}</p><Button onClick={retrySession}>{ui('try_again')}</Button></div>;
  if (!user) return null;
  return children;
}
