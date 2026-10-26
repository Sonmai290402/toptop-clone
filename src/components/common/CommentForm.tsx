"use client";

import { useState, type FormEvent } from "react";
import { MoveUp } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useCreatePostComment } from "@/hooks/queries/usePostInteractions";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

export default function CommentForm({ postId }: { postId: string }) {
  const { user, openAuth, isLoading } = useAuth();
  return user ? <SignedInForm key={user.id} postId={postId} /> : <Button variant="outline" className="h-auto min-h-10 w-full whitespace-normal py-2" disabled={isLoading} onClick={() => openAuth("sign-in", "Sign in to comment.")}>Sign in to comment</Button>;
}
function SignedInForm({ postId }: { postId: string }) {
  const { user, requireAuth, isLoading } = useAuth();
  const [content, setContent] = useState("");
  const mutation = useCreatePostComment(postId);
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!value || mutation.isPending || !requireAuth("Sign in to comment.")) return;
    mutation.mutate(value, { onSuccess: () => setContent("") });
  }
  return <form onSubmit={submit} className="space-y-2">
    <div className="flex min-w-0 items-center gap-2">
      <Avatar><AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.displayName ?? ""} /><AvatarFallback>{user?.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
      <Textarea aria-label="Add a comment" placeholder="Add a comment..." rows={1} maxLength={1000} value={content} disabled={mutation.isPending || isLoading} onChange={event => { setContent(event.target.value); mutation.reset(); }}
        onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
        className="h-10 min-h-10 min-w-0 flex-1 resize-none field-sizing-fixed rounded-2xl px-3 py-2 text-sm leading-5" />
      <Button type="submit" size="icon" aria-label="Send comment" disabled={!content.trim() || mutation.isPending || isLoading} className="size-9 shrink-0 text-white"><MoveUp className="size-4" /></Button>
    </div>
    {mutation.error && <p role="alert" className="text-xs text-red-400">{mutation.error.message}</p>}
    {mutation.isPending && <p role="status" className="text-xs text-muted-foreground">Posting comment...</p>}
  </form>;
}
