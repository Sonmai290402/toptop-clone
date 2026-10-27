"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Music2, UploadCloud } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { completeSoundSchema, soundMimeTypes, soundUploadSchema, type AdminSound } from "@/lib/admin-sounds";
import { completeAdminSoundUpload, createAdminSoundUpload, getAdminSounds } from "@/lib/api/admin-sounds.api";
import { uploadFile } from "@/lib/api/uploads.api";

function AudioPreview({ sound }: { sound: AdminSound }) {
  const [failed, setFailed] = useState(false);
  return <div className="space-y-1">
    <audio controls preload="none" src={sound.audioUrl} aria-label={`Preview ${sound.title}`} onError={() => setFailed(true)}
      onPlay={event => {
        document.querySelectorAll("audio").forEach(audio => { if (audio !== event.currentTarget) audio.pause(); });
      }} className="h-10 w-full" />
    {failed && <p role="alert" className="text-xs text-destructive">Unable to play this sound.</p>}
  </div>;
}

export default function AdminSounds() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const metadataCleanup = useRef<(() => void) | null>(null);
  useEffect(() => { const timer = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const sounds = useInfiniteQuery({
    queryKey: ["admin-sounds", user?.id, term],
    queryFn: ({ pageParam, signal }) => getAdminSounds(pageParam, term, signal),
    initialPageParam: 0,
    getNextPageParam: page => page.pagination.nextOffset ?? undefined,
    enabled: user?.role === "admin",
  });
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { controller.current?.abort(); metadataCleanup.current?.(); }, []);

  function selectFile(next: File | null) {
    if (!next) return;
    metadataCleanup.current?.();
    setFile(null); setPreview(""); setDurationMs(0); setUploadedId(null); setProgress(0); setError(""); setMessage(""); setReading(false);
    if (!soundUploadSchema.safeParse({ mimeType: next.type, size: next.size }).success) {
      setError("Choose an MP3, M4A, Ogg or WAV file up to 20 MB.");
      return;
    }
    const url = URL.createObjectURL(next);
    setFile(next); setPreview(url); setReading(true);
    setTitle(next.name.replace(/\.[^.]+$/, "").slice(0, 160));
    const audio = new Audio();
    let finished = false;
    function cleanup() {
      finished = true; clearTimeout(timer);
      audio.onloadedmetadata = null; audio.onerror = null;
      audio.removeAttribute("src"); audio.load();
    }
    const fail = () => { if (!finished) { cleanup(); setReading(false); setDurationMs(0); setError("Unable to read audio duration. Try a different file, preferably MP3."); } };
    audio.onloadedmetadata = () => {
      const duration = Math.floor(audio.duration * 1000);
      if (!Number.isFinite(duration) || duration < 1000 || duration > 3600000) { fail(); return; }
      cleanup(); setReading(false); setDurationMs(duration);
    };
    audio.onerror = fail;
    const timer = setTimeout(fail, 15000);
    audio.preload = "metadata";
    audio.src = url;
    metadataCleanup.current = cleanup;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || busy || reading || !durationMs) return;
    const details = completeSoundSchema.safeParse({ title, artist, durationMs });
    if (!details.success) { setError("Enter a title and artist, each up to 160 characters, and choose a valid audio file."); return; }
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true); setError(""); setMessage("");
    document.querySelectorAll("audio").forEach(audio => audio.pause());
    try {
      let id = uploadedId;
      if (!id) {
        setProgress(0);
        const ticket = (await createAdminSoundUpload(file, abort.signal)).data;
        await uploadFile(ticket.signedUrl, file, abort.signal, setProgress);
        id = ticket.id; setUploadedId(id);
      }
      await completeAdminSoundUpload(id, details.data, abort.signal);
      setUploadedId(null); setFile(null); setPreview(""); setDurationMs(0); setTitle(""); setArtist(""); setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
      setMessage("Sound added. It is now available in Add sound on the Upload page.");
      void client.invalidateQueries({ queryKey: ["admin-sounds"] });
      void client.invalidateQueries({ queryKey: ["sounds"] });
    } catch (failure) {
      if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to add the sound. Please try again.");
    } finally { if (!abort.signal.aborted) setBusy(false); }
  }

  const rows = sounds.data?.pages.flatMap(page => page.data) ?? [];
  return <main className="mx-auto w-full min-w-0 max-w-5xl space-y-8 p-4 sm:p-8">
    <header className="space-y-2"><p className="text-sm font-medium text-primary">Admin</p><h1 className="text-2xl font-bold">Sound library</h1><p className="text-muted-foreground">Add audio for creators to use in their posts.</p></header>
    <nav aria-label="Admin sections" className="border-b pb-3"><span aria-current="page" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2"><Music2 className="size-4" />Sounds</span></nav>
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Add sound</h2>
      <fieldset disabled={busy} className="grid min-w-0 gap-6 disabled:opacity-60 md:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <label className="flex min-h-40 flex-col justify-center gap-3 rounded-xl border-2 border-dashed p-4 text-center">
            <UploadCloud className="mx-auto size-8 text-primary" /><span>Select an audio file</span><span className="text-xs text-muted-foreground">MP3, M4A, Ogg or WAV · up to 20 MB · 1 second to 60 minutes</span>
            <input ref={inputRef} aria-label="Audio file" type="file" accept={soundMimeTypes.join(",")} onChange={event => selectFile(event.target.files?.[0] ?? null)} className="w-full min-w-0 text-sm file:mr-2 file:rounded file:border-0 file:bg-secondary file:p-2" />
          </label>
          {file && <p className="break-all text-xs text-muted-foreground">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
          {preview && <audio key={preview} src={preview} aria-label="Selected sound preview" controls preload="metadata" className="h-10 w-full" onPlay={event => { document.querySelectorAll("audio").forEach(audio => { if (audio !== event.currentTarget) audio.pause(); }); }} />}
          {reading ? <p role="status" className="text-sm">Reading audio duration...</p> : durationMs > 0 && <p className="text-sm">Duration: {(durationMs / 1000).toFixed(1)} seconds <span className="text-muted-foreground">(detected automatically)</span></p>}
        </div>
        <div className="min-w-0 space-y-4">
          <label className="block space-y-2 text-sm font-medium"><span>Title</span><input value={title} onChange={event => setTitle(event.target.value)} required maxLength={160} placeholder="Sound title" className="w-full rounded-lg border bg-background px-3 py-2" /></label>
          <label className="block space-y-2 text-sm font-medium"><span>Artist</span><input value={artist} onChange={event => setArtist(event.target.value)} required maxLength={160} placeholder="Artist or creator name" className="w-full rounded-lg border bg-background px-3 py-2" /></label>
          <p className="text-xs text-muted-foreground">New sounds become available immediately after upload. Add only audio you have permission to share.</p>
        </div>
      </fieldset>
      {busy && <div role="status"><progress value={progress} max={100} className="w-full accent-primary" /><p className="text-sm">{progress < 100 ? `Uploading: ${progress}%` : "Adding sound to library..."}</p></div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-green-400">{message}</p>}
      <button type="submit" disabled={!file || !durationMs || reading || busy} className="rounded-lg bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Uploading..." : uploadedId ? "Retry saving" : "Add sound"}</button>
    </form>
    <section className="space-y-4" aria-label="Sound library">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Library</h2><input aria-label="Search library" placeholder="Search title or artist" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 sm:w-64" /></div>
      {sounds.isPending && <p role="status">Loading sounds...</p>}
      {sounds.isError && <div role="alert"><p>Unable to load the sound library.</p><button onClick={() => void (sounds.isFetchNextPageError ? sounds.fetchNextPage() : sounds.refetch())} className="text-primary underline">Try again</button></div>}
      {sounds.data && !rows.length && <p className="rounded-xl border p-8 text-center text-muted-foreground">{term ? "No matching sounds." : "No sounds yet. Add your first track above."}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{rows.map(sound => <article key={sound.id} className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold" title={sound.title}>{sound.title}</h3><p className="truncate text-sm text-muted-foreground">{sound.artist}</p></div><span className="shrink-0 text-xs text-muted-foreground">{sound.isActive ? "Active" : "Inactive"}</span></div>
        <p className="text-xs text-muted-foreground">{(sound.durationMs / 1000).toFixed(1)} seconds</p><AudioPreview sound={sound} />
      </article>)}</div>
      {sounds.hasNextPage && <button disabled={sounds.isFetching} onClick={() => void sounds.fetchNextPage()} className="text-primary">{sounds.isFetchingNextPage ? "Loading..." : "Load more"}</button>}
    </section>
  </main>;
}
