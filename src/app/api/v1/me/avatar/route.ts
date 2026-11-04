import { api } from "@/server/shared/http";
import { ApiError } from "@/server/shared/errors";
import { updateProfile } from "@/server/modules/users/user.service";

import { z } from "zod";
import { readJson } from "@/server/shared/validation";

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const POST = api(async (request, { db, user }) => {
  const input = await readJson(request, z.object({ mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive().max(10 * 1024 * 1024) }).strict());
  const path = user!.id + "/" + crypto.randomUUID() + "." + extensions[input.mimeType];
  const result = await db.storage.from("avatars").createSignedUploadUrl(path, { upsert: false });
  if (result.error) throw new ApiError(503, "UPLOAD_FAILED", "Unable to prepare avatar upload.");
  return { data: { path, signedUrl: result.data.signedUrl } };
}, { auth: "required" });

export const PATCH = api(async (request, { db, user }) => {
  const { path } = await readJson(request, z.object({ path: z.string().max(200) }).strict());
  const parts = path.split("/");
  if (parts.length !== 2 || parts[0] !== user!.id || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(parts[1])) throw new ApiError(400, "INVALID_FILE", "Invalid avatar path.");
  const storage = db.storage.from("avatars");
  const result = await storage.download(path);
  if (result.error || !result.data) throw new ApiError(400, "INVALID_FILE", "Upload the image before saving.");
  const file = result.data;
  if (!extensions[file.type] || !file.size || file.size > 10 * 1024 * 1024) throw new ApiError(400, "INVALID_FILE", "Choose a JPEG, PNG or WebP image up to 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const matches = file.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : file.type === "image/png" ? [137,80,78,71,13,10,26,10].every((byte, i) => bytes[i] === byte)
    : new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP";
  if (!matches) throw new ApiError(400, "INVALID_FILE", "The image content does not match its file type.");
  const avatarUrl = storage.getPublicUrl(path).data.publicUrl;
  try {
    return { data: await updateProfile(db, user!.id, { avatarUrl }) };
  } catch (error) {
    await storage.remove([path]);
    throw error;
  }
}, { auth: "required" });
