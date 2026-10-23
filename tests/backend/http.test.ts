import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { z } from "zod";
import { api, assertOrigin } from "../../src/server/shared/http";
import { decodeCursor, encodeCursor, paginate } from "../../src/server/shared/pagination";
import { parse, readJson } from "../../src/server/shared/validation";
import { createCommentSchema } from "../../src/server/modules/comments/comment.schema";
import { updateProfileSchema } from "../../src/server/modules/users/user.schema";
import { feedQuery, videoCursor } from "../../src/server/modules/videos/video.schema";

test("unsafe cookie requests require the configured origin", () => {
  const request = (headers: HeadersInit) => new Request("http://localhost/api", { method: "POST", headers });
  assert.throws(() => assertOrigin(request({}), "http://localhost:3000", false), /Origin/);
  assert.throws(() => assertOrigin(request({ origin: "https://evil.example" }), "http://localhost:3000", false), /Origin/);
  assert.doesNotThrow(() => assertOrigin(request({ origin: "http://localhost:3000" }), "http://localhost:3000", false));
  assert.doesNotThrow(() => assertOrigin(request({ authorization: "Bearer token" }), "http://localhost:3000", true));
  assert.throws(() => assertOrigin(request({ origin: "https://evil.example", authorization: "Bearer token" }), "http://localhost:3000", true));
});

test("input validation rejects spoofed ownership, invalid limits and unexpected profile fields", () => {
  assert.throws(() => parse(createCommentSchema, { content: "hello", authorId: "another-user" }));
  assert.throws(() => parse(createCommentSchema, { content: "   " }));
  assert.throws(() => parse(updateProfileSchema, { username: "changed" }));
  assert.throws(() => parse(updateProfileSchema, { avatarUrl: "javascript:alert(1)" }));
  assert.throws(() => parse(updateProfileSchema, {}));
  assert.throws(() => parse(feedQuery, { limit: "1000" }));
  assert.deepEqual(parse(feedQuery, {}), { feed: "latest", limit: 10 });
});

test("JSON reader enforces media type, valid JSON and a streamed size cap", async () => {
  const request = (body: string, contentType = "application/json") => new Request("http://localhost", { method: "POST", headers: { "Content-Type": contentType }, body });
  await assert.rejects(readJson(request("{", "text/plain"), createCommentSchema), /Content-Type/);
  await assert.rejects(readJson(request("{"), createCommentSchema), /JSON/);
  await assert.rejects(readJson(request(JSON.stringify({ content: "x".repeat(17_000) })), createCommentSchema), /16 KiB/);
  assert.deepEqual(await readJson(request('{"content":" hi "}'), createCommentSchema), { content: "hi" });
});

test("pagination rejects invalid/cross-filter cursors and strips internal sort keys", () => {
  const key = { pin: 0 as const, value: "123.123456", id: "10000000-0000-4000-8000-000000000001" };
  const cursor = encodeCursor("feed:alice", key);
  assert.deepEqual(decodeCursor(cursor, "feed:alice", videoCursor), key);
  assert.throws(() => decodeCursor(cursor, "feed:bob", videoCursor), /Cursor/);
  assert.throws(() => decodeCursor("not-valid-json", "feed:alice", videoCursor), /Cursor/);
  assert.throws(() => decodeCursor(encodeCursor("feed:alice", { ...key, value: "1);drop table" }), "feed:alice", videoCursor));
  const page = paginate([{ id: "1", cursorKey: key }, { id: "2", cursorKey: key }], 1, "feed:alice");
  assert.deepEqual(page.data, [{ id: "1" }]);
  assert.equal(page.pagination.hasMore, true);
  assert.deepEqual(paginate([], 10, "feed").pagination, { hasMore: false, nextCursor: null });
});

test("unconfigured API fails predictably without exposing environment values", async () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    const response = await api(async () => ({ data: "should not run" }))(new NextRequest("http://localhost/api/v1/videos"));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "BACKEND_NOT_CONFIGURED");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
});

test("strict schemas reject invalid cursor payload shape", () => {
  assert.throws(() => decodeCursor(encodeCursor("x", { id: "x", unexpected: true }), "x", z.object({ id: z.uuid() }).strict()));
});
