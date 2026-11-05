import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import { Suspense } from "react";
import Search from "@/modules/Search";

export default function SearchPage() {
  return <Suspense fallback={<LoadingSkeleton variant="users" />}><Search /></Suspense>;
}
