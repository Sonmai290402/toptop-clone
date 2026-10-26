"use client";

import { useIsMutating } from "@tanstack/react-query";
import { Bookmark, Heart, MessageCircle, Plus, Check } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useFollowUser, usePostInteraction, usePostState } from "@/hooks/queries/usePostInteractions";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import type { FeedVideo } from "@/hooks/queries/useVideoFeed";

export default function VideoActions({ postId, author, isActive }: { postId: string; author: FeedVideo["author"]; isActive: boolean }) {
  const { requireAuth, isLoading, user } = useAuth();
  const state = usePostState(postId, isActive);
  const interaction = usePostInteraction(postId);
  const follow = useFollowUser(author.id);
  const followingBusy = useIsMutating({ mutationKey: ["follow-user", author.id] }) > 0;
  const actionBusy = useIsMutating({ mutationKey: ["post-interaction", postId] }) > 0;
  const unavailable = isLoading || !state.data || state.isError;
  const error = interaction.error ?? follow.error;
  function toggle(kind: "like" | "save") {
    if (!requireAuth(`Sign in to ${kind} this post.`) || !state.data || actionBusy) return;
    interaction.mutate({ kind, active: kind === "like" ? !state.data.isLiked : !state.data.isSaved });
  }
  return <div className="flex shrink-0 flex-col items-center justify-center gap-8">
    <div className="relative rounded-full border border-primary bg-accent">
      <Link href={`/@${encodeURIComponent(author.username)}`} aria-label={`View ${author.displayName}'s profile`}>
        <Avatar size="lg"><AvatarImage src={author.avatarUrl ?? undefined} alt={author.displayName} /><AvatarFallback>{author.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
      </Link>
      {user?.id !== author.id && <Button aria-label={state.data?.isFollowing ? "Unfollow user" : "Follow user"} aria-pressed={state.data?.isFollowing ?? false} disabled={unavailable || followingBusy}
        onClick={() => { if (requireAuth("Sign in to follow this creator.") && !followingBusy) follow.mutate(!state.data?.isFollowing); }}
        className="absolute bottom-0 right-1/2 h-5 w-5 translate-x-1/2 translate-y-1/2 rounded-full p-0">
        {state.data?.isFollowing ? <Check className="size-3" /> : <Plus className="size-3" />}
      </Button>}
    </div>
    <div className="flex flex-col items-center gap-2">
      <Button variant="secondary" aria-label={state.data?.isLiked ? "Unlike post" : "Like post"} aria-pressed={state.data?.isLiked ?? false} disabled={unavailable || actionBusy} onClick={() => toggle("like")} className={`size-10 rounded-full ${state.data?.isLiked ? "text-primary" : ""}`}><Heart className="size-5" fill={state.data?.isLiked ? "currentColor" : "none"} /></Button>
      {state.data && <span className="text-xs" aria-label={`${state.data.likeCount} likes`}>{state.data.likeCount}</span>}
      <Button variant="secondary" aria-label="Comment" className="size-10 rounded-full" onClick={event => event.currentTarget.closest("section")?.querySelector<HTMLElement>('[aria-label="Comments"]')?.focus()}><MessageCircle className="size-5" /></Button>
      {state.data && <span className="text-xs" aria-label={`${state.data.commentCount} comments`}>{state.data.commentCount}</span>}
      <Button variant="secondary" aria-label={state.data?.isSaved ? "Unsave post" : "Save post"} aria-pressed={state.data?.isSaved ?? false} disabled={unavailable || actionBusy} onClick={() => toggle("save")} className={`size-10 rounded-full ${state.data?.isSaved ? "text-primary" : ""}`}><Bookmark className="size-5" fill={state.data?.isSaved ? "currentColor" : "none"} /></Button>
    </div>
    {state.isError && <button onClick={() => void state.refetch()} className="max-w-20 text-xs text-primary">Retry actions</button>}
    {error && <p role="alert" className="max-w-24 break-words text-center text-xs text-red-400">{error.message}</p>}
  </div>;
}
