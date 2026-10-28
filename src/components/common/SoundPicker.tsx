"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { PostSound, Sound, SoundPage } from "@/lib/sounds";

type Props = { value: PostSound | null; onChange: (value: PostSound | null) => void; mediaType: "video" | "image"; mediaDuration: number; disabled: boolean };

export default function SoundPicker({ value, onChange, mediaType, mediaDuration, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [preview, setPreview] = useState<Sound | null>(null);
  const [previewError, setPreviewError] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const query = useInfiniteQuery({
    queryKey: ["sounds", term],
    queryFn: ({ pageParam, signal }) => apiFetch<SoundPage>(`/sounds?q=${encodeURIComponent(term)}&offset=${pageParam}&limit=20`, { signal }),
    initialPageParam: 0,
    getNextPageParam: page => page.pagination.nextOffset ?? undefined,
    enabled: open,
  });
  const durationLimit = mediaType === "video" ? Math.floor(mediaDuration * 1000) : 30000;
  function select(sound: Sound) {
    onChange({ sound, soundId: sound.id, startMs: 0, durationMs: Math.min(sound.durationMs, durationLimit), musicVolume: 0.7, originalVolume: mediaType === "video" ? 1 : 0 });
    setOpen(false); setPreview(null);
  }
  const tracks = query.data?.pages.flatMap(page => page.data) ?? [];
  return <fieldset disabled={disabled} className="min-w-0 space-y-3 rounded-xl border p-3 disabled:opacity-60">
    <legend className="px-1 font-semibold">Sound</legend>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={disabled || durationLimit < 1000} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" onClick={() => { window.dispatchEvent(new CustomEvent("toptop-media-play")); setOpen(true); }}>{value ? "Change sound" : "Add sound"}</button>
      {value && <button type="button" className="text-sm text-primary" onClick={() => onChange(null)}>Remove sound</button>}
    </div>
    {mediaType === "video" && durationLimit < 1000 && <p className="text-xs text-muted-foreground">Load a video at least one second long to add sound.</p>}
    {value && <>
      <p className="wrap-anywhere text-sm font-semibold">{value.sound.title} <span className="font-normal text-muted-foreground">— {value.sound.artist}</span></p>
      <label className="block text-sm">Start: {(value.startMs / 1000).toFixed(1)}s
        <input aria-label="Sound start" type="range" min={0} max={Math.max(0, value.sound.durationMs - value.durationMs)} step={100} value={value.startMs} onChange={event => onChange({ ...value, startMs: Number(event.target.value) })} className="mt-2 w-full accent-primary" />
      </label>
      <label className="block text-sm">Duration: {(value.durationMs / 1000).toFixed(1)}s
        <input aria-label="Sound duration" type="range" min={1000} max={Math.min(durationLimit, value.sound.durationMs - value.startMs)} step={100} value={value.durationMs} onChange={event => onChange({ ...value, durationMs: Number(event.target.value) })} className="mt-2 w-full accent-primary" />
      </label>
      <label className="block text-sm">Music volume: {Math.round(value.musicVolume * 100)}%
        <input aria-label="Music volume" type="range" min={0} max={1} step={0.05} value={value.musicVolume} onChange={event => onChange({ ...value, musicVolume: Number(event.target.value) })} className="mt-2 w-full accent-primary" />
      </label>
      {mediaType === "video" && <label className="block text-sm">Original sound: {Math.round(value.originalVolume * 100)}%
        <input aria-label="Original sound volume" type="range" min={0} max={1} step={0.05} value={value.originalVolume} onChange={event => onChange({ ...value, originalVolume: Number(event.target.value) })} className="mt-2 w-full accent-primary" />
      </label>}
      <p className="text-xs text-muted-foreground">Press Play in the preview to hear the mix. {mediaType === "image" ? "The photo loops the selected segment (up to 30 seconds)." : "Music defaults to the full video length or the remaining track length, whichever is shorter."}</p>
    </>}
    <Dialog.Root open={open} onOpenChange={next => { setOpen(next); if (!next) setPreview(null); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-2xl border bg-background p-5">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-xl font-semibold">Add sound</Dialog.Title>
            <Dialog.Close className="rounded border px-3 py-1 text-sm">Close</Dialog.Close>
          </div>
          <Dialog.Description className="text-sm text-muted-foreground">Choose a track, then adjust its segment and volume.</Dialog.Description>
          <input aria-label="Search sounds" placeholder="Search by title or artist" maxLength={100} value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" />
          {preview && <div className="space-y-2">
            <p className="truncate text-sm">Preview: {preview.title}</p>
            <audio key={preview.id} src={preview.audioUrl} controls preload="metadata" onError={() => setPreviewError(true)} className="h-10 w-full" />
            {previewError && <p role="alert" className="text-sm text-destructive">Unable to load this sound. Try another track.</p>}
          </div>}
          <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain">
            {query.isPending && <p role="status">Loading sounds...</p>}
            {query.isError && <div role="alert"><p>Unable to load sounds.</p><button type="button" className="text-primary" onClick={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}>Try again</button></div>}
            {query.data && !tracks.length && <p className="py-6 text-center text-muted-foreground">{term ? "No sounds match your search." : "No sounds available yet."}</p>}
            {tracks.map(sound => <div key={sound.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{sound.title}</p><p className="truncate text-xs text-muted-foreground">{sound.artist} · {(sound.durationMs / 1000).toFixed(1)}s</p></div>
              <button type="button" aria-label={`Preview ${sound.title}`} className="text-sm" onClick={() => { setPreview(sound); setPreviewError(false); }}>Preview</button>
              <button type="button" aria-label={`Use ${sound.title}`} className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground" onClick={() => select(sound)}>Use</button>
            </div>)}
            {query.hasNextPage && <button type="button" disabled={query.isFetching} onClick={() => void query.fetchNextPage()} className="w-full py-2 text-primary">{query.isFetchingNextPage ? "Loading..." : "Load more"}</button>}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  </fieldset>;
}

