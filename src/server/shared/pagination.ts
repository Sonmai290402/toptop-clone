import { z } from "zod";
import { ApiError } from "./errors";

export function encodeCursor(context: string, key: unknown) {
  return Buffer.from(JSON.stringify({ version: 1, context, key })).toString("base64url");
}

export function decodeCursor<T>(cursor: string | undefined, context: string, keySchema: z.ZodType<T>): T | null {
  if (!cursor) return null;
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(cursor) || cursor.length > 2048) throw new Error();
    const envelope = z.object({ version: z.literal(1), context: z.literal(context), key: keySchema }).strict();
    return envelope.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))).key;
  } catch {
    throw new ApiError(400, "INVALID_CURSOR", "The cursor is invalid or does not match the current filters.");
  }
}

export function paginate<T extends { cursorKey: unknown }>(rows: T[], limit: number, context: string) {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  return {
    data: items.map(({ cursorKey: _cursorKey, ...item }) => { void _cursorKey; return item; }),
    pagination: {
      hasMore,
      nextCursor: hasMore ? encodeCursor(context, items[items.length - 1].cursorKey) : null,
    },
  };
}
