"use client";
import { useTranslations as useUiTranslations } from "next-intl";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "next/link";
import type { PostComment } from "@/lib/post-interactions";
import { MoveUp } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useCreatePostComment } from "@/hooks/queries/usePostInteractions";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

type Props = {
  postId: string;
  replyTo?: PostComment | null;
  onCancelReply?: () => void;
};
export default function CommentForm({ postId, replyTo, onCancelReply }: Props) {
  const ui = useUiTranslations("ui");
  const { user, openAuth, isLoading } = useAuth();
  return user ? (
    <SignedInForm
      key={user.id}
      postId={postId}
      replyTo={replyTo}
      onCancelReply={onCancelReply}
    />
  ) : (
    <Button
      variant="outline"
      className="h-auto min-h-10 w-full whitespace-normal py-2"
      disabled={isLoading}
      onClick={() => openAuth("sign-in", "Sign in to comment.")}
    >
      {ui("sign_in_to_comment")}
    </Button>
  );
}
function SignedInForm({ postId, replyTo, onCancelReply }: Props) {
  const ui = useUiTranslations("ui");
  const { user, requireAuth, isLoading } = useAuth();
  const t = useUiTranslations("commentThread");
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (replyTo) input.current?.focus();
  }, [replyTo]);
  const [content, setContent] = useState("");
  const mutation = useCreatePostComment(postId);
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!value || mutation.isPending || !requireAuth(ui("sign_in_to_comment")))
      return;
    mutation.mutate(
      { content: value, replyToId: replyTo?.id },
      {
        onSuccess: () => {
          setContent("");
          onCancelReply?.();
        },
      },
    );
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      {replyTo && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <Link
            className="font-bold"
            href={`/@${encodeURIComponent(replyTo.author.username)}`}
          >
            @{replyTo.author.displayName}
          </Link>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={onCancelReply}
          >
            {t("cancel")}
          </button>
        </div>
      )}
      <div className="flex min-w-0 items-center gap-2">
        <Avatar>
          <AvatarImage
            src={user?.avatarUrl ?? undefined}
            alt={user?.displayName ?? ""}
          />
          <AvatarFallback>
            {user?.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Textarea
          ref={input}
          aria-label={ui("add_a_comment")}
          placeholder={ui("add_a_comment")}
          rows={1}
          maxLength={1000}
          value={content}
          disabled={mutation.isPending || isLoading}
          onChange={(event) => {
            setContent(event.target.value);
            mutation.reset();
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          className="h-10 min-h-10 min-w-0 flex-1 resize-none field-sizing-fixed rounded-2xl px-3 py-2 text-sm leading-5"
        />
        <Button
          type="submit"
          size="icon"
          aria-label={ui("send_comment")}
          disabled={!content.trim() || mutation.isPending || isLoading}
          className="size-9 shrink-0 text-white"
        >
          <MoveUp className="size-4" />
        </Button>
      </div>
      {mutation.error && (
        <p role="alert" className="text-xs text-red-400">
          {mutation.error.message}
        </p>
      )}
      {mutation.isPending && (
        <p role="status" className="text-xs text-muted-foreground">
          {ui("posting_comment")}
        </p>
      )}
    </form>
  );
}
