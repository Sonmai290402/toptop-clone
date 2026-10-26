"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CommentForm from "./CommentForm";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { usePostComments, usePostState } from "@/hooks/queries/usePostInteractions";

export default function Comments({ postId, isActive = true }: { postId: string; isActive?: boolean }) {
  const query = usePostComments(postId, isActive);
  const state = usePostState(postId, isActive);
  const comments = [...new Map(query.data?.pages.flatMap(page => page.data).map(comment => [comment.id, comment])).values()];
  return <Card aria-label="Comments" tabIndex={-1} className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden py-0">
    <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3"><h2 className="font-semibold">Comments{state.data ? ` ${state.data.commentCount}` : ""}</h2></header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
      {query.isPending && <p role="status" className="text-sm text-muted-foreground">Loading comments...</p>}
      {query.isError && <div role="alert" className="mb-4 space-y-2 text-sm"><p>{query.error.message}</p><Button variant="outline" disabled={query.isFetching} onClick={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}>Try again</Button></div>}
      {query.data && !comments.length && <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>}
      <div className="space-y-5">{comments.map(comment => <div key={comment.id} className="flex items-start gap-2">
        <Link href={`/@${encodeURIComponent(comment.author.username)}`} aria-label={`View ${comment.author.displayName}'s profile`}><Avatar><AvatarImage src={comment.author.avatarUrl ?? undefined} alt={comment.author.displayName} /><AvatarFallback>{comment.author.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar></Link>
        <div className="min-w-0 flex-1 wrap-anywhere"><Link href={`/@${encodeURIComponent(comment.author.username)}`} className="text-sm font-semibold">{comment.author.displayName}</Link><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p><time dateTime={comment.createdAt} className="mt-2 block text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Ho_Chi_Minh" })}</time>
          {/* Reply and comment-like actions are not supported by the post API yet. */}
        </div>
      </div>)}</div>
      {query.hasNextPage && <Button className="mt-4 w-full" variant="ghost" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? "Loading..." : "Load more comments"}</Button>}
    </div>
    <footer className="shrink-0 border-t border-border p-3 sm:p-4"><CommentForm key={postId} postId={postId} /></footer>
  </Card>;
}
