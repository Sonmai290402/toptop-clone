import type { CommentDto, PaginatedResponse } from "@/types/api.types";
import { apiFetch } from "./client";

export function getComments(
  videoId: string,
  { cursor, signal }: { cursor?: string; signal?: AbortSignal } = {},
) {
  const params = new URLSearchParams({ limit: "10" });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<PaginatedResponse<CommentDto>>(
    `/videos/${encodeURIComponent(videoId)}/comments?${params}`,
    { signal },
  );
}
