import "server-only";
import { z } from "zod";
import type { SoundPage } from "@/lib/sounds";
import { readThroughCache, invalidateCache } from "./cache";
import { cacheKey, getRedis } from "./redis";

const key = "sounds:list:v1:first-page:20";
const soundPageSchema = z.object({
  data: z.array(z.object({
    id: z.string(), title: z.string(), artist: z.string(),
    audioUrl: z.string().url(), durationMs: z.number(),
  })),
  pagination: z.object({ hasMore: z.boolean(), nextOffset: z.number().nullable() }),
});

export function cachedSoundPage(load: () => Promise<SoundPage>) {
  return readThroughCache(getRedis(), cacheKey(key), 60, value => {
    const result = soundPageSchema.safeParse(value);
    return result.success ? result.data : undefined;
  }, load);
}

export function invalidateSoundPage() {
  return invalidateCache(getRedis(), cacheKey(key));
}
