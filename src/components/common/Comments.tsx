"use client";

import { Filter, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CommentForm from "./CommentForm";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { useComments } from "@/hooks/queries/useComments";
import { useAuth } from "@/providers/AuthProvider";

const Comments = ({ videoId }: { videoId: string }) => {
  const { requireAuth, isLoading } = useAuth();
  const {
    data,
    isPending,
    error,
    isFetching,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useComments(videoId);
  const comments = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Card
      aria-label="Comments"
      tabIndex={-1}
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden py-0"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">Comments</h2>
        <Filter className="size-4 shrink-0" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
        {isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tải bình luận...
          </p>
        )}
        {error && (
          <div role="alert" className="mb-4 space-y-2 text-sm">
            <p>{error.message}</p>
            <Button
              variant="outline"
              disabled={isFetching}
              onClick={() => void (isFetchNextPageError ? fetchNextPage() : refetch())}
            >
              Thử lại
            </Button>
          </div>
        )}
        {!isPending && !error && comments.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có bình luận nào.</p>
        )}
        <div className="space-y-5">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2">
              <Avatar>
                <AvatarImage
                  src={comment.author.avatarUrl ?? undefined}
                  alt={comment.author.displayName}
                />
                <AvatarFallback>
                  {comment.author.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 wrap-anywhere">
                <span className="text-sm font-semibold">{comment.author.displayName}</span>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {comment.content}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </time>
                    <button type="button" disabled={isLoading} onClick={() => requireAuth("Đăng nhập để trả lời bình luận.")} className="text-xs text-accent-foreground hover:text-primary">Reply</button>
                  </div>
                  <button type="button" aria-label="Thích bình luận" disabled={isLoading} onClick={() => requireAuth("Đăng nhập để thích bình luận.")}><Heart className="size-3 shrink-0" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {hasNextPage && (
          <Button
            className="mt-4 w-full"
            variant="ghost"
            disabled={isFetching}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? "Đang tải..." : "Xem thêm bình luận"}
          </Button>
        )}
      </div>
      <footer className="shrink-0 border-t border-border p-3 sm:p-4">
        <CommentForm />
      </footer>
    </Card>
  );
};

export default Comments;
