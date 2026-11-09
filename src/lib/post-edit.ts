import { z } from "zod";

export const editPostSchema = z.object({
  caption: z.string().max(2200),
  expectedCaption: z.string().max(2200),
}).strict();
