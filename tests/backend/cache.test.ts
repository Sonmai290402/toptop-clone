import assert from "node:assert/strict";
import { test } from "node:test";
import { readThroughCache, invalidateCache, type CacheStore } from "../../src/server/cache/cache";

const parse = (value: unknown) => typeof value === "string" ? value : undefined;
function store(overrides: Partial<CacheStore> = {}): CacheStore {
  return { get: async () => null, set: async () => "OK", del: async () => 1, ...overrides };
}
test("cache hit skips the database", async () => {
  assert.equal(await readThroughCache(store({ get: async () => "cached" }), "key", 60, parse,
    async () => { throw new Error("Database must not run"); }), "cached");
});
test("invalid cached data is replaced with a bounded TTL", async () => {
  let writes = 0;
  const cache = store({ get: async () => ({ invalid: true }), set: async (key, value, options) => {
    assert.equal(key, "key"); assert.equal(value, "fresh"); assert.equal(options.ex, 60); writes++;
  } });
  assert.equal(await readThroughCache(cache, "key", 60, parse, async () => "fresh"), "fresh");
  assert.equal(writes, 1);
});
test("Redis read failure falls back without attempting a write", async () => {
  let writes = 0;
  const cache = store({ get: async () => { throw new Error("Timeout"); }, set: async () => { writes++; } });
  assert.equal(await readThroughCache(cache, "key", 60, parse, async () => "fresh"), "fresh");
  assert.equal(writes, 0);
});
test("Redis write and invalidation failures do not fail successful operations", async () => {
  const cache = store({ set: async () => { throw new Error("Offline"); }, del: async () => { throw new Error("Offline"); } });
  assert.equal(await readThroughCache(cache, "key", 60, parse, async () => "fresh"), "fresh");
  await invalidateCache(cache, "key");
});
test("database errors propagate and are never cached", async () => {
  let writes = 0;
  await assert.rejects(readThroughCache(store({ set: async () => { writes++; } }), "key", 60, parse,
    async () => { throw new Error("Database unavailable"); }), /Database unavailable/);
  assert.equal(writes, 0);
});
test("disabled cache loads directly and invalidation deletes the supplied key", async () => {
  assert.equal(await readThroughCache(null, "key", 60, parse, async () => "fresh"), "fresh");
  await invalidateCache(store({ del: async key => { assert.equal(key, "key"); } }), "key");
});
