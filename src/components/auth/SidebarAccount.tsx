"use client";

import { UserRole } from "@/types/role.types";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogIn, LogOut, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function SidebarAccount({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations();
  const {
    user,
    isLoading,
    error,
    retrySession,
    openAuth,
    logout,
    isSigningOut,
    signOutError,
  } = useAuth();
  if (isLoading && !user)
    return (
      <p role="status" className="p-2 text-xs text-muted-foreground">
        Loading...
      </p>
    );
  if (!user)
    return (
      <div className="space-y-2">
        {error && !collapsed && (
          <div className="text-xs text-muted-foreground">
            <p>Unable to verify your session.</p>
            <button
              type="button"
              className="text-primary"
              onClick={retrySession}
            >
              Try again
            </button>
          </div>
        )}
        <Button
          className="w-full"
          aria-label="Sign in"
          size={collapsed ? "icon" : "lg"}
          onClick={() => openAuth()}
        >
          {collapsed ? <LogIn /> : "Sign in"}
        </Button>
        {!collapsed && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => openAuth("sign-up")}
          >
            Sign up
          </Button>
        )}
      </div>
    );
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Account"
            className="flex w-full min-w-0 items-center gap-2 rounded-full bg-accent p-2 text-left"
          />
        }
      >
        <Avatar size={collapsed ? "sm" : "lg"}>
          <AvatarImage
            src={user.avatarUrl ?? undefined}
            alt={user.displayName}
          />
          <AvatarFallback>
            {user.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {user.displayName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.username ? `@${user.username}` : user.email}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        {user.username && (
          <Link
            className="block text-sm hover:text-primary"
            href={`/@${encodeURIComponent(user.username)}`}
          >
            {t("profile")}
          </Link>
        )}
        {user.role === UserRole.ADMIN && <Link className="block text-sm hover:text-primary" href="/admin">Admin</Link>}
        <Link
          className="block text-sm hover:text-primary"
          href="/auth/reset-password"
        >
          {t("change-password")}
        </Link>
        <Button
          variant="outline"
          className="w-full"
          disabled={isSigningOut}
          onClick={logout}
        >
          <LogOut />
          {isSigningOut ? "Signing out..." : t("logout")}
        </Button>
        {signOutError && (
          <p role="alert" className="text-xs text-destructive">
            {signOutError.message}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
