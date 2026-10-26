import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { idSchema, parse, readJson } from "@/server/shared/validation";
import { publishSchema } from "@/lib/uploads";
import { publishUpload } from "@/server/modules/uploads/upload.service";

export async function POST(request: NextRequest, context: { params: Promise<{ uploadId: string }> }) {
  return api(async (request, { db }) => {
    const id = parse(idSchema, (await context.params).uploadId);
    const { caption } = await readJson(request, publishSchema);
    return { data: await publishUpload(db, id, caption) };
  }, { auth: "required" })(request);
}
