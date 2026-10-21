"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, VideoOff } from "lucide-react";
import type { VideoData } from "@/types/video.types";

type VideoCardProps = {
  video: VideoData;
};

const countFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

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
        // Có thể bị hủy khi con trỏ rời card trước lúc video kịp phát.
      });
    }
  }

  function stopPreview() {
    const player = videoRef.current;
    if (!player) return;
    player.pause();
    if (player.readyState >= 1) player.currentTime = 0;
  }

  return (
    <button
      type="button"
      aria-label={`Xem trước video: ${video.description}`}
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
          Không thể tải video
        </span>
      )}

      {video.isPinned && (
        <span className="absolute left-2 top-2 rounded bg-destructive px-2 py-0.5 text-xs font-semibold text-white">
          Đã ghim
        </span>
      )}

      <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="rounded-full bg-black/45 p-3">
          {isPlaying ? (
            <Pause className="size-6" aria-hidden="true" />
          ) : (
            <Play className="size-6" aria-hidden="true" />
          )}
        </span>
      </span>

      <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-sm font-semibold">
        <Play className="size-4 shrink-0" aria-hidden="true" />
        <span aria-label={`${video.viewCount} lượt xem`}>
          {countFormatter.format(video.viewCount)}
        </span>
      </span>
    </button>
  );
}
