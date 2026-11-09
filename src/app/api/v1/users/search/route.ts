import { z } from "zod";
import { api } from "@/server/shared/http";
import { parse } from "@/server/shared/validation";
import { databaseError } from "@/server/shared/errors";
import { createHash } from "node:crypto";
import { cachedDiscovery } from "@/server/cache/discovery";

const rowsSchema = z.array(z.object({
  id: z.uuid(), username: z.string(), displayName: z.string(),
  avatarUrl: z.string().nullable(), bio: z.string(),
}));

export const GET = api(async (request, { db }) => {
  const input = parse(z.object({
    q: z.string().trim().max(100).transform(value => value.replace(/^@/, "").trim()).pipe(z.string().min(1)),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(10000).default(0),
  }).strict(), Object.fromEntries(request.nextUrl.searchParams));
  const load = async () => {
    const result = await db.rpc("search_users", { p_query: input.q, p_limit: input.limit + 1, p_offset: input.offset });
    if (result.error) databaseError(result.error);
    return rowsSchema.parse(result.data);
  };
  const hash = createHash("sha256").update(input.q).digest("hex");
  const data = input.offset === 0 && input.limit === 20
    ? await cachedDiscovery(`search:first:20:${hash}`, rowsSchema, load)
    : await load();
  const hasMore = data.length > input.limit && input.offset + input.limit <= 10000;
  return { data: data.slice(0, input.limit), pagination: { hasMore, nextOffset: hasMore ? input.offset + input.limit : null } };
});
