import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import { Suspense, type ReactNode } from "react";
import AdminGuard from "@/components/auth/AdminGuard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingSkeleton variant="page" />}><AdminGuard>{children}</AdminGuard></Suspense>;
}
