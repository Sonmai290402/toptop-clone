import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { api } from "../../src/server/shared/http";

test("API returns 429 and Retry-After before calling Auth or the handler", async () => {
  const before = { ...process.env };
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, {
    APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
    REDIS_KEY_PREFIX: "test:http-rate",
    REDIS_RATE_LIMIT_ENABLED: "true",
  });
  let calls = 0;
  globalThis.fetch = async input => {
    assert.ok(String(input).startsWith("https://redis.example.com"));
    calls++;
    return new Response(JSON.stringify({ result: [16, 42] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const handler = api(async () => { throw new Error("Handler must not execute"); }, { auth: "none", cookieOnly: true });
    const response = await handler(new NextRequest("http://localhost:3000/api/v1/auth/sign-in", {
      method: "POST", headers: { origin: "http://localhost:3000" },
    }));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "42");
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal((await response.json()).error.code, "RATE_LIMITED");
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
});
