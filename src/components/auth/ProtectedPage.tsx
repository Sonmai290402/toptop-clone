"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function ProtectedPage({ children }: { children: ReactNode }) {
  const { user, isLoading, error, retrySession } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !user && !error) router.replace("/");
  }, [user, isLoading, error, router]);
  if (isLoading) return <p role="status" className="p-6">Checking your session...</p>;
  if (error) return <div className="space-y-3 p-6"><p role="alert">Unable to verify your session.</p><Button onClick={retrySession}>Try again</Button></div>;
  if (!user) return null;
  return children;
}
