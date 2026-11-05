"use client";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import { useTranslations as useUiTranslations } from "next-intl";

import { UserRole } from "@/types/role.types";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const ui = useUiTranslations("ui");
  const { user, isLoading, error, retrySession } = useAuth();
  const router = useRouter();
  const allowed = user?.role === UserRole.ADMIN;
  useEffect(() => {
    if (!isLoading && !error && !allowed) router.replace("/");
  }, [isLoading, error, allowed, router]);
  if (isLoading) return <LoadingSkeleton variant="page" />;
  if (error) return <div className="space-y-3 p-6"><p role="alert">{ui('unable_to_verify_admin_access')}</p><Button onClick={retrySession}>{ui('try_again')}</Button></div>;
  if (!allowed) return null;
  return children;
}
