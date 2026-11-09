import assert from "node:assert/strict";
import { test } from "node:test";
import { consumeRateLimit, requestPolicy, requestIdentity, RateLimitError } from "../../src/server/cache/rate-limit";

test("rate policies cover auth, email, search, comments, uploads and interactions", () => {
  for (const [method, path, name] of [
    ["POST", "/api/v1/auth/sign-in", "auth"], ["POST", "/api/v1/auth/sign-up", "auth"],
    ["POST", "/api/v1/auth/resend", "auth-email"], ["POST", "/api/v1/auth/forgot-password", "auth-email"],
    ["GET", "/api/v1/users/search", "search"], ["POST", "/api/v1/posts/id/comments", "comments"],
    ["PUT", "/api/v1/post-comments/id/like", "interactions"], ["DELETE", "/api/v1/users/id/follow", "interactions"],
    ["POST", "/api/v1/admin/sounds/uploads/id/complete", "uploads"], ["PATCH", "/api/v1/me/avatar", "uploads"],
  ]) assert.equal(requestPolicy(method, path)?.name, name);
  assert.equal(requestPolicy("POST", "/api/v1/auth/sign-out"), null);
  assert.equal(requestPolicy("GET", "/api/v1/auth/callback"), null);
  assert.equal(requestPolicy("GET", "/api/v1/posts/feed"), null);
});

test("identity trusts verified users and Vercel proxy headers only", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.10", "x-real-ip": "203.0.113.11" });
  assert.equal(requestIdentity(headers, "user-id", true), "user:user-id");
  assert.equal(requestIdentity(headers, undefined, true), "ip:203.0.113.10");
  assert.equal(requestIdentity(headers, undefined, false), "ip:unknown");
  assert.equal(requestIdentity(new Headers({ "x-forwarded-for": "spoof" }), undefined, true), "ip:unknown");
});

test("limit boundary accepts allowed requests then returns a retry interval", async () => {
  const policy = { name: "test", limit: 2, seconds: 60 };
  let count = 0;
  const store = { eval: async () => [++count, 45] };
  await consumeRateLimit(store, "test", policy);
  await consumeRateLimit(store, "test", policy);
  await assert.rejects(consumeRateLimit(store, "test", policy), error =>
    error instanceof RateLimitError && error.status === 429 && error.retryAfter === 45);
});

test("sensitive actions fail closed on Redis errors while ordinary actions remain available", async () => {
  const store = { eval: async () => { throw new Error("Offline"); } };
  const policy = { name: "test", limit: 1, seconds: 60 };
  await consumeRateLimit(store, "test", policy);
  await assert.rejects(consumeRateLimit(store, "test", { ...policy, sensitive: true }), { code: "RATE_LIMIT_UNAVAILABLE", status: 503 });
  await assert.rejects(consumeRateLimit({ eval: async () => null }, "test", { ...policy, sensitive: true }), { status: 503 });
});
