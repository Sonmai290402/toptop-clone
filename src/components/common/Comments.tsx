"use client";
import { useState } from "react";
import type { PostComment } from "@/lib/post-interactions";
import CommentThread from "./CommentThread";
import { useTranslations as useUiTranslations } from "next-intl";

import CommentForm from "./CommentForm";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import {
  usePostComments,
  usePostState,
} from "@/hooks/queries/usePostInteractions";

export default function Comments({
  postId,
  isActive = true,
}: {
  postId: string;
  isActive?: boolean;
}) {
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const ui = useUiTranslations("ui");
  const query = usePostComments(postId, isActive);
  const state = usePostState(postId, isActive);
  const comments = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.data)
        .map((comment) => [comment.id, comment]),
    ).values(),
  ];
  return (
    <Card
      aria-label={ui("comments")}
      tabIndex={-1}
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden py-0"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">
          {ui("comments")}
          {state.data ? ` ${state.data.commentCount}` : ""}
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
        {query.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            {ui("loading_comments")}
          </p>
        )}
        {query.isError && (
          <div role="alert" className="mb-4 space-y-2 text-sm">
            <p>{query.error.message}</p>
            <Button
              variant="outline"
              disabled={query.isFetching}
              onClick={() =>
                void (query.isFetchNextPageError
                  ? query.fetchNextPage()
                  : query.refetch())
              }
            >
              {ui("try_again")}
            </Button>
          </div>
        )}
        {query.data && !comments.length && (
          <p className="text-sm text-muted-foreground">
            {ui("no_comments_yet_be_the_first_to_comment")}
          </p>
        )}
        <div className="space-y-5">
          {comments.map((comment) => (
            <CommentThread
              replyingToId={replyTo?.postId === postId ? replyTo.id : undefined}
              key={comment.id}
              comment={comment}
              onReply={setReplyTo}
            />
          ))}
        </div>
        {query.hasNextPage && (
          <Button
            className="mt-4 w-full"
            variant="ghost"
            disabled={query.isFetching}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage
              ? ui("loading")
              : ui("load_more_comments")}
          </Button>
        )}
      </div>
      <footer className="shrink-0 border-t border-border p-3 sm:p-4">
        <CommentForm
          key={postId}
          postId={postId}
          replyTo={replyTo?.postId === postId ? replyTo : null}
          onCancelReply={() => setReplyTo(null)}
        />
      </footer>
    </Card>
  );
}
