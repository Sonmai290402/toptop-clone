"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { formatDateTime, parseDate, relativeDate, type DateInput } from "@/lib/utils/date-time";

const listeners = new Set<() => void>();
let currentTime: number | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    currentTime = Date.now();
    timer = setInterval(() => {
      currentTime = Date.now();
      listeners.forEach(notify => notify());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { clearInterval(timer); timer = undefined; currentTime = null; }
  };
}
const snapshot = () => currentTime;
const serverSnapshot = () => null;

export default function RelativeTime({ value, className, timeZone, absoluteAfterDays = 7 }: {
  value: DateInput; className?: string; timeZone?: string; absoluteAfterDays?: number;
}) {
  const now = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const t = useTranslations("time");
  const date = parseDate(value);
  const absolute = now === null ? undefined : formatDateTime(value, timeZone);
  const relative = now === null ? null : relativeDate(value, now, absoluteAfterDays);
  const text = !relative || relative.unit === "invalid" ? "—"
    : relative.unit === "absolute" ? absolute
      : t(relative.unit, { count: relative.count });
  return <time dateTime={date?.toISOString()} title={absolute} className={className}>{text}</time>;
}
