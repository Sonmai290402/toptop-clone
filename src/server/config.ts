import "server-only";
import { z } from "zod";
import { ApiError } from "./shared/errors";

export function getConfig() {
  const result = z.object({
    url: z.url(),
    key: z.string().min(10),
    appUrl: z.url(),
  }).safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    appUrl: process.env.APP_URL,
  });
  if (!result.success || result.data.url.includes("YOUR_PROJECT") || result.data.key.includes("YOUR_")) {
    throw new ApiError(503, "BACKEND_NOT_CONFIGURED", "Cấu hình Supabase và APP_URL trong .env.local trước khi dùng API.");
  }
  return { ...result.data, origin: new URL(result.data.appUrl).origin };
}
