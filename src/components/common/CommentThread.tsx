"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, ChevronDown, ChevronUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/providers/AuthProvider";
import { usePostComments } from "@/hooks/queries/usePostInteractions";
import { apiFetch } from "@/lib/api/client";
import type { PostComment } from "@/lib/post-interactions";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import RelativeTime from "./RelativeTime";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";

export default function CommentThread({
  comment,
  onReply,
  child = false,
}: {
  comment: PostComment;
  onReply: (comment: PostComment) => void;
  child?: boolean;
}) {
  const t = useTranslations("commentThread");
  const [open, setOpen] = useState(false);
  const { requireAuth } = useAuth();
  const client = useQueryClient();
  const replies = usePostComments(comment.postId, !child && open, comment.id);
  const like = useMutation({
    mutationFn: () =>
      apiFetch(`/post-comments/${comment.id}/like`, {
        method: comment.isLiked ? "DELETE" : "PUT",
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["post-comments", comment.postId] }),
  });
  const rows = [
    ...new Map(
      replies.data?.pages
        .flatMap((page) => page.data)
        .map((row) => [row.id, row]),
    ).values(),
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Link href={`/@${encodeURIComponent(comment.author.username)}`}>
          <Avatar>
            <AvatarImage
              src={comment.author.avatarUrl ?? undefined}
              alt={comment.author.displayName}
            />
            <AvatarFallback>
              {comment.author.displayName.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1 wrap-anywhere">
          <Link
            className="text-sm font-semibold"
            href={`/@${encodeURIComponent(comment.author.username)}`}
          >
            {comment.author.displayName}
          </Link>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {comment.replyTo && (
              <>
                <Link
                  className="font-bold"
                  href={`/@${encodeURIComponent(comment.replyTo.username)}`}
                >
                  @{comment.replyTo.displayName}
                </Link>{" "}
              </>
            )}
            {comment.content}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <RelativeTime value={comment.createdAt} />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (requireAuth()) onReply(comment);
                }}
                className="font-bold cursor-pointer"
              >
                {t("reply")}
              </Button>
            </div>
            <button
              type="button"
              aria-label={t(comment.isLiked ? "unlike" : "like")}
              aria-pressed={comment.isLiked}
              disabled={like.isPending}
              onClick={() => {
                if (requireAuth()) like.mutate();
              }}
              className="flex items-center gap-1 disabled:opacity-50"
            >
              <Heart
                className={`size-4 ${comment.isLiked ? "fill-primary text-primary" : ""}`}
              />
              {comment.likeCount ?? 0}
            </button>
          </div>
          {like.error && (
            <p role="alert" className="text-xs text-destructive">
              {t("error")}
            </p>
          )}
        </div>
      </div>
      {!child && comment.replyCount > 0 && (
        <div className="ml-10 space-y-4">
          <button
            type="button"
            aria-expanded={open}
            className="flex items-center gap-2 text-xs text-muted-foreground"
            onClick={() => setOpen(!open)}
          >
            <span className="w-6 border-t" />
            {open ? t("hide") : t("view", { count: comment.replyCount })}
            {open ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </button>
          {open && (
            <>
              {replies.isPending && <Skeleton className="h-24 w-full" />}
              {rows.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  child
                />
              ))}
              {replies.isError && <p role="alert">{t("error")}</p>}
              {(replies.hasNextPage || replies.isError) && (
                <button
                  disabled={replies.isFetching}
                  onClick={() =>
                    void (replies.isError && !replies.isFetchNextPageError
                      ? replies.refetch()
                      : replies.fetchNextPage())
                  }
                  className="text-xs text-primary"
                >
                  {t(replies.isError ? "retry" : "more")}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
