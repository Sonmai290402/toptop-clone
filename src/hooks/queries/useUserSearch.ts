"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

type SearchUser = { id: string; username: string; displayName: string; avatarUrl: string | null; bio: string };
type SearchPage = { data: SearchUser[]; pagination: { hasMore: boolean; nextOffset: number | null } };

export function useUserSearch(query: string) {
  return useInfiniteQuery({
    queryKey: ["users", "search", query],
    queryFn: ({ pageParam, signal }) => apiFetch<SearchPage>(`/users/search?q=${encodeURIComponent(query)}&limit=20&offset=${pageParam}`, { signal }),
    initialPageParam: 0,
    getNextPageParam: page => page.pagination.nextOffset ?? undefined,
    enabled: query.length > 0 && query.length <= 100,
    staleTime: 30_000,
  });
}
