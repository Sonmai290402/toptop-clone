"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/providers/AuthProvider";
import type { CommentPage, PostComment, PostInteractionState } from "@/lib/post-interactions";
import type { PostPage } from "@/lib/api/posts.api";

export const postStateKey = (id: string, viewer: string | null) => ["post-state", id, viewer] as const;
export const postCommentsKey = (id: string, viewer: string | null) => ["post-comments", id, viewer] as const;

export function usePostState(postId: string, enabled = true) {
  const { user, isLoading } = useAuth();
  return useQuery({ queryKey: postStateKey(postId, user?.id ?? null), queryFn: ({ signal }) => apiFetch<{ data: PostInteractionState }>(`/posts/${postId}/interactions`, { signal }), select: response => response.data, enabled: enabled && !isLoading });
}
export function usePostInteraction(postId: string) {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationKey: ["post-interaction", postId, user?.id],
    mutationFn: ({ kind, active }: { kind: "like" | "save"; active: boolean }) => apiFetch<{ data: PostInteractionState }>(`/posts/${postId}/${kind}`, { method: active ? "PUT" : "DELETE" }),
    onSuccess: async (response) => {
      // Do not write a completed mutation into a different account's cache.
      const session = client.getQueryData<{ data: { user: { id: string } | null } }>(["auth", "session"]);
      if (session?.data.user?.id !== user?.id) return;
      await client.cancelQueries({ queryKey: postStateKey(postId, user?.id ?? null) });
      client.setQueryData(postStateKey(postId, user?.id ?? null), response);
      await client.invalidateQueries({ queryKey: ["my-interacted-posts"] });
    },
  });
}
export function useFollowUser(targetId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ["follow-user", targetId],
    mutationFn: (active: boolean) => apiFetch<{ data: { isFollowing: boolean; followerCount: number } }>(`/users/${targetId}/follow`, { method: active ? "PUT" : "DELETE" }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["post-state"] }),
        client.invalidateQueries({ queryKey: ["users"] }),
        client.resetQueries({ queryKey: ["posts", "feed", "following"] }),
      ]);
    },
  });
}
export function usePostComments(postId: string, enabled = true) {
  const { user, isLoading } = useAuth();
  return useInfiniteQuery({
    queryKey: postCommentsKey(postId, user?.id ?? null),
    queryFn: ({ pageParam, signal }) => apiFetch<CommentPage>(`/posts/${postId}/comments?limit=20&offset=${pageParam}`, { signal }),
    initialPageParam: 0,
    getNextPageParam: page => page.pagination.nextOffset ?? undefined,
    enabled: enabled && !isLoading,
  });
}
export function useCreatePostComment(postId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => apiFetch<{ data: PostComment }>(`/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ content }) }),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        client.resetQueries({ queryKey: ["post-comments", postId] }),
        client.invalidateQueries({ queryKey: ["post-state", postId] }),
      ]);
    },
  });
}
export function useMyInteractedPosts(kind: "liked" | "saved", enabled: boolean) {
  const { user, isLoading } = useAuth();
  return useInfiniteQuery({
    queryKey: ["my-interacted-posts", user?.id, kind],
    queryFn: ({ pageParam, signal }) => apiFetch<PostPage>(`/me/${kind}-posts?offset=${pageParam}&limit=20`, { signal }),
    initialPageParam: 0,
    getNextPageParam: page => page.pagination.nextOffset ?? undefined,
    enabled: enabled && !!user && !isLoading,
  });
}
