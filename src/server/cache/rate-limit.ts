import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { ApiError } from "@/server/shared/errors";
import { cacheKey, getRedis } from "./redis";

export type RatePolicy = { name: string; limit: number; seconds: number; sensitive?: boolean };

export function requestPolicy(method: string, path: string): RatePolicy | null {
  if (method === "POST" && /^\/api\/v1\/auth\/(sign-in|sign-up)$/.test(path))
    return { name: "auth", limit: 15, seconds: 900, sensitive: true };
  if (method === "POST" && /^\/api\/v1\/auth\/(forgot-password|resend)$/.test(path))
    return { name: "auth-email", limit: 5, seconds: 900, sensitive: true };
  if (method === "GET" && path === "/api/v1/users/search")
    return { name: "search", limit: 60, seconds: 60 };
  if (["GET", "HEAD", "OPTIONS"].includes(method) || path.startsWith("/api/v1/auth/")) return null;
  if (path.includes("/uploads") || path === "/api/v1/me/avatar")
    return { name: "uploads", limit: 30, seconds: 600, sensitive: true };
  if (method === "POST" && /\/(posts|videos)\/[^/]+\/comments$/.test(path))
    return { name: "comments", limit: 15, seconds: 60 };
  if (/\/(like|save|follow)$/.test(path))
    return { name: "interactions", limit: 120, seconds: 60 };
  return { name: "writes", limit: 60, seconds: 60 };
}

export function requestIdentity(headers: Headers, userId?: string, vercel = process.env.VERCEL === "1") {
  if (userId) return `user:${userId}`;
  // Only trust a header overwritten by the deployment proxy. Local callers share a bucket.
  const ip = vercel ? headers.get("x-forwarded-for")?.split(",")[0].trim() : undefined;
  return ip && isIP(ip) ? `ip:${ip}` : "ip:unknown";
}

export const rateLimitScript = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

export class RateLimitError extends ApiError {
  constructor(public retryAfter: number) {
    super(429, "RATE_LIMITED", "Too many requests. Please try again later.");
  }
}

export interface RateStore {
  eval(script: string, keys: string[], args: number[]): Promise<unknown>;
}

export async function consumeRateLimit(store: RateStore, key: string, policy: RatePolicy) {
  let result: unknown;
  try {
    result = await store.eval(rateLimitScript, [key], [policy.seconds]);
    if (!Array.isArray(result) || result.length !== 2 || !result.every(value => typeof value === "number" && Number.isFinite(value))) {
      throw new Error("Invalid rate limit result");
    }
  } catch {
    console.warn("Redis rate limiting is unavailable.");
    if (policy.sensitive) throw new ApiError(503, "RATE_LIMIT_UNAVAILABLE", "This action is temporarily unavailable. Please try again shortly.");
    return;
  }
  const [count, ttl] = result as number[];
  if (count > policy.limit) throw new RateLimitError(Math.max(1, ttl));
}

export async function enforceRequestLimit(request: Request, userId?: string) {
  const policy = requestPolicy(request.method, new URL(request.url).pathname);
  if (!policy) return;
  const redis = getRedis("rate-limit");
  if (!redis) return;
  const identity = requestIdentity(request.headers, userId);
  // Store neither raw IP addresses nor account IDs in Redis keys.
  const hash = createHmac("sha256", process.env.UPSTASH_REDIS_REST_TOKEN!).update(identity).digest("hex");
  await consumeRateLimit(redis, cacheKey(`rate:v1:${policy.name}:${hash}`), policy);
}
