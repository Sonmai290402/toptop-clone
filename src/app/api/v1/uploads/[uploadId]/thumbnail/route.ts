import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse } from "@/server/shared/validation";
import { ApiError, databaseError } from "@/server/shared/errors";

export async function POST(request: NextRequest, context: { params: Promise<{ uploadId: string }> }) {
  return api(async (req, { db, user }) => {
    const id = parse(idSchema, (await context.params).uploadId);
    const target = await db.from("media_posts").select("user_id,published_at,mime_type").eq("id", id).maybeSingle();
    if (target.error) databaseError(target.error);
    if (!target.data || target.data.user_id !== user!.id) throw new ApiError(403, "FORBIDDEN", "Upload not found or not owned by you.");
    if (target.data.published_at || !target.data.mime_type.startsWith("video/")) throw new ApiError(400, "INVALID_UPLOAD", "Choose a thumbnail before publishing a video.");
    if (req.headers.get("content-type") !== "image/jpeg" || !req.body) throw new ApiError(400, "INVALID_IMAGE", "A JPEG thumbnail is required.");
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 3 * 1024 * 1024) { await reader.cancel(); throw new ApiError(413, "IMAGE_TOO_LARGE", "Thumbnail must be 3 MB or smaller."); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw new ApiError(400, "INVALID_IMAGE", "Invalid JPEG thumbnail.");
    const path = `${user!.id}/${id}.jpg`;
    const uploaded = await db.storage.from("thumbnails").upload(path, bytes, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
    if (uploaded.error) throw new ApiError(503, "UPLOAD_FAILED", "Unable to upload the thumbnail.");
    const attached = await db.rpc("attach_post_thumbnail", { p_id: id });
    if (attached.error) databaseError(attached.error);
    return { data: { uploaded: true } };
  }, { auth: "required" })(request);
}
