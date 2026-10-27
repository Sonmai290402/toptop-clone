"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import {
  createUpload,
  getMyPosts,
  publishUpload,
  uploadFile,
} from "@/lib/api/uploads.api";
import { uploadMimeTypes, uploadSchema } from "@/lib/uploads";
import ExpandableCaption from "@/components/common/ExpandableCaption";
import MediaPlayback from "@/components/common/MediaPlayback";
import SoundPicker from "@/components/common/SoundPicker";
import type { PostSound } from "@/lib/sounds";

export default function Upload() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [sound, setSound] = useState<PostSound | null>(null);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [previewVolume, setPreviewVolume] = useState(1);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const posts = useQuery({
    queryKey: ["my-posts", user?.id],
    queryFn: ({ signal }) => getMyPosts(signal),
    enabled: !!user,
  });

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => () => controller.current?.abort(), []);

  function selectFile(next: File | null) {
    setError("");
    setMessage("");
    if (!next) return;
    const result = uploadSchema.safeParse({
      mimeType: next.type,
      size: next.size,
    });
    if (!result.success) {
      setError("Choose MP4/WebM up to 50 MB, or JPG/PNG/WebP up to 10 MB.");
      return;
    }
    setUploadedId(null);
    setSound(null);
    setMediaDuration(0);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setProgress(0);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let id = uploadedId;
      if (!id) {
        setProgress(0);
        const ticket = (await createUpload(file, abort.signal)).data;
        await uploadFile(ticket.signedUrl, file, abort.signal, setProgress);
        id = ticket.id;
        setUploadedId(id);
      }
      const selection = sound ? { soundId: sound.soundId, startMs: sound.startMs, durationMs: sound.durationMs, musicVolume: sound.musicVolume, originalVolume: sound.originalVolume } : null;
      await publishUpload(id, caption, abort.signal, selection);
      setUploadedId(null);
      setFile(null);
      setPreview("");
      setCaption("");
      setSound(null);
      if (input.current) input.current.value = "";
      setMessage("Your post was uploaded successfully.");
      void client.invalidateQueries({ queryKey: ["my-posts", user?.id] });
      void client.invalidateQueries({ queryKey: ["posts"] });
    } catch (failure) {
      if (!abort.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Upload failed. Please try again.",
        );
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl space-y-8 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-bold">Upload a post</h1>
        <p className="mt-2 text-muted-foreground">
          Share one video or photo. Uploaded files are public.
        </p>
      </header>
      <form
        onSubmit={submit}
        className="grid gap-6 rounded-2xl border bg-card p-4 sm:p-6 md:grid-cols-2"
      >
        <div className="min-w-0 space-y-3">
          <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center focus-within:ring-2 focus-within:ring-primary">
            <UploadCloud className="size-10 text-primary" />
            <span className="font-semibold">Select a video or photo</span>
            <span className="text-sm text-muted-foreground">
              MP4 / WebM · max 50 MB
              <br />
              JPG / PNG / WebP · max 10 MB
            </span>
            <input
              ref={input}
              type="file"
              className="w-full min-w-0 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:p-2"
              accept={uploadMimeTypes.join(",")}
              disabled={busy}
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {file && preview && (
            <div className="relative flex h-72 justify-center overflow-hidden rounded-xl bg-black">
              <MediaPlayback key={`${preview}:${sound?.soundId ?? "none"}:${sound?.startMs}:${sound?.durationMs}`} src={preview} mediaType={file.type.startsWith("video/") ? "video" : "image"}
                title="Selected media preview" soundtrack={sound} active={!busy} volume={previewVolume} muted={previewMuted}
                onVolumeChange={(volume, muted) => { setPreviewVolume(volume); setPreviewMuted(muted); }}
                onDuration={seconds => setMediaDuration(Number.isFinite(seconds) ? seconds : 0)} />
            </div>
          )}
          {file && (
            <p className="break-all text-sm text-muted-foreground">
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <label htmlFor="upload-caption" className="font-semibold">
            Caption
          </label>
          <textarea
            id="upload-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={2200}
            disabled={busy}
            placeholder="Describe your post..."
            className="min-h-40 w-full resize-y rounded-xl border bg-background p-3 outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-right text-sm text-muted-foreground">
            {caption.length} / 2200
          </p>
          {file && <SoundPicker value={sound} onChange={setSound} mediaType={file.type.startsWith("video/") ? "video" : "image"} mediaDuration={mediaDuration} disabled={busy} />}
          {busy && (
            <div role="status">
              <progress
                value={progress}
                max={100}
                className="w-full accent-primary"
              />
              <p className="text-sm">
                {progress < 100
                  ? `Uploading: ${progress}%`
                  : "Saving your post..."}
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm text-green-400">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={!file || busy}
            className="mt-auto rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? "Uploading..."
              : uploadedId
                ? "Retry saving"
                : "Publish post"}
          </button>
        </div>
      </form>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Your recent uploads</h2>
        {posts.isPending && <p>Loading your posts...</p>}
        {posts.isError && (
          <div role="alert">
            <p>Unable to load your uploads.</p>
            <button
              onClick={() => void posts.refetch()}
              className="text-primary underline"
            >
              Try again
            </button>
          </div>
        )}
        {posts.data?.data.length === 0 && (
          <p className="text-muted-foreground">
            Your published posts will appear here.
          </p>
        )}
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.data?.data.map((post) => (
            <article
              key={post.id}
              className="min-w-0 overflow-hidden rounded-xl border bg-card"
            >
              <div className="relative h-64 bg-black">
                <MediaPlayback src={post.mediaUrl} mediaType={post.mediaType} title={post.caption || "Uploaded post"} soundtrack={post.soundtrack}
                  volume={previewVolume} muted={previewMuted} onVolumeChange={(volume, muted) => { setPreviewVolume(volume); setPreviewMuted(muted); }} />
              </div>
              <ExpandableCaption text={post.caption || "No caption"} className="p-3" buttonClassName="text-primary" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
