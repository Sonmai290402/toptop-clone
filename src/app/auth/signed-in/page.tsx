"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SignedInPage() {
  const { user, isLoading, error, retrySession, openAuth, completeSignIn } = useAuth();
  const notified = useRef(false);

  useEffect(() => {
    // Verify through /auth/session before updating other tabs or showing success.
    if (!user || isLoading || error || notified.current) return;
    notified.current = true;
    void completeSignIn(user);
  }, [user, isLoading, error, completeSignIn]);

  return <main className="min-w-0 flex-1 px-4 py-16">
    <div className="mx-auto max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
      {isLoading ? <div role="status" className="space-y-4">
        <LoaderCircle className="mx-auto size-8 animate-spin text-primary" aria-hidden="true" />
        <p>Đang kiểm tra phiên đăng nhập...</p>
      </div> : error ? <>
        <h1 className="text-2xl font-bold">Chưa kiểm tra được đăng nhập</h1>
        <p role="alert" className="text-muted-foreground">Không thể tải tài khoản. Kiểm tra kết nối rồi thử lại.</p>
        <Button onClick={retrySession}>Thử lại</Button>
      </> : user ? <>
        <CheckCircle2 className="mx-auto size-10 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Đăng nhập thành công</h1>
        <Avatar className="mx-auto size-16">
          <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
          <AvatarFallback>{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="break-words text-muted-foreground">Chào mừng <span className="font-semibold text-foreground">{user.displayName}</span> đến với Toptop.</p>
        <Button render={<Link href="/" />} className="h-11 w-full">Khám phá video</Button>
      </> : <>
        <h1 className="text-2xl font-bold">Phiên đăng nhập chưa sẵn sàng</h1>
        <p className="text-muted-foreground">Vui lòng đăng nhập lại trên trình duyệt này để tiếp tục.</p>
        <Button onClick={() => openAuth()}>Đăng nhập lại</Button>
      </>}
      {!user && <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground">Về trang chủ</Link>}
    </div>
  </main>;
}
