import { z } from "zod";
export const createCommentSchema = z.object({ content: z.string().trim().min(1).max(1000) }).strict();
export const commentCursor = z.object({ createdAt: z.iso.datetime({ offset: true }), id: z.uuid() }).strict();
