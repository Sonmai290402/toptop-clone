import "server-only";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { readThroughCache, type CacheStore } from "./cache";
import { cacheKey, getRedis } from "./redis";

const generationKey = "discovery:v1:generation";

// Generation keys prevent an in-flight old query from refilling the current cache.
export async function cachedDiscovery<T>(key: string, schema: z.ZodType<T>, load: () => Promise<T>, redis: CacheStore | null = getRedis()) {
  if (!redis) return load();
  let generation: unknown;
  try {
    generation = await redis.get(cacheKey(generationKey));
    if (generation !== null && typeof generation !== "string") return load();
  } catch {
    console.warn("Redis discovery cache unavailable; using the database.");
    return load();
  }
  return readThroughCache(redis, cacheKey(`discovery:v1:${generation ?? "initial"}:${key}`), 30, value => {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
  }, load);
}

export async function invalidateDiscovery(redis: CacheStore | null = getRedis()) {
  try {
    await redis?.set(cacheKey(generationKey), randomUUID(), { ex: 3600 });
  } catch {
    console.warn("Redis discovery invalidation failed; cached data expires within 30 seconds.");
  }
}
