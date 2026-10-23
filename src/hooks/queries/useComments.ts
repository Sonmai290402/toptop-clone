"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getComments } from "@/lib/api/comments.api";
import { queryKeys } from "@/lib/query/query-keys";

export function useComments(videoId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.comments(videoId),
    queryFn: ({ pageParam, signal }) => getComments(videoId, { cursor: pageParam, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextCursor ?? undefined : undefined,
  });
}
