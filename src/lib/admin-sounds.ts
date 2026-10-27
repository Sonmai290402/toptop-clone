import { z } from "zod";
import type { Sound } from "./sounds";

export const soundMimeTypes = ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav"] as const;
export const soundUploadSchema = z.object({
  mimeType: z.enum(soundMimeTypes),
  size: z.number().int().positive().max(20 * 1024 * 1024),
}).strict();
export const completeSoundSchema = z.object({
  title: z.string().trim().min(1).max(160),
  artist: z.string().trim().min(1).max(160),
  durationMs: z.number().int().min(1000).max(3600000),
}).strict();
export type SoundDetails = z.infer<typeof completeSoundSchema>;
export type AdminSound = Sound & { isActive: boolean; createdAt: string };
export type AdminSoundPage = { data: AdminSound[]; pagination: { hasMore: boolean; nextOffset: number | null } };
