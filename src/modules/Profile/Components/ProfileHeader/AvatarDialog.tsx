"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/api/uploads.api";
import { apiFetch } from "@/lib/api/client";

export default function AvatarDialog({
  avatarUrl,
  canEdit,
  onClose,
}: {
  avatarUrl: string | null;
  canEdit: boolean;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useQueryClient();
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
  const save = useMutation({
    mutationFn: async () => {
      if (!file || !canEdit) throw new Error("Choose an image first.");
      const { data } = await apiFetch<{ data: { path: string; signedUrl: string } }>("/me/avatar", {
        method: "POST", body: JSON.stringify({ mimeType: file.type, size: file.size }),
      });
      await uploadFile(data.signedUrl, file, new AbortController().signal, () => {});
      return apiFetch("/me/avatar", { method: "PATCH", body: JSON.stringify({ path: data.path }) });
    },
    onSuccess: async () => {
      await Promise.all(
        [["users"], ["auth", "session"], ["posts"]].map((queryKey) =>
          client.invalidateQueries({ queryKey }),
        ),
      );
      onClose();
    },
  });
  const src = preview ?? avatarUrl;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg flex flex-col items-center justify-center"
        showCloseButton={!save.isPending}
      >
        <DialogTitle className="sr-only">
          {canEdit ? "Update avatar" : "Profile avatar"}
        </DialogTitle>
        {src ? (
          <Image
            src={src}
            unoptimized
            alt="Avatar preview"
            width={400}
            height={400}
            className="h-auto w-[400px] max-w-full object-contain"
            onError={() =>
              setError("Unable to preview this image. Choose another file.")
            }
          />
        ) : (
          <div className="flex aspect-square w-[400px] max-w-full items-center justify-center bg-muted text-muted-foreground">
            No avatar yet.
          </div>
        )}
        {canEdit && (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={save.isPending}
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose image
            </Button>
            <input
              ref={fileInput}
              hidden
              aria-label="Choose image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={save.isPending}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                event.target.value = "";
                if (!selected) return;
                save.reset();
                if (
                  !["image/jpeg", "image/png", "image/webp"].includes(
                    selected.type,
                  ) ||
                  !selected.size ||
                  selected.size > 10 * 1024 * 1024
                ) {
                  setError("Choose a JPEG, PNG or WebP image up to 10 MB.");
                  return;
                }
                setError(null);
                setFile(selected);
                setPreview(URL.createObjectURL(selected));
              }}
            />
            {(error || save.error) && (
              <p role="alert" className="text-sm text-destructive">
                {error ?? save.error?.message}
              </p>
            )}
            <div className="flex w-full justify-end gap-2">
              <Button
                variant="outline"
                disabled={save.isPending}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                disabled={!file || !!error || save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
