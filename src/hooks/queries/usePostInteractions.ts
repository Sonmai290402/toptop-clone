"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/providers/AuthProvider";
import type {
  CommentPage,
  PostComment,
  PostInteractionState,
} from "@/lib/post-interactions";
import type { PostPage } from "@/lib/api/posts.api";

export const postStateKey = (id: string, viewer: string | null) =>
  ["post-state", id, viewer] as const;
export const postCommentsKey = (id: string, viewer: string | null) =>
  ["post-comments", id, viewer] as const;

export function usePostState(postId: string, enabled = true) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: postStateKey(postId, user?.id ?? null),
    queryFn: ({ signal }) =>
      apiFetch<{ data: PostInteractionState }>(
        `/posts/${postId}/interactions`,
        { signal },
      ),
    select: (response) => response.data,
    enabled: enabled && !isLoading,
  });
}
export function usePostInteraction(postId: string) {
  const { user } = useAuth();
  const client = useQueryClient();
  type StateResponse = { data: PostInteractionState };
  function isCurrentViewer(viewerId: string | null) {
    const session = client.getQueryData<{
      data: { user: { id: string } | null };
    }>(["auth", "session"]);
    return viewerId !== null && session?.data.user?.id === viewerId;
  }
  return useMutation({
    mutationKey: ["post-interaction", postId, user?.id],
    mutationFn: ({
      kind,
      active,
    }: {
      kind: "like" | "save";
      active: boolean;
    }) =>
      apiFetch<StateResponse>(`/posts/${postId}/${kind}`, {
        method: active ? "PUT" : "DELETE",
      }),
    retry: false,
    onMutate: async ({ kind, active }) => {
      const viewerId = user?.id ?? null;
      const queryKey = postStateKey(postId, viewerId);
      await client.cancelQueries({ queryKey, exact: true });
      const previous = client.getQueryData<StateResponse>(queryKey);
      if (!previous || !isCurrentViewer(viewerId)) {
        return { viewerId, queryKey, previous: undefined };
      }
      client.setQueryData<StateResponse>(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          data: {
            ...current.data,
            ...(kind === "like"
              ? {
                  isLiked: active,
                  likeCount: Math.max(
                    0,
                    current.data.likeCount +
                      Number(active) -
                      Number(current.data.isLiked),
                  ),
                }
              : { isSaved: active }),
          },
        };
      });
      return { viewerId, queryKey, previous };
    },
    onError: (_error, { kind }, context) => {
      if (!context?.previous || !isCurrentViewer(context.viewerId)) return;
      const previous = context.previous.data;
      // Restore only this action's fields, preserving concurrent comment/follow updates.
      client.setQueryData<StateResponse>(context.queryKey, (current) =>
        current
          ? {
              ...current,
              data: {
                ...current.data,
                ...(kind === "like"
                  ? { isLiked: previous.isLiked, likeCount: previous.likeCount }
                  : { isSaved: previous.isSaved }),
              },
            }
          : current,
      );
    },
    onSuccess: (response, { kind }, context) => {
      if (!context || !isCurrentViewer(context.viewerId)) return;
      client.setQueryData<StateResponse>(context.queryKey, (current) =>
        current
          ? {
              ...current,
              data: {
                ...current.data,
                ...(kind === "like"
                  ? {
                      isLiked: response.data.isLiked,
                      likeCount: response.data.likeCount,
                    }
                  : { isSaved: response.data.isSaved }),
              },
            }
          : response,
      );
    },
    onSettled: (_response, _error, _variables, context) => {
      if (!context || !isCurrentViewer(context.viewerId)) return;
      // Reconcile even after a network error: the server may have committed the action.
      void client.invalidateQueries({
        queryKey: ["my-interacted-posts", context.viewerId],
      });
      return client.invalidateQueries({
        queryKey: context.queryKey,
        exact: true,
      });
    },
  });
}
export function useFollowUser(targetId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ["follow-user", targetId],
    mutationFn: (active: boolean) =>
      apiFetch<{ data: { isFollowing: boolean; followerCount: number } }>(
        `/users/${targetId}/follow`,
        { method: active ? "PUT" : "DELETE" },
      ),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["post-state"] }),
        client.invalidateQueries({ queryKey: ["users"] }),
        client.resetQueries({ queryKey: ["posts", "feed", "following"] }),
      ]);
    },
  });
}
export function usePostComments(
  postId: string,
  enabled = true,
  // parentId?: string,
) {
  const { user, isLoading } = useAuth();
  return useInfiniteQuery({
    queryKey: postCommentsKey(postId, user?.id ?? null),
    queryFn: ({ pageParam, signal }) =>
      apiFetch<CommentPage>(
        `/posts/${postId}/comments?limit=20&offset=${pageParam}`,
        { signal },
      ),
    initialPageParam: 0,
    getNextPageParam: (page) => page.pagination.nextOffset ?? undefined,
    enabled: enabled && !isLoading,
  });
}
export function useCreatePostComment(postId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiFetch<{ data: PostComment }>(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        client.resetQueries({ queryKey: ["post-comments", postId] }),
        client.invalidateQueries({ queryKey: ["post-state", postId] }),
      ]);
    },
  });
}
export function useMyInteractedPosts(
  kind: "liked" | "saved",
  enabled: boolean,
) {
  const { user, isLoading } = useAuth();
  return useInfiniteQuery({
    queryKey: ["my-interacted-posts", user?.id, kind, "with-author"],
    queryFn: ({ pageParam, signal }) =>
      apiFetch<PostPage>(`/me/${kind}-posts?offset=${pageParam}&limit=20`, {
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.pagination.nextOffset ?? undefined,
    enabled: enabled && !!user && !isLoading,
  });
}
