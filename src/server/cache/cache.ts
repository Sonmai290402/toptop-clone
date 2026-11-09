import "server-only";

export interface CacheStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, options: { ex: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export async function readThroughCache<T>(
  store: CacheStore | null,
  key: string,
  ttl: number,
  parse: (value: unknown) => T | undefined,
  load: () => Promise<T>,
): Promise<T> {
  if (!store) return load();
  try {
    const cached = parse(await store.get(key));
    if (cached !== undefined) return cached;
  } catch {
    console.warn("Redis cache read failed; using the database.");
    // Avoid a second network timeout when Redis is unavailable.
    return load();
  }
  const value = await load();
  try {
    await store.set(key, value, { ex: ttl });
  } catch {
    console.warn("Redis cache write failed; returning database data.");
  }
  return value;
}

export async function invalidateCache(store: CacheStore | null, key: string) {
  try {
    await store?.del(key);
  } catch {
    console.warn("Redis cache invalidation failed; cached data will expire automatically.");
  }
}
