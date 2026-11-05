"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

type Variant = "page" | "profile" | "grid" | "users" | "comments" | "feed" | "watch" | "account";

function Rows({ count = 4, avatar = true }: { count?: number; avatar?: boolean }) {
  return <div className="space-y-5">{Array.from({ length: count }, (_, index) => <div key={index} className="flex gap-3">
    {avatar && <Skeleton className="size-10 shrink-0 rounded-full" />}
    <div className="flex-1 space-y-2 py-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
  </div>)}</div>;
}

function Grid() {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="aspect-[3/4] w-full rounded-lg" />)}</div>;
}

export default function LoadingSkeleton({ variant = "page" }: { variant?: Variant }) {
  const t = useTranslations();
  return <div role="status" aria-busy="true" aria-label={t("loading")} className={`w-full min-w-0 ${variant === "watch" || variant === "feed" ? "h-full min-h-0" : ""}`}>
    <span className="sr-only">{t("loading")}</span>
    <div aria-hidden="true" className={variant === "watch" || variant === "feed" ? "h-full" : ""}>
      {variant === "account" ? <Rows count={1} />
        : variant === "grid" ? <Grid />
        : variant === "users" || variant === "comments" ? <Rows count={variant === "users" ? 5 : 3} />
        : variant === "profile" ? <div className="mx-auto max-w-[1296px] space-y-8"><div className="flex items-center gap-6"><Skeleton className="size-24 shrink-0 rounded-full sm:size-40" /><div className="flex-1 space-y-4"><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-10 w-32" /><Skeleton className="h-4 w-3/4" /></div></div><Skeleton className="h-10 w-full" /><Grid /></div>
        : variant === "feed" || variant === "watch" ? <div className="grid h-full min-h-0 gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]"><div className="flex min-h-0 justify-center"><Skeleton className="h-full min-h-64 w-full max-w-md rounded-xl" /></div><div className="hidden space-y-8 rounded-xl border p-4 lg:block"><Rows count={1} /><Rows count={4} /><Skeleton className="h-10 w-full" /></div></div>
        : <div className="mx-auto max-w-3xl space-y-6 p-6"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-10 w-full" /><Rows /></div>}
    </div>
  </div>;
}
