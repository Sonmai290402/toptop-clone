"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getUserPosts, type PostSort } from "@/lib/api/posts.api";

export function useUserPosts(userId: string, sort: PostSort) {
  return useInfiniteQuery({
    queryKey: ["posts", "user", userId, sort, "all"],
    queryFn: ({ pageParam, signal }) => getUserPosts(userId, sort, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: page => page.pagination.nextOffset ?? undefined,
    enabled: !!userId,
  });
}
