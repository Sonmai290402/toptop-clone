"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, Pause, Play, VideoOff } from "lucide-react";
import type { VideoData } from "@/types/video.types";

export type VideoPreviewData = Omit<VideoData, "isPinned" | "viewCount"> & Partial<Pick<VideoData, "isPinned" | "viewCount">> & { mediaType: "video" | "image" };
type VideoCardProps = { video: VideoPreviewData };

// const countFormatter = new Intl.NumberFormat("en", {
//   notation: "compact",
//   maximumFractionDigits: 1,
// });

export default function VideoCard({ video }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const player = videoRef.current;
    return () => player?.pause();
  }, []);

  function playPreview() {
    const player = videoRef.current;
    if (player && !hasError) {
      void player.play().catch(() => {
        // Playback may be canceled when the pointer leaves the card.
      });
    }
  }

  function stopPreview() {
    const player = videoRef.current;
    if (!player) return;
    player.pause();
    if (player.readyState >= 1) player.currentTime = 0;
  }

  if (video.mediaType === "image") {
    return <article className="group relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
      {hasError ? <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center text-sm text-muted-foreground">
        <ImageOff className="size-6" aria-hidden="true" />
        Unable to load image
      </div> : <Image
        src={video.videoUrl}
        alt={video.description || "Photo post"}
        fill
        unoptimized
        sizes="(min-width: 1536px) 17vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        onError={() => setHasError(true)}
        className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
      />}
    </article>;
  }

  return (
    <button
      type="button"
      aria-label={`Preview video: ${video.description}`}
      aria-pressed={isPlaying}
      disabled={hasError}
      onClick={() => {
        if (videoRef.current?.paused) playPreview();
        else stopPreview();
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") playPreview();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") stopPreview();
      }}
      onBlur={stopPreview}
      className="group relative block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-lg bg-muted text-left text-white outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default"
    >
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.posterUrl}
        muted
        playsInline
        loop
        preload="metadata"
        aria-hidden="true"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setHasError(true)}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
      />

      {hasError && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted p-3 text-center text-sm text-muted-foreground">
          <VideoOff className="size-6" aria-hidden="true" />
          Unable to load video
        </span>
      )}

      {/* Pin metadata is not available for media posts yet.
      {video.isPinned && (
        <span className="absolute left-2 top-2 rounded bg-destructive px-2 py-0.5 text-xs font-semibold text-white">
          Pinned
        </span>
      )}
      */}

      <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="rounded-full bg-black/45 p-3">
          {isPlaying ? (
            <Pause className="size-6" aria-hidden="true" />
          ) : (
            <Play className="size-6" aria-hidden="true" />
          )}
        </span>
      </span>

      {/* View counts are not available for media posts yet.
      <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-sm font-semibold">
        <Play className="size-4 shrink-0" aria-hidden="true" />
        <span aria-label={`${video.viewCount} views`}>
          {countFormatter.format(video.viewCount)}
        </span>
      </span>
      */}
    </button>
  );
}
