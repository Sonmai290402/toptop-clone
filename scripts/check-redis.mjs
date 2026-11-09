import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const prefix = process.env.REDIS_KEY_PREFIX;

if (!url || !token || !prefix) {
  console.error("Set UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN and REDIS_KEY_PREFIX in .env.local.");
  process.exitCode = 1;
} else {
  let redis;
  const key = `${prefix}:health:${randomUUID()}`;
  try {
    redis = new Redis({ url, token, retry: { retries: 0 }, signal: () => AbortSignal.timeout(5000) });
    await redis.set(key, "connected", { ex: 30 });
    if (await redis.get(key) !== "connected") throw new Error("Unexpected response");
    console.log("Redis SET/GET successful.");
    if (process.env.REDIS_CACHE_ENABLED === "false") console.log("Application caching is disabled by REDIS_CACHE_ENABLED.");
  } catch {
    console.error("Redis connection check failed. Check credentials, database status and network access.");
    process.exitCode = 1;
  } finally {
    if (redis) {
      try {
        await redis.del(key);
        console.log("Diagnostic key removed.");
      } catch {
        console.error("Cleanup failed; the diagnostic key expires within 30 seconds.");
        process.exitCode = 1;
      }
    }
  }
}
