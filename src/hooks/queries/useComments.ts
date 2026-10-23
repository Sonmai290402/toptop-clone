"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getComments } from "@/lib/api/comments.api";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuth } from "@/providers/AuthProvider";

export function useComments(videoId: string) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.comments(videoId, user?.id ?? null),
    queryFn: ({ pageParam, signal }) => getComments(videoId, { cursor: pageParam, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextCursor ?? undefined : undefined,
  });
}
