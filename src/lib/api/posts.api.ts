import { apiFetch } from "./client";
import type { MediaPostWithAuthor } from "@/lib/uploads";

export type PostSort = "latest" | "oldest";
export type PostPage = {
  data: MediaPostWithAuthor[];
  pagination: { hasMore: boolean; nextOffset: number | null };
};
export function getUserPosts(
  userId: string,
  sort: PostSort,
  offset: number,
  signal: AbortSignal,
  mediaType?: "video" | "image",
) {
  const query = new URLSearchParams({
    sort,
    offset: String(offset),
    limit: "20",
  });
  if (mediaType) query.set("mediaType", mediaType);
  return apiFetch<PostPage>(
    `/users/${encodeURIComponent(userId)}/posts?${query}`,
    { signal },
  );
}
export const getPost = (postId: string, signal: AbortSignal) =>
  apiFetch<{ data: MediaPostWithAuthor }>(`/posts/${encodeURIComponent(postId)}`, {
    signal,
  });
