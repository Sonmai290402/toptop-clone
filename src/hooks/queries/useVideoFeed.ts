"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { MediaPost } from "@/lib/uploads";
import { useAuth } from "@/providers/AuthProvider";

export type FeedType = "for-you" | "following";
export type FeedVideo = MediaPost & { author: { id: string; username: string; displayName: string; avatarUrl: string | null } };
type FeedPage = { data: FeedVideo[]; pagination: { hasMore: boolean; nextCursor: string | null } };

export function useVideoFeed(feed: FeedType) {
  const { user, isLoading } = useAuth();
  return useInfiniteQuery({
    queryKey: ["posts", "feed", feed, user?.id ?? null],
    queryFn: ({ pageParam, signal }) => apiFetch<FeedPage>(`/posts/feed?feed=${feed}&limit=10${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`, { signal }),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.pagination.hasMore ? page.pagination.nextCursor ?? undefined : undefined,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: !isLoading && (feed === "for-you" || !!user),
  });
}
