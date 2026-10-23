import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(160).optional(),
  avatarUrl: z.url().max(2048).refine((value) => new URL(value).protocol === "https:", "Avatar phải là HTTPS URL.").nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Cần ít nhất một trường cập nhật.");
