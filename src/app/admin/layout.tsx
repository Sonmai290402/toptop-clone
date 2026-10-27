import { Suspense, type ReactNode } from "react";
import AdminGuard from "@/components/auth/AdminGuard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p className="p-6">Checking admin access...</p>}><AdminGuard>{children}</AdminGuard></Suspense>;
}
