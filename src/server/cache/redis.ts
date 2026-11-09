import "server-only";
import { Redis } from "@upstash/redis";

let client: Redis | undefined;

export function getRedis(purpose: "cache" | "rate-limit" = "cache") {
  if (process.env[purpose === "cache" ? "REDIS_CACHE_ENABLED" : "REDIS_RATE_LIMIT_ENABLED"] === "false") return null;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !process.env.REDIS_KEY_PREFIX) return null;
  try {
    client ??= new Redis({
      url,
      token,
      retry: { retries: 0 },
      signal: () => AbortSignal.timeout(800),
      enableAutoPipelining: false,
    });
  } catch {
    console.warn("Redis configuration is invalid; caching is disabled.");
    return null;
  }
  return client;
}

export function cacheKey(key: string) {
  return `${process.env.REDIS_KEY_PREFIX}:${key}`;
}
