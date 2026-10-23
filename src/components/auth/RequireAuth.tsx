"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function RequireAuth({ children, message = "Đăng nhập để sử dụng tính năng này." }: { children: ReactNode; message?: string }) {
  const { user, isLoading, error, openAuth, retrySession } = useAuth();
  if (isLoading) return <p role="status" className="p-6 text-muted-foreground">Đang kiểm tra đăng nhập...</p>;
  if (error) return <div className="space-y-4 p-6"><p role="alert">Không thể kiểm tra phiên đăng nhập.</p><Button onClick={retrySession}>Thử lại</Button></div>;
  if (!user) return <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center"><h1 className="text-2xl font-bold">Tham gia Toptop</h1><p className="text-muted-foreground">{message}</p><Button onClick={() => openAuth("sign-in", message)}>Đăng nhập</Button><Button variant="outline" onClick={() => openAuth("sign-up", message)}>Tạo tài khoản</Button></div>;
  return children;
}
