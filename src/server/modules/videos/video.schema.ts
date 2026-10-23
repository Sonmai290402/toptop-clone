import { z } from "zod";
import { paginationSchema } from "../../shared/validation";

export const feedQuery = paginationSchema.extend({ feed: z.enum(["latest", "following"]).default("latest") }).strict();
export const videoQuery = paginationSchema.extend({ sort: z.enum(["latest", "oldest", "popular"]).default("latest") }).strict();
export const videoCursor = z.object({
  pin: z.union([z.literal(0), z.literal(1)]),
  value: z.string().max(40).regex(/^-?\d+(\.\d+)?$/),
  id: z.uuid(),
}).strict();
