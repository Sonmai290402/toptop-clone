import { z } from "zod";
import { soundSelectionSchema, type PostSound } from "./sounds";

export const uploadMimeTypes = ["video/mp4", "video/webm", "image/jpeg", "image/png", "image/webp"] as const;
export const uploadSchema = z.object({
  mimeType: z.enum(uploadMimeTypes),
  size: z.number().int().positive().max(50 * 1024 * 1024),
}).strict().refine(({ mimeType, size }) => mimeType.startsWith("video/") || size <= 10 * 1024 * 1024, {
  message: "Images must be 10 MB or smaller.", path: ["size"],
});
export const publishSchema = z.object({ caption: z.string().trim().max(2200), sound: soundSelectionSchema.nullable().optional() }).strict();
export type UploadTicket = { id: string; signedUrl: string };
export type MediaPost = { id: string; userId: string; mediaType: "video" | "image"; mediaUrl: string; caption: string; createdAt: string; soundtrack?: PostSound | null };
