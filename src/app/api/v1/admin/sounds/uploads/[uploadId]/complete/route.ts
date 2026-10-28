import { UserRole } from "@/types/role.types";
import type { NextRequest } from "next/server";
import { api } from "@/server/shared/http";
import { requireRole } from "@/server/modules/auth/authorization";
import { readJson, parse, idSchema } from "@/server/shared/validation";
import { completeSoundSchema } from "@/lib/admin-sounds";
import { completeSoundUpload } from "@/server/modules/sounds/admin.service";

export async function POST(request: NextRequest, context: { params: Promise<{ uploadId: string }> }) {
  return api(async (request, { db, user }) => {
    await requireRole(db, user, UserRole.ADMIN);
    const id = parse(idSchema, (await context.params).uploadId);
    return { data: await completeSoundUpload(db, id, await readJson(request, completeSoundSchema)) };
  }, { auth: "required" })(request);
}
