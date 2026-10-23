"use client";

import Link from "next/link";
import { LogIn, LogOut, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function SidebarAccount({ collapsed }: { collapsed: boolean }) {
  const { user, isLoading, error, retrySession, openAuth, logout, isSigningOut, signOutError } = useAuth();
  if (isLoading && !user) return <p role="status" className="p-2 text-xs text-muted-foreground">Đang tải...</p>;
  if (!user) return (
    <div className="space-y-2">
      {error && !collapsed && <div className="text-xs text-muted-foreground"><p>Chưa kiểm tra được phiên đăng nhập.</p><button type="button" className="text-primary" onClick={retrySession}>Thử lại</button></div>}
      <Button className="w-full" aria-label="Đăng nhập" size={collapsed ? "icon" : "lg"} onClick={() => openAuth()}>
        {collapsed ? <LogIn /> : "Đăng nhập"}
      </Button>
      {!collapsed && <Button variant="outline" className="w-full" onClick={() => openAuth("sign-up")}>Đăng ký</Button>}
    </div>
  );
  return (
    <Popover>
      <PopoverTrigger render={<button type="button" aria-label="Tài khoản" className="flex w-full min-w-0 items-center gap-2 rounded-full bg-accent p-2 text-left" />}>
        <Avatar size={collapsed ? "sm" : "lg"}>
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
          <AvatarFallback>{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        {!collapsed && <>
          <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{user.displayName}</span><span className="block truncate text-xs text-muted-foreground">{user.username ? `@${user.username}` : user.email}</span></span>
          <ChevronsUpDown className="size-4 shrink-0" />
        </>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div className="min-w-0"><p className="truncate font-semibold">{user.displayName}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p><p className="mt-1 text-xs text-primary">{user.role === "admin" ? "Quản trị viên" : "Thành viên"}</p></div>
        {user.username && <Link className="block text-sm hover:text-primary" href={`/@${encodeURIComponent(user.username)}`}>Xem hồ sơ</Link>}
        <Link className="block text-sm hover:text-primary" href="/auth/reset-password">Đổi mật khẩu</Link>
        <Button variant="outline" className="w-full" disabled={isSigningOut} onClick={logout}><LogOut />{isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}</Button>
        {signOutError && <p role="alert" className="text-xs text-destructive">{signOutError.message}</p>}
      </PopoverContent>
    </Popover>
  );
}
