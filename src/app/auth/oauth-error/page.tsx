"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";

function OAuthError() {
  const cancelled = useSearchParams().get("reason") === "cancelled";
  const { openAuth } = useAuth();
  const google = useGoogleSignIn();
  return <div className="mx-auto max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
    <CircleAlert className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
    <h1 className="text-2xl font-bold">{cancelled ? "Bạn đã hủy đăng nhập" : "Chưa thể đăng nhập Google"}</h1>
    <p className="text-sm leading-6 text-muted-foreground">{cancelled
      ? "Bạn có thể thử lại khi sẵn sàng, hoặc tiếp tục xem video mà không cần tài khoản."
      : "Liên kết có thể đã hết hạn, được mở trên trình duyệt khác, hoặc dịch vụ đăng nhập chưa sẵn sàng. Hãy bắt đầu lại trên trình duyệt này."}</p>
    <GoogleSignInButton pending={google.isRedirecting} onClick={() => google.mutate()} />
    {google.error && <p role="alert" className="text-sm text-destructive">{google.error.message}</p>}
    <Button variant="ghost" className="w-full" disabled={google.isRedirecting} onClick={() => openAuth()}>Đăng nhập bằng email</Button>
    <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground">Tiếp tục xem video</Link>
  </div>;
}

export default function OAuthErrorPage() {
  return <main className="min-w-0 flex-1 px-4 py-16"><Suspense fallback={<p role="status">Đang tải...</p>}><OAuthError /></Suspense></main>;
}
