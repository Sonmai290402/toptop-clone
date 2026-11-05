import { Suspense } from "react";
import Search from "@/modules/Search";

export default function SearchPage() {
  return <Suspense fallback={null}><Search /></Suspense>;
}
