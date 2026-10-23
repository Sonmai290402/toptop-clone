"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";

function ConfirmationResult() {
  const params = useSearchParams();
  const { user, openAuth, isLoading } = useAuth();
  const failed = params.has("error");
  return <div className="mx-auto max-w-md space-y-5 px-6 py-16 text-center">
    <h1 className="text-2xl font-bold">{failed ? "Chưa hoàn tất xác nhận" : "Đã xác nhận email"}</h1>
    <p className="text-muted-foreground">{failed ? "Liên kết có thể đã hết hạn hoặc được mở trên trình duyệt khác. Thử đăng nhập nếu email đã được xác nhận, hoặc yêu cầu gửi lại email." : "Tài khoản đã sẵn sàng. Bạn có thể tiếp tục khám phá Toptop."}</p>
    {!user && <Button disabled={isLoading} onClick={() => openAuth()}>Đăng nhập</Button>}
    <Link href="/" className="block text-primary hover:underline">Về trang chủ</Link>
  </div>;
}

export default function ConfirmedPage() {
  return <main className="min-w-0 flex-1"><Suspense fallback={<p>Đang tải...</p>}><ConfirmationResult /></Suspense></main>;
}
