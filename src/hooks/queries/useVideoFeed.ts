"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { MediaPost } from "@/lib/uploads";
import { useAuth } from "@/providers/AuthProvider";

export type FeedType = "for-you" | "following";
export type FeedVideo = MediaPost & { author: { id: string; username: string; displayName: string; avatarUrl: string | null } };
type FeedPage = { data: FeedVideo[]; pagination: { hasMore: boolean; nextOffset: number | null } };

export function useVideoFeed(feed: FeedType) {
  const { user, isLoading } = useAuth();
  return useInfiniteQuery({
    queryKey: ["posts", "feed", feed, user?.id ?? null],
    queryFn: ({ pageParam, signal }) => apiFetch<FeedPage>(`/posts/feed?feed=${feed}&limit=10&offset=${pageParam}`, { signal }),
    initialPageParam: 0,
    getNextPageParam: page => page.pagination.nextOffset ?? undefined,
    enabled: !isLoading && (feed === "for-you" || !!user),
  });
}
