import { api } from "@/server/shared/http";
import { parse } from "@/server/shared/validation";
import { interactionPage, listInteractedPosts } from "@/server/modules/posts/interaction.service";
export const GET = api(async (request, { db }) => listInteractedPosts(db, "saved", parse(interactionPage, Object.fromEntries(request.nextUrl.searchParams))), { auth: "required" });
