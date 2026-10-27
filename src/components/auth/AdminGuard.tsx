"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isLoading, error, retrySession } = useAuth();
  const router = useRouter();
  const allowed = user?.role === "admin";
  useEffect(() => {
    if (!isLoading && !error && !allowed) router.replace("/");
  }, [isLoading, error, allowed, router]);
  if (isLoading) return <p role="status" className="p-6">Checking admin access...</p>;
  if (error) return <div className="space-y-3 p-6"><p role="alert">Unable to verify admin access.</p><Button onClick={retrySession}>Try again</Button></div>;
  if (!allowed) return null;
  return children;
}
