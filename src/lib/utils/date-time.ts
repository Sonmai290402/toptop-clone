export type DateInput = string | number | Date | null | undefined;
export type RelativeDate = { unit: "now" | "minute" | "hour" | "day"; count: number } | { unit: "absolute" } | { unit: "invalid" };

export function parseDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  // Require an explicit offset for string timestamps to avoid server/client ambiguity.
  if (typeof value === "string" && !/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function relativeDate(value: DateInput, now = Date.now(), absoluteAfterDays = 7): RelativeDate {
  const date = parseDate(value);
  if (!date || !Number.isFinite(now)) return { unit: "invalid" };
  const seconds = (now - date.getTime()) / 1000;
  if (seconds <= -60 || seconds >= absoluteAfterDays * 86400) return { unit: "absolute" };
  if (seconds < 60) return { unit: "now", count: 0 };
  if (seconds < 3600) return { unit: "minute", count: Math.floor(seconds / 60) };
  if (seconds < 86400) return { unit: "hour", count: Math.floor(seconds / 3600) };
  return { unit: "day", count: Math.floor(seconds / 86400) };
}

export function formatDateTime(value: DateInput, timeZone?: string): string {
  const date = parseDate(value);
  if (!date) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
    hourCycle: "h23", ...(timeZone ? { timeZone } : {}),
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
  return `${get("hour")}:${get("minute")}, ${get("day")}/${get("month")}/${get("year")}`;
}
