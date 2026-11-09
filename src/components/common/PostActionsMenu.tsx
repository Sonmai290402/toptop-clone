"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { editPostSchema } from "@/lib/post-edit";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type EditablePost = { id: string; userId: string; caption: string };

function updateCached(
  value: unknown,
  post: EditablePost,
  remove: boolean,
): unknown {
  if (Array.isArray(value))
    return value
      .filter((item) => !remove || !item || item.id !== post.id)
      .map((item) => updateCached(item, post, remove));
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if (record.id === post.id && "caption" in record)
    return { ...record, caption: post.caption };
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      updateCached(item, post, remove),
    ]),
  );
}

export default function PostActionsMenu({
  post,
  onDeleted,
}: {
  post: EditablePost;
  onDeleted?: () => void;
}) {
  const t = useTranslations("postActions");
  const { user } = useAuth();
  const client = useQueryClient();
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const form = useForm({
    resolver: zodResolver(editPostSchema),
    defaultValues: { caption: post.caption, expectedCaption: post.caption },
  });
  const caption = useWatch({ control: form.control, name: "caption" });
  const mutation = useMutation({
    onError: (error) => {
      if (error instanceof ApiClientError && error.status === 409)
        void client.invalidateQueries({ queryKey: ["posts"] });
    },
    mutationFn: async (input: {
      remove: boolean;
      caption: string;
      expectedCaption: string;
    }) => {
      await apiFetch(
        `/posts/${post.id}`,
        input.remove
          ? { method: "DELETE" }
          : {
              method: "PATCH",
              body: JSON.stringify({
                caption: input.caption,
                expectedCaption: input.expectedCaption,
              }),
            },
      );
      return input;
    },
    onSuccess: async (input) => {
      const predicate = (query: { queryKey: readonly unknown[] }) =>
        ["posts", "my-interacted-posts"].includes(String(query.queryKey[0]));
      await client.cancelQueries({ predicate });
      client.setQueriesData({ predicate }, (value) =>
        updateCached(value, { ...post, caption: input.caption }, input.remove),
      );
      setMode(null);
      if (input.remove) {
        client.removeQueries({
          queryKey: ["posts", "detail", post.id],
          exact: true,
        });
        onDeleted?.();
      }
      void client.invalidateQueries({
        predicate: (query) =>
          predicate(query) && !(input.remove && query.queryKey[1] === "detail"),
      });
      void client.invalidateQueries({ queryKey: ["users"] });
    },
  });
  if (user?.id !== post.userId) return null;
  function open(next: "edit" | "delete") {
    mutation.reset();
    form.reset({ caption: post.caption, expectedCaption: post.caption });
    setMode(next);
  }
  function close() {
    if (mutation.isPending) return;
    if (
      mode === "edit" &&
      form.formState.isDirty &&
      !window.confirm(t("discard"))
    )
      return;
    setMode(null);
  }
  const error =
    mutation.error instanceof ApiClientError &&
    mutation.error.code === "POST_CHANGED"
      ? t("conflict")
      : t("error");
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("menu")}
          className="flex size-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => open("edit")}>
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => open("delete")}
          >
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={mode !== null}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DialogContent>
          <DialogTitle>{t(mode === "delete" ? "delete" : "edit")}</DialogTitle>
          {mode === "delete" && (
            <DialogDescription>{t("confirmDelete")}</DialogDescription>
          )}
          {mode === "edit" ? (
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) =>
                mutation.mutate({ ...values, remove: false }),
              )}
            >
              <label className="sr-only" htmlFor={`caption-${post.id}`}>
                {t("caption")}
              </label>
              <Textarea
                id={`caption-${post.id}`}
                {...form.register("caption")}
                maxLength={2200}
                rows={6}
                disabled={mutation.isPending}
              />
              <p className="text-right text-sm text-muted-foreground">
                {caption.length}/2200
              </p>
              {form.formState.errors.caption && (
                <p role="alert">{t("invalidCaption")}</p>
              )}
              {mutation.isError && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={mutation.isPending}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending || !form.formState.isDirty}
                >
                  {t(mutation.isPending ? "saving" : "save")}
                </Button>
              </div>
            </form>
          ) : (
            <>
              {mutation.isError && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={close}
                  disabled={mutation.isPending}
                >
                  {t("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      remove: true,
                      caption: post.caption,
                      expectedCaption: post.caption,
                    })
                  }
                >
                  {t(mutation.isPending ? "deleting" : "delete")}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
