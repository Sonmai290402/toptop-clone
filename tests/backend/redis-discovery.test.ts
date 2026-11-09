import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { cachedDiscovery, invalidateDiscovery } from "../../src/server/cache/discovery";
import type { CacheStore } from "../../src/server/cache/cache";

function memoryStore(): CacheStore {
  const values = new Map<string, unknown>();
  return {
    get: async key => values.get(key) ?? null,
    set: async (key, value, { ex }) => { assert.ok(ex > 0 && ex <= 3600); values.set(key, value); },
    del: async key => values.delete(key),
  };
}

test("discovery caches valid results, separates queries and invalidates every page", async () => {
  const store = memoryStore();
  let calls = 0;
  const load = async () => String(++calls);
  assert.equal(await cachedDiscovery("feed", z.string(), load, store), "1");
  assert.equal(await cachedDiscovery("feed", z.string(), load, store), "1");
  assert.equal(await cachedDiscovery("search", z.string(), load, store), "2");
  await invalidateDiscovery(store);
  assert.equal(await cachedDiscovery("feed", z.string(), load, store), "3");
  assert.equal(await cachedDiscovery("search", z.string(), load, store), "4");
});

test("an old in-flight fill cannot refill the current discovery generation", async () => {
  const store = memoryStore();
  let release!: (value: string) => void;
  let started!: () => void;
  const loading = new Promise<void>(resolve => { started = resolve; });
  const pending = cachedDiscovery("feed", z.string(), async () => {
    started();
    return new Promise<string>(resolve => { release = resolve; });
  }, store);
  await loading;
  await invalidateDiscovery(store);
  release("stale");
  await pending;
  assert.equal(await cachedDiscovery("feed", z.string(), async () => "fresh", store), "fresh");
});

test("discovery bypasses Redis on generation failure or disabled caching", async () => {
  const store = memoryStore();
  store.get = async () => { throw new Error("Offline"); };
  assert.equal(await cachedDiscovery("feed", z.string(), async () => "fresh", store), "fresh");
  assert.equal(await cachedDiscovery("feed", z.string(), async () => "fresh", null), "fresh");
});
