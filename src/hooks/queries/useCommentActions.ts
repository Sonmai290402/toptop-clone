"use client";
import { useMutation, useMutationState, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { apiFetch } from "@/lib/api/client";
import type { PostComment, CommentPage } from "@/lib/post-interactions";
import { postCommentsKey, postStateKey } from "./usePostInteractions";

export function useCommentActions(comment: PostComment, onDeleted?: (comment: PostComment) => void) {
  const { user } = useAuth();
  const client = useQueryClient();
  const viewer = user?.id ?? null;
  const mutationKey = ["comment-like", comment.postId, viewer, comment.id];
  const pending = useMutationState({
    filters: { mutationKey, exact: true, status: "pending" },
    select: mutation => mutation.state.variables as boolean,
  });
  const isLiked = pending.length ? pending[pending.length - 1] : comment.isLiked;
  const likeCount = Math.max(0, (comment.likeCount ?? 0) + Number(isLiked) - Number(comment.isLiked));
  function currentViewer(id: string | null) {
    const session = client.getQueryData<{ data: { user: { id: string } | null } }>(["auth", "session"]);
    return id !== null && session?.data.user?.id === id;
  }
  const like = useMutation({
    mutationKey,
    retry: false,
    onMutate: () => ({ viewer, postId: comment.postId, commentId: comment.id }),
    mutationFn: (active: boolean) => apiFetch(`/post-comments/${comment.id}/like`, { method: active ? "PUT" : "DELETE" }),
    onSuccess: async (_response, active, context) => {
      if (!context || !currentViewer(context.viewer)) return;
      const queryKey = postCommentsKey(context.postId, context.viewer);
      await client.cancelQueries({ queryKey });
      if (!currentViewer(context.viewer)) return;
      // Preserve the accepted action even if the subsequent list refresh fails.
      client.setQueriesData<InfiniteData<CommentPage>>({ queryKey }, current => current ? {
        ...current,
        pages: current.pages.map(page => ({ ...page, data: page.data.map(row => row.id === context.commentId ? {
          ...row, isLiked: active,
          likeCount: Math.max(0, row.likeCount + Number(active) - Number(row.isLiked)),
        } : row) })),
      } : current);
    },
    onSettled: (_data, _error, _active, context) => {
      if (!context || !currentViewer(context.viewer)) return;
      // Pending UI overlays remain visible until the authoritative list arrives.
      return client.invalidateQueries({ queryKey: postCommentsKey(context.postId, context.viewer) });
    },
  });
  const remove = useMutation({
    mutationKey: ["comment-delete", comment.postId, viewer, comment.id],
    retry: false,
    onMutate: () => ({ viewer, postId: comment.postId }),
    mutationFn: () => apiFetch(`/post-comments/${comment.id}`, { method: "DELETE" }),
    onSuccess: async (_data, _variables, context) => {
      if (!context || !currentViewer(context.viewer)) return;
      onDeleted?.(comment);
      await Promise.all([
        client.invalidateQueries({ queryKey: postCommentsKey(context.postId, context.viewer) }),
        client.invalidateQueries({ queryKey: postStateKey(context.postId, context.viewer) }),
      ]);
    },
  });
  return { like, remove, isLiked, likeCount, likeBusy: pending.length > 0 };
}
