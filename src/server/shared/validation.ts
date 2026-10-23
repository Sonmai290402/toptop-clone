import { z } from "zod";
import { ApiError } from "./errors";

export const idSchema = z.uuid();
export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, "Username gồm 3–30 chữ thường, số hoặc dấu gạch dưới.");
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.string().max(2048).optional(),
});

export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "INVALID_INPUT", "Dữ liệu không hợp lệ.", result.error.issues.map(({ path, message }) => ({ field: path.join("."), message })));
  }
  return result.data;
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Sử dụng Content-Type: application/json.");
  }
  // Stream with a hard cap; Content-Length alone cannot be trusted.
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) {
        await reader.cancel();
        throw new ApiError(413, "BODY_TOO_LARGE", "JSON body tối đa 16 KiB.");
      }
      chunks.push(value);
    }
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "INVALID_JSON", "JSON body không hợp lệ.");
  }
  return parse(schema, body);
}
