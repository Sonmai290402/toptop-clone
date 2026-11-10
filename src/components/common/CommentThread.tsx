"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, ChevronDown, ChevronUp } from "lucide-react";
import { useCommentActions } from "@/hooks/queries/useCommentActions";
import { useTranslations } from "next-intl";
import { useAuth } from "@/providers/AuthProvider";
import { usePostComments } from "@/hooks/queries/usePostInteractions";
import type { PostComment } from "@/lib/post-interactions";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import RelativeTime from "./RelativeTime";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";

export default function CommentThread({
  comment,
  onReply,
  replyingToId,
  child = false,
  onDeleted,
}: {
  comment: PostComment;
  onReply: (comment: PostComment) => void;
  replyingToId?: string;
  child?: boolean;
  onDeleted?: (comment: PostComment) => void;
}) {
  const t = useTranslations("commentThread");
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { requireAuth, user } = useAuth();
  const replies = usePostComments(comment.postId, !child && open, comment.id);
  const { like, remove, isLiked, likeCount, likeBusy } = useCommentActions(
    comment,
    onDeleted,
  );
  const rows = [
    ...new Map(
      replies.data?.pages
        .flatMap((page) => page.data)
        .map((row) => [row.id, row]),
    ).values(),
  ];
  return (
    <div className="space-y-3">
      <Dialog
        open={deleteOpen}
        onOpenChange={(value) => {
          if (!remove.isPending) setDeleteOpen(value);
        }}
      >
        <DialogContent>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t(
              !child && comment.replyCount > 0
                ? "confirmDeleteThread"
                : "confirmDelete",
            )}
          </DialogDescription>
          {remove.error && (
            <p role="alert" className="text-sm text-destructive">
              {t("error")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={remove.isPending}
              onClick={() => setDeleteOpen(false)}
            >
              {t("cancelDelete")}
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                remove.mutate(undefined, {
                  onSuccess: () => setDeleteOpen(false),
                });
              }}
            >
              {t(remove.isPending ? "deleting" : "delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div
        data-replying={replyingToId === comment.id || undefined}
        className="flex items-start gap-2 rounded-lg p-2 transition-colors duration-200 data-[replying=true]:bg-primary/10 data-[replying=true]:ring-1 data-[replying=true]:ring-primary/20 motion-reduce:transition-none"
      >
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
              {user?.id === comment.author.id && (
                <button
                  type="button"
                  className="text-destructive disabled:opacity-50"
                  disabled={remove.isPending || likeBusy}
                  onClick={() => {
                    remove.reset();
                    setDeleteOpen(true);
                  }}
                >
                  {t(remove.isPending ? "deleting" : "delete")}
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label={t(isLiked ? "unlike" : "like")}
              aria-pressed={isLiked}
              disabled={likeBusy || remove.isPending}
              onClick={() => {
                if (requireAuth() && !likeBusy) like.mutate(!isLiked);
              }}
              className="flex items-center gap-1 disabled:opacity-50"
            >
              <Heart
                className={`size-4 ${isLiked ? "fill-primary text-primary" : ""}`}
              />
              {likeCount}
            </button>
          </div>
          {(like.error || remove.error) && (
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
                  onDeleted={onDeleted}
                  replyingToId={replyingToId}
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
